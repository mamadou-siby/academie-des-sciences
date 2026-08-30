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
    "L'Académie des Sciences"
  ].filter(Boolean);

  const emailBody = lines.join('\n');

  // ---- Exemple d'intégration avec Resend (à décommenter une fois la clé API ajoutée) ----
  // const RESEND_API_KEY = process.env.RESEND_API_KEY;
  // if (RESEND_API_KEY) {
  //   await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${RESEND_API_KEY}`,
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       from: 'inscriptions@votredomaine.fr',
  //       to: commande.email_parent,
  //       subject: 'Confirmation de votre inscription — L’Académie des Sciences',
  //       text: emailBody
  //     })
  //   });
  //   return;
  // }

  console.log('[email non envoyé — fournisseur non configuré] Destinataire :', commande.email_parent);
  console.log(emailBody);
}

module.exports = { sendConfirmationEmail };
