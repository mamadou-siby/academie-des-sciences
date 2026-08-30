const { getClient, checkAdmin, cors } = require('./_supabase');

// GET /api/commandes            -> liste + filtres (admin uniquement)
// PATCH /api/commandes          -> met à jour le statut d'inscription (admin)
//                                   { id, statut_inscription }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  if (!checkAdmin(event)) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Non autorisé.' }) };
  }

  try {
    const supabase = getClient();

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      let query = supabase.from('commandes').select('*').order('date_creation', { ascending: false });
      if (params.type_offre) query = query.eq('type_offre', params.type_offre);
      if (params.statut_paiement) query = query.eq('statut_paiement', params.statut_paiement);
      if (params.statut_inscription) query = query.eq('statut_inscription', params.statut_inscription);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PATCH') {
      const { id, statut_inscription } = event.body ? JSON.parse(event.body) : {};
      const { data, error } = await supabase
        .from('commandes')
        .update({ statut_inscription })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
