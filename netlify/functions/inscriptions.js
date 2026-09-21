const { getClient, checkAdmin, cors } = require('./_supabase');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/[\s.\-()]/g, '');
  // Accepte les formats français (avec ou sans indicatif) ainsi que les
  // numéros internationaux courants, sans être excessivement restrictif.
  return /^(\+33|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
}

const REQUIRED_FIELDS = [
  'lieu_id', 'niveau_id', 'date_id', 'creneau_id',
  'prenom_eleve', 'nom_eleve', 'age_eleve',
  'nom_prenom_parent', 'email_parent', 'telephone_parent'
];

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

  const { sendRecontactEmails } = require('./_send-inscription-email');
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

// POST /api/inscriptions        -> enregistre une demande (public)
// GET  /api/inscriptions        -> liste + filtres (admin uniquement)
// PATCH /api/inscriptions       -> met à jour le statut (admin) { id, statut }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const supabase = getClient();

    if (event.httpMethod === 'POST') {
      const payload = event.body ? JSON.parse(event.body) : {};

      if (payload.mode === 'recontact') return await handleRecontact(supabase, payload);

      for (const field of REQUIRED_FIELDS) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Le champ « ${field} » est obligatoire.` }) };
        }
      }
      if (!isValidEmail(payload.email_parent)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Adresse email invalide.' }) };
      }
      if (!isValidPhone(payload.telephone_parent)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Numéro de téléphone invalide.' }) };
      }

      // Vérifie que le lieu, le niveau, la date et le créneau sont toujours actifs.
      const [lieuRes, niveauRes, dateRes, creneauRes] = await Promise.all([
        supabase.from('lieux').select('*').eq('id', payload.lieu_id).eq('actif', true).maybeSingle(),
        supabase.from('niveaux').select('*').eq('id', payload.niveau_id).eq('actif', true).maybeSingle(),
        supabase.from('dates_disponibles').select('*').eq('id', payload.date_id).eq('actif', true).maybeSingle(),
        supabase.from('creneaux').select('*').eq('id', payload.creneau_id).eq('actif', true).maybeSingle()
      ]);
      if (!lieuRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce lieu n’est plus disponible.' }) };
      if (!niveauRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce niveau n’est plus disponible.' }) };
      if (!dateRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Cette date n’est plus disponible.' }) };
      if (!creneauRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce créneau n’est plus disponible.' }) };
      // Le créneau doit être valable pour toutes les dates (date_id NULL) ou
      // précisément pour la date choisie — jamais pour une autre date.
      if (creneauRes.data.date_id !== null && String(creneauRes.data.date_id) !== String(payload.date_id)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce créneau n’est pas disponible à la date choisie.' }) };
      }

      const { data, error } = await supabase
        .from('inscriptions')
        .insert({
          lieu_id: payload.lieu_id,
          niveau_id: payload.niveau_id,
          date_id: payload.date_id,
          creneau_id: payload.creneau_id,
          prenom_eleve: payload.prenom_eleve,
          nom_eleve: payload.nom_eleve,
          age_eleve: String(payload.age_eleve),
          nom_prenom_parent: payload.nom_prenom_parent,
          email_parent: payload.email_parent,
          telephone_parent: payload.telephone_parent,
          code_suivi: payload.code_suivi || null,
          statut: 'Nouvelle'
        })
        .select()
        .single();
      if (error) throw error;

      // Envoi de l'email de confirmation — voir _send-inscription-email.js
      // (nécessite un fournisseur d'emailing configuré, voir son en-tête).
      try {
        const { sendInscriptionEmail } = require('./_send-inscription-email');
        await sendInscriptionEmail({
          email_parent: payload.email_parent,
          nom_prenom_parent: payload.nom_prenom_parent,
          prenom_eleve: payload.prenom_eleve,
          nom_eleve: payload.nom_eleve,
          lieu: lieuRes.data.nom,
          niveau: niveauRes.data.nom,
          date: dateRes.data.date,
          creneau: creneauRes.data.nom
        });
      } catch (mailErr) {
        console.error('Envoi email d’inscription échoué :', mailErr.message);
      }

      return {
        statusCode: 201,
        headers: cors,
        body: JSON.stringify({
          id: data.id,
          lieu: lieuRes.data.nom,
          niveau: niveauRes.data.nom,
          date: dateRes.data.date,
          creneau: creneauRes.data.nom,
          eleve: `${payload.prenom_eleve} ${payload.nom_eleve}`,
          parent: payload.nom_prenom_parent
        })
      };
    }

    if (!checkAdmin(event)) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Non autorisé.' }) };
    }

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      let query = supabase
        .from('inscriptions')
        .select('*, lieux(nom), niveaux(nom), dates_disponibles(date), creneaux(nom)')
        .order('date_creation', { ascending: false });

      if (params.statut) query = query.eq('statut', params.statut);
      if (params.lieu_id) query = query.eq('lieu_id', params.lieu_id);
      if (params.niveau_id) query = query.eq('niveau_id', params.niveau_id);
      if (params.date_id) query = query.eq('date_id', params.date_id);
      // Demandes en attente d'être recontactées (aucune date choisie)
      if (params.a_recontacter) query = query.is('date_id', null);

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PATCH') {
      const { id, statut } = event.body ? JSON.parse(event.body) : {};
      const { data, error } = await supabase.from('inscriptions').update({ statut }).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
