// Envoie l'email de confirmation de paiement au parent.
//
// ⚠️ CETTE FONCTION NE ENVOIE PAS ENCORE D'EMAIL RÉEL. Elle est appelée
// automatiquement par stripe-webhook.js une fois qu'un paiement est
// confirmé, mais nécessite qu'un fournisseur d'emailing transactionnel
// soit branché (aucune donnée bancaire n'étant en jeu ici, ce n'est pas
// un sujet de sécurité, seulement de configuration) :
//
//   1. Créer un compte sur un service comme Resend (resend.com),
//      Postmark ou Brevo — tous ont un plan gratuit suffisant pour
//      démarrer.
//   2. Ajouter la clé API du service en variable d'environnement
//      Netlify (ex: RESEND_API_KEY).
//   3. Décommenter et adapter le bloc d'envoi ci-dessous.
//
// En attendant, la fonction se contente de journaliser l'intention
// d'envoi (visible dans les logs Netlify), pour ne rien bloquer côté
// paiement : un échec d'email ne doit jamais faire échouer la
// confirmation du paiement lui-même.

async function sendConfirmationEmail(supabase, commandeId) {
  const { data: commande, error } = await supabase
    .from('commandes')
    .select('*')
    .eq('id', commandeId)
    .single();
  if (error || !commande) {
    console.error('Commande introuvable pour envoi email :', commandeId);
    return;
  }

  const isAbonnement = commande.type_offre === 'abonnement';

  const lines = [
    `Bonjour ${commande.prenom_parent},`,
    '',
    'Votre paiement a bien été enregistré. Voici le récapitulatif :',
    `- Formule : ${commande.formule_label}`,
    `- Élève : ${commande.prenom_eleve} ${commande.nom_eleve}`,
    isAbonnement
      ? `- Montant payé aujourd'hui : ${commande.montant_acompte} € (acompte) + ${commande.prix_total} € (première mensualité)`
      : `- Montant payé : ${commande.prix_total} €`,
    isAbonnement ? `- Ensuite : ${commande.prix_total} €/mois, pendant ${commande.cycles_prevus} mois au total, sans renouvellement automatique au-delà.` : '',
    !isAbonnement ? `- Les cours sont organisés en pack de 7 semaines (pas de vente à l'heure ni à la séance).` : '',
    '',
    'Notre équipe revient vers vous prochainement pour finaliser les créneaux.',
    '',
    "Aven & Co — L'Académie des Sciences"
  ].filter(Boolean);

  const emailBody = lines.join('\n');

  // Adresse d'expéditeur : domaine aven-co.com vérifié dans Resend.
  const FROM_ADDRESS = 'Aven & Co <inscriptions@aven-co.com>';

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('[email non envoyé — RESEND_API_KEY manquante] Destinataire :', commande.email_parent);
    console.log(emailBody);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: commande.email_parent,
        subject: 'Confirmation de votre inscription — Aven & Co',
        text: emailBody
      })
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Échec de l’envoi Resend :', res.status, detail);
    }
  } catch (err) {
    // Un échec d'email ne doit jamais faire échouer la confirmation du
    // paiement lui-même : on journalise seulement.
    console.error('Erreur lors de l’envoi de l’email de confirmation :', err.message);
  }
}

module.exports = { sendConfirmationEmail };
