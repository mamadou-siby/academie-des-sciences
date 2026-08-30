const { createClient } = require('@supabase/supabase-js');

// Client Supabase utilisant la clé service_role : ne doit JAMAIS être
// exposée côté navigateur. Les identifiants proviennent uniquement des
// variables d'environnement Netlify (Site settings → Environment variables).
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans les variables d’environnement Netlify.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Authentification très simple de l'espace administrateur par jeton
// partagé (variable d'environnement ADMIN_TOKEN). Suffisant pour un MVP ;
// à remplacer par une authentification utilisateur (Netlify Identity,
// Supabase Auth…) avant une mise en production à plusieurs administrateurs.
function checkAdmin(event) {
  const token = process.env.ADMIN_TOKEN;
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const provided = header.replace(/^Bearer\s+/i, '').trim();
  return Boolean(token) && provided === token;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

module.exports = { getClient, checkAdmin, cors };
