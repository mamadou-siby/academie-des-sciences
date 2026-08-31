const { getClient, checkAdmin, cors } = require('./_supabase');

// GET  /api/creneaux?date_id=X   -> creneaux actifs pour cette date : ceux
//                                    spécifiquement liés à date_id, plus ceux
//                                    valables pour toutes les dates (date_id
//                                    NULL). Triés par ordre. (public)
// GET  /api/creneaux (admin)     -> tous les creneaux, sans filtre par date
//                                    (avec en-tête Authorization)
// POST /api/creneaux             -> créer un créneau (admin) { nom, ordre?, date_id? }
// PATCH /api/creneaux            -> modifier un créneau (admin) { id, ...champs }
// DELETE /api/creneaux           -> supprimer un créneau (admin) { id }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const supabase = getClient();

    if (event.httpMethod === 'GET') {
      const admin = checkAdmin(event);
      const params = event.queryStringParameters || {};
      let query = supabase.from('creneaux').select('*').order('ordre', { ascending: true });
      if (!admin) {
        query = query.eq('actif', true);
        if (params.date_id) {
          query = query.or(`date_id.eq.${params.date_id},date_id.is.null`);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (!checkAdmin(event)) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Non autorisé.' }) };
    }

    const payload = event.body ? JSON.parse(event.body) : {};

    if (event.httpMethod === 'POST') {
      const { data, error } = await supabase
        .from('creneaux')
        .insert({
          nom: payload.nom,
          actif: payload.actif ?? true,
          ordre: payload.ordre ?? 0,
          date_id: payload.date_id || null
        })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PATCH') {
      const { id, ...fields } = payload;
      const { data, error } = await supabase.from('creneaux').update(fields).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = payload;
      const { error } = await supabase.from('creneaux').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

