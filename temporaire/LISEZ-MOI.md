# Mode TEMPORAIRE — formulaire « à recontacter »

Tant que les dates de cours d'essai / d'atelier ne sont pas ouvertes, le site utilise
une **version temporaire** du formulaire d'inscription : **pas de champs Date ni
Créneau** ; le parent remplit le reste, clique sur **Valider**, et c'est seulement
dans le **message de confirmation** qu'on lui dit qu'il sera **recontacté pour fixer
la date et l'heure**.

## Où se trouve quoi

`inscription.html`, à la racine du site, **est directement** la version temporaire :
c'est la page que les visiteurs voient. (Une première version utilisait une
redirection Netlify pour l'afficher — elle s'est révélée peu fiable, on l'a donc
abandonnée : le fichier `inscription.html` porte maintenant le contenu temporaire.)

| | Version TEMPORAIRE (en ligne actuellement) | Version NORMALE (à restaurer plus tard) |
|---|---|---|
| Page | `inscription.html` (à la racine) | `normal/inscription-normale.html` (archive) |
| Script de la page | `assets/js/inscription-temporaire.js` | `assets/js/inscription.js` (inchangé) |
| Fonction serveur | `netlify/functions/temporaire-recontact/` (2 fichiers) | `netlify/functions/inscriptions.js` (inchangé) |
| E-mails | `netlify/functions/temporaire-recontact/emails.js` | `netlify/functions/_send-inscription-email.js` (inchangé) |
| Base de données | `temporaire/supabase-migration-recontact.sql` (3 colonnes en plus) | tables existantes |

Ce qui reste dans les fichiers normaux et n'a pas à être retiré : dans l'admin
(`admin.html`, `assets/js/admin.js`) le badge « À recontacter », le compteur et le
filtre (ils ne s'affichent que s'il existe des demandes sans date), et le filtre
`a_recontacter` de `inscriptions.js`.

## Comment ça marche

La page temporaire envoie la demande à `/api/temporaire-recontact`, qui :

1. enregistre la demande dans l'admin (sans date, badge « À recontacter ») ;
2. envoie une alerte à **contact@aven-co.com** (répondre à cet e-mail écrit au parent) ;
3. envoie un accusé de réception au parent.

## Mettre le mode temporaire en place (une fois)

1. Supabase → SQL Editor → coller `temporaire/supabase-migration-recontact.sql` → Run
   (doit afficher 3 lignes). Sans cette étape la demande n'apparaît pas dans l'admin,
   mais l'e-mail d'alerte part quand même.
2. Netlify : la variable `RESEND_API_KEY` doit exister (déjà utilisée pour les e-mails de
   paiement). Facultatif : `CONTACT_EMAIL` (destinataire des alertes, par défaut
   contact@aven-co.com) et `SITE_URL` (lien vers l'admin dans l'e-mail).
3. Déployer le site.

## REVENIR à la réservation normale (avec dates et créneaux)

1. Dans l'admin, créez les dates et créneaux d'essai (onglets Dates et Créneaux).
2. Remplacez le contenu de `inscription.html` par celui de
   `normal/inscription-normale.html`. `assets/js/inscription.js` (le script normal)
   n'a pas bougé, donc rien d'autre à changer dans ce fichier.
3. Redéployez.
4. Facultatif — nettoyage : supprimez `normal/inscription-normale.html`,
   `assets/js/inscription-temporaire.js`, le dossier `temporaire/` et le dossier
   `netlify/functions/temporaire-recontact/`, et retirez le paragraphe « Mode
   temporaire » de `netlify.toml`. Les demandes déjà reçues restent dans l'admin ;
   les 3 colonnes ajoutées à la base peuvent rester (elles ne gênent pas).

## Tester en local sans Netlify

Ouvrez directement `inscription.html` (actuellement la version temporaire) ou
`normal/inscription-normale.html` (la version normale, archivée).
