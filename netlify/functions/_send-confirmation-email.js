// Envoie l'email de confirmation de paiement au parent, avec la facture
// PDF en pièce jointe. Appelée automatiquement par stripe-webhook.js une
// fois qu'un paiement est confirmé.
//
// Un échec d'email (ou de génération de facture) ne doit jamais faire
// échouer la confirmation du paiement lui-même : les erreurs sont
// journalisées, pas remontées à l'appelant.

const { generateInvoicePdf } = require('./_generate-invoice');

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

  // Attribution du numéro de facture (séquentiel, atomique côté base —
  // voir supabase-migration-facturation.sql) puis génération du PDF.
  // Si l'un des deux échoue, l'email part quand même, sans pièce jointe :
  // mieux vaut confirmer le paiement sans facture que ne rien envoyer.
  let numeroFacture = commande.numero_facture;
  let invoiceBuffer = null;
  try {
    if (!numeroFacture) {
      const { data: n, error: rpcErr } = await supabase.rpc('next_numero_facture');
      if (rpcErr) throw rpcErr;
      numeroFacture = n;
      await supabase.from('commandes').update({ numero_facture: numeroFacture }).eq('id', commandeId);
    }
    invoiceBuffer = await generateInvoicePdf(commande, numeroFacture);
  } catch (invoiceErr) {
    console.error('Génération de la facture échouée :', invoiceErr.message);
  }

  const lines = [];
  lines.push(`Bonjour ${commande.prenom_parent},`);
  lines.push('');
  lines.push('Votre paiement a bien été enregistré. Voici le récapitulatif :');
  lines.push('');
  lines.push(`- Formule : ${commande.formule_label}`);
  lines.push(`- Élève : ${commande.prenom_eleve} ${commande.nom_eleve}`);
  if (isAbonnement) {
    lines.push(`- Montant payé aujourd'hui : ${commande.montant_acompte} € (acompte) + ${commande.prix_total} € (première mensualité)`);
    lines.push(`- Ensuite : ${commande.prix_total} €/mois, pendant ${commande.cycles_prevus} mois au total, sans renouvellement automatique au-delà.`);
  } else {
    lines.push(`- Montant payé : ${commande.prix_total} €`);
    lines.push(`- Les cours sont organisés en pack de 7 semaines (pas de vente à l'heure ni à la séance).`);
  }
  lines.push('');
  lines.push(invoiceBuffer ? 'Vous trouverez votre facture en pièce jointe.' : 'Votre facture vous sera transmise séparément.');
  lines.push('');
  lines.push('Notre équipe revient vers vous prochainement pour finaliser les créneaux.');
  lines.push('');
  lines.push("Aven & Co — L'Académie des Sciences");

  const emailBody = lines.join('\n');

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Version HTML en plus du texte brut : garantit l'espacement entre les
  // lignes quel que soit le client mail (certains écrasent les simples
  // retours à la ligne d'un email en texte brut).
  const emailHtml =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#16181D;max-width:540px">' +
    lines.map(function (l) {
      return l === '' ? '<div style="height:14px"></div>' : '<div>' + escapeHtml(l) + '</div>';
    }).join('') +
    '</div>';

  // Adresse d'expéditeur : domaine aven-co.com vérifié dans Resend.
  const FROM_ADDRESS = 'Aven & Co <inscriptions@aven-co.com>';

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('[email non envoyé — RESEND_API_KEY manquante] Destinataire :', commande.email_parent);
    console.log(emailBody);
    return;
  }

  const payload = {
    from: FROM_ADDRESS,
    to: commande.email_parent,
    subject: 'Confirmation de votre inscription — Aven & Co',
    text: emailBody,
    html: emailHtml
  };

  if (invoiceBuffer) {
    payload.attachments = [{
      filename: `${numeroFacture}.pdf`,
      content: invoiceBuffer.toString('base64')
    }];
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
