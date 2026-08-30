const { getClient, checkAdmin, cors } = require('./_supabase');

// GET  /api/lieux            -> lieux actifs, triés par ordre (public)
// GET  /api/lieux (admin)    -> tous les lieux (avec en-tête Authorization)
// POST /api/lieux            -> créer un lieu (admin)
// PATCH /api/lieux           -> modifier un lieu (admin) { id, ...champs }
// DELETE /api/lieux          -> supprimer un lieu (admin) { id }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const supabase = getClient();

    if (event.httpMethod === 'GET') {
      const admin = checkAdmin(event);
      let query = supabase.from('lieux').select('*').order('ordre', { ascending: true });
      if (!admin) query = query.eq('actif', true);
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
        .from('lieux')
        .insert({ nom: payload.nom, actif: payload.actif ?? true, ordre: payload.ordre ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PATCH') {
      const { id, ...fields } = payload;
      const { data, error } = await supabase.from('lieux').update(fields).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = payload;
      const { error } = await supabase.from('lieux').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
