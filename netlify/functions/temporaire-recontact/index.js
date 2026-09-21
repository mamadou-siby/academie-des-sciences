// ============================================================================
// FONCTION TEMPORAIRE — mode « à recontacter »          POST /api/temporaire-recontact
//
// Reçoit une demande d'atelier découverte / de cours d'essai SANS date ni
// créneau (formulaire temporaire : temporaire/inscription-temporaire.html).
// Enregistre la demande (date_id vide, a_recontacter = true) et envoie :
//   - un e-mail d'alerte à contact@aven-co.com (variable CONTACT_EMAIL),
//   - un accusé de réception au parent.
//
// La réservation normale (avec dates et créneaux) reste dans
// netlify/functions/inscriptions.js. Voir temporaire/LISEZ-MOI.md.
// ============================================================================
const { getClient, cors } = require('../_supabase');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/[\s.\-()]/g, '');
  return /^(\+33|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
}

const REQUIRED_RECONTACT = [
  'lieu_id', 'prenom_eleve', 'nom_eleve', 'age_eleve',
  'nom_prenom_parent', 'email_parent', 'telephone_parent'
];

// MODE TEMPORAIRE « À RECONTACTER » (payload.mode === 'recontact') :
// pas de date ni de créneau ; la demande est enregistrée avec a_recontacter = true
// et un e-mail d'alerte part vers contact@aven-co.com. Voir README-inscription.md.
async function handleRecontact(supabase, payload) {
  const bad = (msg) => ({ statusCode: 400, headers: cors, body: JSON.stringify({ error: msg }) });
  for (const field of REQUIRED_RECONTACT) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return bad(`Le champ « ${field} » est obligatoire.`);
    }
  }
  if (!payload.niveau_id && !payload.niveau_libre) return bad('Le champ « niveau » est obligatoire.');
  if (!isValidEmail(payload.email_parent)) return bad('Adresse email invalide.');
  if (!isValidPhone(payload.telephone_parent)) return bad('Numéro de téléphone invalide.');

  const academie = payload.academie === 'langues' ? 'langues' : 'sciences';
  const lieuRes = await supabase.from('lieux').select('*').eq('id', payload.lieu_id).eq('actif', true).maybeSingle();
  if (!lieuRes.data) return bad('Ce lieu n’est plus disponible.');

  let niveauNom = String(payload.niveau_libre || '').trim().slice(0, 80);
  let niveauId = null;
  if (payload.niveau_id) {
    const niveauRes = await supabase.from('niveaux').select('*').eq('id', payload.niveau_id).eq('actif', true).maybeSingle();
    if (!niveauRes.data) return bad('Ce niveau n’est plus disponible.');
    niveauNom = niveauRes.data.nom;
    niveauId = niveauRes.data.id;
  }

  const base = {
    lieu_id: payload.lieu_id,
    niveau_id: niveauId,
    date_id: null,
    creneau_id: null,
    prenom_eleve: payload.prenom_eleve,
    nom_eleve: payload.nom_eleve,
    age_eleve: String(payload.age_eleve),
    nom_prenom_parent: payload.nom_prenom_parent,
    email_parent: payload.email_parent,
    telephone_parent: payload.telephone_parent,
    code_suivi: payload.code_suivi || null,
    statut: 'Nouvelle'
  };
  const extended = Object.assign({}, base, {
    academie: academie,
    a_recontacter: true,
    niveau_libre: niveauId ? null : niveauNom
  });

  let saved = null;
  let dbError = null;
  let res = await supabase.from('inscriptions').insert(extended).select().single();
  if (res.error && /academie|a_recontacter|niveau_libre/i.test(res.error.message || '')) {
    // La migration supabase-migration-recontact.sql n'est pas encore exécutée :
    // on enregistre quand même la demande (sans les colonnes de classement).
    console.error('Colonnes de recontact absentes — exécutez supabase-migration-recontact.sql :', res.error.message);
    res = await supabase.from('inscriptions').insert(base).select().single();
  }
  if (res.error) { dbError = res.error.message; console.error('Enregistrement de la demande échoué :', dbError); }
  else saved = res.data;

  const { sendRecontactEmails } = require('./emails');
  const mail = await sendRecontactEmails({
    academie: academie,
    lieu: lieuRes.data.nom,
    niveau: niveauNom,
    prenom_eleve: payload.prenom_eleve,
    nom_eleve: payload.nom_eleve,
    age_eleve: String(payload.age_eleve),
    nom_prenom_parent: payload.nom_prenom_parent,
    email_parent: payload.email_parent,
    telephone_parent: payload.telephone_parent,
    code_suivi: payload.code_suivi || null,
    saved: !!saved,
    dbError: dbError
  });

  // Rien n'est perdu tant que la demande est en base OU que l'alerte est partie.
  if (!saved && !mail.adminSent) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Votre demande n’a pas pu être enregistrée pour le moment. Merci de nous écrire à contact@aven-co.com.' })
    };
  }
  return {
    statusCode: 201,
    headers: cors,
    body: JSON.stringify({
      id: saved ? saved.id : null,
      recontact: true,
      academie: academie,
      lieu: lieuRes.data.nom,
      niveau: niveauNom,
      eleve: `${payload.prenom_eleve} ${payload.nom_eleve}`,
      parent: payload.nom_prenom_parent
    })
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  }
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    return await handleRecontact(getClient(), payload);
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
