# Mode TEMPORAIRE — formulaire « à recontacter »

Tant que les dates de cours d'essai / d'atelier ne sont pas ouvertes, le site utilise
une **version temporaire** du formulaire d'inscription : **pas de champs Date ni
Créneau** ; le parent remplit le reste, clique sur **Valider**, et c'est seulement
dans le **message de confirmation** qu'on lui dit qu'il sera **recontacté pour fixer
la date et l'heure**.

Cette version est **totalement séparée** de la version normale. Rien de temporaire
n'a été mélangé aux fichiers normaux.

## Où se trouve quoi

| | Version NORMALE (à retrouver plus tard) | Version TEMPORAIRE (à retirer plus tard) |
|---|---|---|
| Page | `inscription.html` | `temporaire/inscription-temporaire.html` |
| Script de la page | `assets/js/inscription.js` | `temporaire/inscription-temporaire.js` |
| Fonction serveur | `netlify/functions/inscriptions.js` | `netlify/functions/temporaire-recontact/` (2 fichiers) |
| E-mails | `netlify/functions/_send-inscription-email.js` | `netlify/functions/temporaire-recontact/emails.js` |
| Base de données | tables existantes | `temporaire/supabase-migration-recontact.sql` (3 colonnes en plus) |
| Aiguillage | — | bloc « MODE TEMPORAIRE » à la fin de `netlify.toml` |

Ce qui reste dans les fichiers normaux et n'a pas à être retiré : dans l'admin
(`admin.html`, `assets/js/admin.js`) le badge « À recontacter », le compteur et le
filtre (ils ne s'affichent que s'il existe des demandes sans date), et le filtre
`a_recontacter` de `inscriptions.js`.

## Comment ça marche

Le bloc à la fin de `netlify.toml` fait afficher `temporaire/inscription-temporaire.html`
à la place de `inscription.html` (l'adresse `/inscription.html` ne change pas, donc
tous les boutons du site continuent de fonctionner sans modification). La page
temporaire envoie la demande à `/api/temporaire-recontact`, qui :

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
2. Dans `netlify.toml`, **supprimez le bloc « MODE TEMPORAIRE »** (de la ligne
   `DÉBUT MODE TEMPORAIRE` à `FIN MODE TEMPORAIRE`).
3. Redéployez. `/inscription.html` affiche alors la version normale.
4. Facultatif — nettoyage : supprimez le dossier `temporaire/` et le dossier
   `netlify/functions/temporaire-recontact/`. Les demandes déjà reçues restent dans
   l'admin ; les 3 colonnes ajoutées à la base peuvent rester (elles ne gênent pas).

## Tester en local sans Netlify

Le bloc de redirection n'agit que sur Netlify. En local, ouvrez directement
`inscription.html` (normale) ou `temporaire/inscription-temporaire.html` (temporaire).
