const Stripe = require('stripe');
const { getClient } = require('./_supabase');

// Endpoint appelé directement par Stripe (jamais par le navigateur du
// parent). C'est la SEULE source de vérité pour confirmer un paiement :
// la page /inscription-confirmee.html n'affiche jamais "payé" simplement
// parce que l'utilisateur y arrive — elle interroge la base, mise à jour
// uniquement par ce webhook.
//
// Configuration Netlify requise :
//   - Cette fonction doit être déclarée dans Stripe Dashboard comme
//     endpoint : https://votre-site.netlify.app/api/stripe-webhook
//   - Variable d'environnement STRIPE_WEBHOOK_SECRET (whsec_...)
//   - Variable d'environnement STRIPE_SECRET_KEY (sk_...)
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée.' };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error('STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant.');
    return { statusCode: 500, body: 'Configuration serveur incomplète.' };
  }

  const stripe = Stripe(stripeKey);
  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

  let stripeEvent;
  try {
    // Vérification obligatoire de la signature : sans elle, n'importe qui
    // pourrait forger une fausse confirmation de paiement.
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Signature webhook invalide :', err.message);
    return { statusCode: 400, body: `Signature invalide : ${err.message}` };
  }

  const supabase = getClient();

  try {
    // Idempotence : ignorer un événement déjà traité (Stripe peut renvoyer
    // le même événement plusieurs fois).
    const { data: already } = await supabase
      .from('stripe_events_log')
      .select('id')
      .eq('id', stripeEvent.id)
      .maybeSingle();
    if (already) {
      return { statusCode: 200, body: JSON.stringify({ received: true, deduped: true }) };
    }

    let commandeId = null;

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        commandeId = session.metadata && session.metadata.commande_id;
        if (commandeId) {
          let dateFinPrevue = null;

          // Pour un abonnement (10 mensualités puis arrêt automatique) :
          // le paramètre cancel_at n'est accepté que sur un abonnement déjà
          // créé, pas à la création de la session Checkout. On l'applique
          // donc ici, juste après la confirmation du premier paiement.
          if (session.mode === 'subscription' && session.subscription) {
            const cancelAtTimestamp = Math.floor(Date.now() / 1000) + 10 * 30 * 24 * 60 * 60; // ≈ 10 mois
            try {
              await stripe.subscriptions.update(session.subscription, { cancel_at: cancelAtTimestamp });
              dateFinPrevue = new Date(cancelAtTimestamp * 1000).toISOString();
            } catch (subErr) {
              console.error('Échec de la programmation de l’arrêt automatique de l’abonnement :', subErr.message);
            }
          }

          await supabase
            .from('commandes')
            .update({
              statut_paiement: 'paye',
              statut_inscription: 'a_planifier',
              stripe_customer_id: session.customer || null,
              stripe_subscription_id: session.subscription || null,
              stripe_payment_intent_id: session.payment_intent || null,
              date_paiement: new Date().toISOString(),
              cycles_payes: session.mode === 'subscription' ? 1 : 0,
              date_fin_prevue: dateFinPrevue
            })
            .eq('id', commandeId);

          // Envoi de l'email de confirmation — voir send-confirmation-email.js
          // (nécessite un fournisseur d'emailing configuré, voir son en-tête).
          try {
            const { sendConfirmationEmail } = require('./_send-confirmation-email');
            await sendConfirmationEmail(supabase, commandeId);
          } catch (mailErr) {
            console.error('Envoi email de confirmation échoué :', mailErr.message);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Mensualité d'un abonnement payée avec succès (hors tout premier
        // paiement déjà traité par checkout.session.completed).
        const invoice = stripeEvent.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
          const { data: cmd } = await supabase
            .from('commandes')
            .select('id, cycles_payes')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          if (cmd) {
            commandeId = cmd.id;
            await supabase
              .from('commandes')
              .update({ cycles_payes: (cmd.cycles_payes || 0) + 1 })
              .eq('id', cmd.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const { data: cmd } = await supabase
            .from('commandes')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          if (cmd) {
            commandeId = cmd.id;
            await supabase.from('commandes').update({ statut_paiement: 'echoue' }).eq('id', cmd.id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Fin normale après les 10 mensualités (cancel_at) ou résiliation.
        const subscription = stripeEvent.data.object;
        const { data: cmd } = await supabase
          .from('commandes')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        if (cmd) {
          commandeId = cmd.id;
          await supabase.from('commandes').update({ statut_inscription: 'terminee' }).eq('id', cmd.id);
        }
        break;
      }

      default:
        // Événement non géré explicitement : on l'enregistre pour la
        // traçabilité mais aucune action n'est nécessaire.
        break;
    }

    await supabase.from('stripe_events_log').insert({
      id: stripeEvent.id,
      type: stripeEvent.type,
      commande_id: commandeId
    });

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Erreur de traitement du webhook Stripe :', err);
    // On renvoie 500 pour que Stripe retente l'envoi de l'événement plus tard.
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
