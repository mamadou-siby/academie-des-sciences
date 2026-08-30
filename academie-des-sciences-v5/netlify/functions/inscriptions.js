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
  'lieu_id', 'niveau_id', 'date_id',
  'prenom_eleve', 'nom_eleve', 'age_eleve',
  'nom_prenom_parent', 'email_parent', 'telephone_parent'
];

// POST /api/inscriptions        -> enregistre une demande (public)
// GET  /api/inscriptions        -> liste + filtres (admin uniquement)
// PATCH /api/inscriptions       -> met à jour le statut (admin) { id, statut }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const supabase = getClient();

    if (event.httpMethod === 'POST') {
      const payload = event.body ? JSON.parse(event.body) : {};

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

      // Vérifie que le lieu, le niveau et la date sont toujours actifs.
      const [lieuRes, niveauRes, dateRes] = await Promise.all([
        supabase.from('lieux').select('*').eq('id', payload.lieu_id).eq('actif', true).maybeSingle(),
        supabase.from('niveaux').select('*').eq('id', payload.niveau_id).eq('actif', true).maybeSingle(),
        supabase.from('dates_disponibles').select('*').eq('id', payload.date_id).eq('actif', true).maybeSingle()
      ]);
      if (!lieuRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce lieu n’est plus disponible.' }) };
      if (!niveauRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Ce niveau n’est plus disponible.' }) };
      if (!dateRes.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Cette date n’est plus disponible.' }) };

      const { data, error } = await supabase
        .from('inscriptions')
        .insert({
          lieu_id: payload.lieu_id,
          niveau_id: payload.niveau_id,
          date_id: payload.date_id,
          prenom_eleve: payload.prenom_eleve,
          nom_eleve: payload.nom_eleve,
          age_eleve: String(payload.age_eleve),
          nom_prenom_parent: payload.nom_prenom_parent,
          email_parent: payload.email_parent,
          telephone_parent: payload.telephone_parent,
          statut: 'Nouvelle'
        })
        .select()
        .single();
      if (error) throw error;

      return {
        statusCode: 201,
        headers: cors,
        body: JSON.stringify({
          id: data.id,
          lieu: lieuRes.data.nom,
          niveau: niveauRes.data.nom,
          date: dateRes.data.date,
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
        .select('*, lieux(nom), niveaux(nom), dates_disponibles(date)')
        .order('date_creation', { ascending: false });

      if (params.statut) query = query.eq('statut', params.statut);
      if (params.lieu_id) query = query.eq('lieu_id', params.lieu_id);
      if (params.niveau_id) query = query.eq('niveau_id', params.niveau_id);
      if (params.date_id) query = query.eq('date_id', params.date_id);

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
