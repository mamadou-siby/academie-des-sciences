# Formulaire d'inscription — Atelier découverte

Ce dossier ajoute au site un formulaire d'inscription (`inscription.html`),
un espace administrateur (`admin.html`) et les fonctions serveur
(`netlify/functions/`) qui les relient à une base de données. Aucune donnée
(lieux, niveaux, dates) n'est codée en dur dans le front-end.

## 1. Prévisualisation sans backend

`inscription.html` fonctionne dès l'ouverture, même sans base de données
connectée : si les endpoints `/api/lieux`, `/api/niveaux`, `/api/dates` ne
répondent pas, le formulaire utilise un petit jeu de données de démonstration
(3 lieux, 8 niveaux, 3 dates) et simule l'enregistrement. Un bandeau
d'avertissement s'affiche en haut du formulaire pour le rappeler. Cela
disparaît automatiquement dès que le backend ci-dessous est connecté —
aucune modification du front-end n'est nécessaire.

`admin.html` nécessite en revanche le backend : sans lui, la connexion échoue.

## 2. Créer la base de données (Supabase, gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter le contenu de `supabase-schema.sql`
   (crée les tables `lieux`, `niveaux`, `dates_disponibles`, `inscriptions`
   + quelques lieux/niveaux de départ).
3. Dans **Project Settings → API**, récupérer :
   - `Project URL` → variable `SUPABASE_URL`
   - `service_role` key (⚠️ pas la clé `anon`) → variable `SUPABASE_SERVICE_ROLE_KEY`

## 3. Configurer Netlify

Dans **Site settings → Environment variables** du site Netlify, ajouter :

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` (jamais exposée au navigateur) |
| `ADMIN_TOKEN` | Un mot de passe long et aléatoire, pour l'accès à `admin.html` |

`netlify.toml` est déjà configuré :
- dossier de fonctions : `netlify/functions`
- redirection `/api/*` → `/.netlify/functions/*`

Le déploiement installe automatiquement la dépendance `@supabase/supabase-js`
listée dans `package.json`.

## 4. Espace administrateur

Ouvrir `admin.html`, saisir la valeur de `ADMIN_TOKEN` définie ci-dessus.
Le jeton est conservé uniquement dans `sessionStorage` du navigateur (effacé
à la fermeture de l'onglet) et transmis via l'en-tête `Authorization` à
chaque appel. Depuis cet espace :

- **Lieux / Niveaux** : ajout, modification de l'ordre et du statut actif,
  suppression.
- **Dates** : ajout d'une date (associable à un lieu et/ou un niveau
  précis, ou laissée générale), activation/désactivation, suppression.
- **Inscriptions** : consultation des demandes avec filtres (statut, lieu,
  niveau) et changement de statut (Nouvelle / Contactée / Confirmée /
  Annulée).

⚠️ L'authentification par jeton partagé est une solution simple pour un
usage à un seul administrateur. Pour plusieurs comptes avec des rôles
différents, prévoir une authentification utilisateur (Netlify Identity,
Supabase Auth…) avant mise en production.

## 5. Évolutions prévues par l'architecture

Les tables et fonctions sont conçues pour accueillir sans refonte :
matières, formules, créneaux horaires, nombre de places disponibles,
enseignants, tarifs, paiements, confirmation automatique par email (à
brancher, par exemple, sur un service transactionnel déclenché après
l'insertion dans `inscriptions`).

## 6. Paiement en ligne (packs & abonnements)

Le paiement en ligne des packs de 7 semaines et des abonnements est une
extension distincte de ce backend (tunnel `commande.html`, fonctions
`create-checkout-session.js` / `stripe-webhook.js` / `commande-status.js`
/ `commandes.js`, table `commandes`). Elle nécessite Stripe.

👉 Voir **STRIPE-SETUP.md** pour la création des produits Stripe (valeurs
déjà pré-remplies, il n'y a qu'à recopier) et la liste complète des
variables d'environnement à ajouter sur Netlify.
