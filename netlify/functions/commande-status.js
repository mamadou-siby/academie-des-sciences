const { getClient, cors } = require('./_supabase');

// GET /api/commande-status?session_id=cs_...
//
// Utilisée par inscription-confirmee.html pour savoir si le paiement est
// RÉELLEMENT confirmé. Le webhook Stripe (stripe-webhook.js) est la seule
// écriture possible du statut "paye" : cette fonction ne fait que lire ce
// que le webhook a déjà enregistré. Si le webhook n'est pas encore passé
// (quelques secondes de délai possible), le statut renvoyé reste
// "en_attente" et le frontend doit patienter et réessayer.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Méthode non autorisée.' }) };
  }

  const sessionId = (event.queryStringParameters || {}).session_id;
  if (!sessionId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'session_id manquant.' }) };
  }

  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('commandes')
      .select('formule_label, type_offre, prix_total, montant_acompte, prenom_eleve, nom_eleve, prenom_parent, statut_paiement')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Commande introuvable.' }) };
    }
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
