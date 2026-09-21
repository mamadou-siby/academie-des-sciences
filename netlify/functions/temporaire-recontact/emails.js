// ============================================================================
// E-MAILS TEMPORAIRES — mode « à recontacter »
// Utilisés uniquement par netlify/functions/temporaire-recontact/index.js.
// (Les e-mails de la réservation normale sont dans ../_send-inscription-email.js.)
// ============================================================================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ---------------------------------------------------------------------------
// MODE TEMPORAIRE « À RECONTACTER »
// Demande enregistrée sans date ni créneau : on prévient le parent que nous le
// recontactons, et on alerte l'équipe (contact@aven-co.com par défaut, ou la
// variable d'environnement CONTACT_EMAIL).
// ---------------------------------------------------------------------------
const FROM_ADDRESS_RECONTACT = 'Aven & Co <inscriptions@aven-co.com>';

async function sendViaResend({ to, subject, lines, replyTo }) {
  const body = lines.join('\n');
  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#16181D;max-width:560px">' +
    lines.map(function (l) {
      return l === '' ? '<div style="height:14px"></div>' : '<div>' + escapeHtml(l) + '</div>';
    }).join('') +
    '</div>';
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('[email non envoyé — RESEND_API_KEY manquante] Destinataire :', to, '| Objet :', subject);
    console.log(body);
    return false;
  }
  try {
    const payload = { from: FROM_ADDRESS_RECONTACT, to: to, subject: subject, text: body, html: html };
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('Échec de l’envoi Resend (à recontacter) :', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erreur lors de l’envoi d’un email (à recontacter) :', err.message);
    return false;
  }
}

async function sendRecontactEmails(d) {
  // d : { academie, lieu, niveau, prenom_eleve, nom_eleve, age_eleve, nom_prenom_parent,
  //       email_parent, telephone_parent, code_suivi, saved, dbError }
  const academieLabel = d.academie === 'langues' ? 'Académie des Langues (anglais)' : 'Académie des Sciences';
  const offre = d.academie === 'langues' ? 'au cours d’essai d’anglais' : 'à l’atelier découverte';
  const created = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

  // 1) Alerte à l'équipe
  const admin = [];
  admin.push('Un parent attend d’être recontacté pour fixer la date et le créneau.');
  admin.push('');
  admin.push('Académie : ' + academieLabel);
  admin.push('Parent : ' + d.nom_prenom_parent);
  admin.push('Téléphone : ' + d.telephone_parent);
  admin.push('E-mail : ' + d.email_parent);
  admin.push('Élève : ' + d.prenom_eleve + ' ' + d.nom_eleve + ' (' + d.age_eleve + ' ans)');
  admin.push('Lieu : ' + d.lieu);
  admin.push('Niveau : ' + d.niveau);
  if (d.code_suivi) admin.push('Code de suivi : ' + d.code_suivi);
  admin.push('Demande reçue le : ' + created);
  admin.push('');
  admin.push('À faire : rappeler ce parent (ou répondre à cet e-mail) pour fixer la date et le créneau.');
  if (process.env.SITE_URL) admin.push('Espace admin : ' + process.env.SITE_URL.replace(/\/$/, '') + '/admin.html');
  if (!d.saved) {
    admin.push('');
    admin.push('⚠️ Cette demande n’a PAS pu être enregistrée dans l’admin (' + (d.dbError || 'erreur base de données') + '). Notez-la depuis cet e-mail.');
  }
  const adminSent = await sendViaResend({
    to: process.env.CONTACT_EMAIL || 'contact@aven-co.com',
    subject: 'Parent à recontacter — ' + academieLabel + ' — ' + d.prenom_eleve + ' ' + d.nom_eleve,
    lines: admin,
    replyTo: d.email_parent
  });

  // 2) Accusé de réception au parent
  const parent = [];
  parent.push('Bonjour ' + d.nom_prenom_parent + ',');
  parent.push('');
  parent.push('Nous avons bien reçu votre demande d’inscription ' + offre + '.');
  parent.push('Nous vous recontacterons très prochainement pour fixer avec vous la date et le créneau.');
  parent.push('');
  parent.push('- Lieu : ' + d.lieu);
  parent.push('- Niveau : ' + d.niveau);
  parent.push('- Élève : ' + d.prenom_eleve + ' ' + d.nom_eleve);
  parent.push('');
  parent.push('À très vite !');
  parent.push('');
  parent.push("Aven & Co — L'Académie");
  const parentSent = await sendViaResend({
    to: d.email_parent,
    subject: 'Votre demande est bien reçue — Aven & Co',
    lines: parent
  });

  return { adminSent: adminSent, parentSent: parentSent };
}

module.exports = { sendRecontactEmails };
