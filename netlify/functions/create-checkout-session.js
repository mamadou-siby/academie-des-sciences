const Stripe = require('stripe');
const { getClient, cors } = require('./_supabase');
const { getOffer, getPriceId, getAcomptePriceId } = require('./_offers-config');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}
function isValidPhone(phone) {
  const digits = String(phone || '').replace(/[\s.\-()]/g, '');
  return /^(\+33|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
}

// POST /api/create-checkout-session
// Body attendu :
// {
//   code_offre: "PACK_PRIMAIRE_3H" | ... | "ABONNEMENT_75" | "ABONNEMENT_90" | "ABONNEMENT_ANGLAIS_75" | "ABONNEMENT_ANGLAIS_90",
//   eleve: { prenom, nom, classe, etablissement, matieres, objectif, difficultes, echeance, niveau },
//   parent: { prenom, nom, email, telephone, adresse_facturation }
// }
//
// Le frontend ne transmet JAMAIS de prix : seul `code_offre` est envoyé,
// le serveur détermine seul le Price ID Stripe et le montant réel.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY manquante dans les variables d’environnement Netlify.');
    const stripe = Stripe(stripeKey);

    const payload = event.body ? JSON.parse(event.body) : {};
    const { code_offre, eleve = {}, parent = {} } = payload;

    // 1. Valider l'offre demandée contre la configuration serveur (jamais le frontend)
    const offer = getOffer(code_offre);
    if (!offer) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Offre inconnue.' }) };
    }

    // 2. Valider les champs obligatoires
    const requiredEleve = ['prenom', 'nom'];
    const requiredParent = ['prenom', 'nom', 'email', 'telephone'];
    for (const f of requiredEleve) {
      if (!eleve[f]) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Champ élève manquant : ${f}` }) };
    }
    for (const f of requiredParent) {
      if (!parent[f]) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Champ parent manquant : ${f}` }) };
    }
    if (offer.typeOffre === 'pack_7_semaines' && !eleve.niveau) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Le niveau de l’élève est obligatoire pour un pack.' }) };
    }
    if (!isValidEmail(parent.email)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Adresse email invalide.' }) };
    }
    if (!isValidPhone(parent.telephone)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Numéro de téléphone invalide.' }) };
    }

    const supabase = getClient();

    // 3. Créer la commande en base, statut "en_attente", AVANT d'aller sur Stripe
    const commandeRow = {
      type_offre: offer.typeOffre,
      code_offre,
      formule_label: offer.label,
      niveau: eleve.niveau || null,
      cycle_scolaire: offer.cycleScolaire || null,
      heures_semaine: offer.heuresSemaine || null,
      volume_heures: offer.volumeHeures || null,
      tarif_horaire: offer.tarifHoraire || null,
      prix_total: offer.montantAffiche,
      montant_acompte: offer.montantAcompte || null,
      prenom_eleve: eleve.prenom,
      nom_eleve: eleve.nom,
      classe: eleve.classe || null,
      etablissement: eleve.etablissement || null,
      matieres: eleve.matieres || null,
      objectif: eleve.objectif || null,
      difficultes: eleve.difficultes || null,
      echeance: eleve.echeance || null,
      prenom_parent: parent.prenom,
      nom_parent: parent.nom,
      email_parent: parent.email,
      telephone_parent: parent.telephone,
      adresse_facturation: parent.adresse_facturation || null,
      statut_paiement: 'en_attente',
      statut_inscription: 'a_planifier',
      cycles_prevus: offer.cyclesPrevus || null
    };

    const { data: commande, error: insertError } = await supabase
      .from('commandes')
      .insert(commandeRow)
      .select()
      .single();
    if (insertError) throw insertError;

    // 4. Construire la session Stripe Checkout à partir du Price ID serveur
    const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;
    const priceId = getPriceId(offer);

    const lineItems = [{ price: priceId, quantity: 1 }];

    const sessionParams = {
      mode: offer.mode,
      line_items: lineItems,
      customer_email: parent.email,
      success_url: `${siteUrl}/inscription-confirmee.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/commande.html?annule=1`,
      metadata: {
        commande_id: String(commande.id),
        code_offre,
        type_offre: offer.typeOffre,
        nom_eleve: `${eleve.prenom} ${eleve.nom}`,
        niveau: eleve.niveau || '',
        cycle_scolaire: offer.cycleScolaire || '',
        objectif: eleve.objectif || ''
      }
    };

    if (offer.typeOffre === 'pack_7_semaines') {
      sessionParams.payment_intent_data = { metadata: sessionParams.metadata };
    }

    if (offer.typeOffre === 'abonnement') {
      // Acompte initial : ajouté comme second line item (prix unique), facturé
      // avec la première mensualité lors de la création de l'abonnement.
      const acomptePriceId = getAcomptePriceId(offer);
      if (acomptePriceId) {
        lineItems.push({ price: acomptePriceId, quantity: 1 });
      }

      // Remarque : l'arrêt automatique après 10 mensualités (cancel_at)
      // n'est pas un paramètre accepté à la création d'une session Checkout
      // — Stripe ne l'autorise que sur un abonnement déjà créé. Cette étape
      // est donc appliquée juste après, dans stripe-webhook.js, une fois
      // l'abonnement effectivement créé (événement checkout.session.completed).
      sessionParams.subscription_data = {
        metadata: sessionParams.metadata
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // 5. Mémoriser l'ID de session avant de rediriger le parent vers Stripe
    await supabase.from('commandes').update({ stripe_checkout_session_id: session.id }).eq('id', commande.id);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
