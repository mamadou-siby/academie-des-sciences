// Envoie l'email de confirmation d'inscription à l'atelier découverte
// gratuit. Appelée par inscriptions.js juste après l'enregistrement en
// base. Un échec d'envoi ne doit jamais faire échouer l'inscription
// elle-même : les erreurs sont journalisées, pas remontées à l'appelant.

function formatDateFr(iso) {
  try {
    const d = new Date(iso + 'T00:00:00');
    const text = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch (e) {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

async function sendInscriptionEmail(details) {
  // details : { email_parent, nom_prenom_parent, prenom_eleve, nom_eleve, lieu, niveau, date, creneau }
  const lines = [];
  lines.push(`Bonjour ${details.nom_prenom_parent},`);
  lines.push('');
  // Les niveaux de l'École d'Anglais commencent par « Anglais » (voir README-inscription.md).
  const isEnglish = /^\s*anglais/i.test(details.niveau || '');
  lines.push(isEnglish
    ? 'Votre inscription au cours d’essai d’anglais (Académie des Langues) est confirmée. Voici le récapitulatif :'
    : 'Votre inscription à l’atelier découverte gratuit est confirmée. Voici le récapitulatif :');
  lines.push('');
  lines.push(`- Lieu : ${details.lieu}`);
  lines.push(`- Niveau : ${details.niveau}`);
  lines.push(`- Date : ${formatDateFr(details.date)}`);
  lines.push(`- Créneau : ${details.creneau}`);
  lines.push(`- Élève : ${details.prenom_eleve} ${details.nom_eleve}`);
  lines.push('');
  lines.push('Nous vous attendons avec plaisir !');
  lines.push('');
  lines.push("Aven & Co — L'Académie");

  const emailBody = lines.join('\n');
  const emailHtml =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#16181D;max-width:540px">' +
    lines.map(function (l) {
      return l === '' ? '<div style="height:14px"></div>' : '<div>' + escapeHtml(l) + '</div>';
    }).join('') +
    '</div>';

  const FROM_ADDRESS = 'Aven & Co <inscriptions@aven-co.com>';
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('[email non envoyé — RESEND_API_KEY manquante] Destinataire :', details.email_parent);
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
        to: details.email_parent,
        subject: 'Votre créneau est confirmé — Aven & Co',
        text: emailBody,
        html: emailHtml
      })
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Échec de l’envoi Resend (inscription) :', res.status, detail);
    }
  } catch (err) {
    console.error('Erreur lors de l’envoi de l’email d’inscription :', err.message);
  }
}

module.exports = { sendInscriptionEmail };
