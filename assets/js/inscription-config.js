// Mode du formulaire d'inscription (inscription.html)
//
//   'recontact' : MODE TEMPORAIRE — les listes « Date » et « Créneau » sont
//                 indisponibles. Le parent remplit le reste, clique sur Valider
//                 et voit qu'il sera recontacté pour fixer la date. Un e-mail
//                 part vers contact@aven-co.com et la demande apparaît dans
//                 l'admin (« À recontacter »).
//   'creneaux'  : réservation en ligne classique (le parent choisit la date et
//                 le créneau parmi ceux ouverts dans l'admin).
//
// Pour ouvrir les réservations : remplacez 'recontact' par 'creneaux'
// ci-dessous, puis redéployez le site.
window.INSCRIPTION_MODE = 'recontact';
