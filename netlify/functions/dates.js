const { getClient, checkAdmin, cors } = require('./_supabase');

// GET /api/dates?lieu_id=&niveau_id=
//   -> dates actives et futures, éventuellement filtrées par lieu et/ou
//      niveau (une date sans lieu_id/niveau_id est valable pour tous).
// POST / PATCH / DELETE (admin) -> gestion des dates.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const supabase = getClient();

    if (event.httpMethod === 'GET') {
      const admin = checkAdmin(event);
      const params = event.queryStringParameters || {};
      let query = supabase.from('dates_disponibles').select('*').order('date', { ascending: true });

      if (!admin) {
        const today = new Date().toISOString().slice(0, 10);
        query = query.eq('actif', true).gte('date', today);
      }
      if (params.lieu_id) {
        query = query.or(`lieu_id.eq.${params.lieu_id},lieu_id.is.null`);
      }
      if (params.niveau_id) {
        query = query.or(`niveau_id.eq.${params.niveau_id},niveau_id.is.null`);
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
        .from('dates_disponibles')
        .insert({
          date: payload.date,
          actif: payload.actif ?? true,
          lieu_id: payload.lieu_id || null,
          niveau_id: payload.niveau_id || null
        })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PATCH') {
      const { id, ...fields } = payload;
      const { data, error } = await supabase.from('dates_disponibles').update(fields).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = payload;
      const { error } = await supabase.from('dates_disponibles').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
