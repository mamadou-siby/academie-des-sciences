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


## Cours d'essai d'anglais (Académie des Langues)

Le formulaire `inscription.html` propose deux académies : **Académie des Langues**
(anglais) et **Académie des Sciences** (maths, sciences, logique). Aucune
modification de la base de données n'est nécessaire : la séparation repose sur le
**nom du niveau**.

1. Dans l'admin, onglet **Niveaux**, créez les niveaux d'anglais avec un nom qui
   **commence par « Anglais »** (exemples à adapter : « Anglais — dès 4 ans »,
   « Anglais — collège », « Anglais — lycée »). Les autres niveaux restent ceux de
   l'Académie des Sciences.
2. Onglet **Dates** : créez les dates de cours d'essai d'anglais en les rattachant
   à ces niveaux (et au lieu, si besoin). Une date sans niveau reste valable pour
   tous les niveaux, maths comme anglais.
3. Onglet **Créneaux** : inchangé (un créneau sans date vaut pour toutes les dates).
4. Liens : `inscription.html?academie=langues` ouvre directement le formulaire en
   mode anglais ; `?academie=sciences` (ou sans paramètre) en mode maths/sciences.

Les dates proposées dépendent désormais du **niveau** (et du lieu) choisis.
Sans niveau d'anglais actif, le parent voit un message l'invitant à écrire à
contact@aven-co.com.
