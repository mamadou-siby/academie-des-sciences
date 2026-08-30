// Source de vérité unique pour les offres vendables via Stripe.
//
// RÈGLE DE SÉCURITÉ FONDAMENTALE : le frontend n'envoie jamais de montant.
// Il envoie uniquement un `code_offre` (ex: "PACK_PRIMAIRE_3H"). Le
// serveur (create-checkout-session.js) regarde ici quel Price ID Stripe
// utiliser et quel montant afficher. Aucun prix n'est jamais accepté
// depuis le frontend.
//
// Les valeurs `envPrice` / `envAcompte` sont des NOMS de variables
// d'environnement Netlify — pas les Price ID eux-mêmes. Une fois les
// produits créés dans Stripe (voir STRIPE-SETUP.md), reporter chaque
// Price ID (price_xxxxx) dans la variable d'environnement correspondante
// sur Netlify. Aucun montant n'est codé en dur ici : les montants ci-
// dessous ne servent qu'à l'affichage récapitulatif avant paiement — le
// montant réellement facturé est celui défini sur le Price Stripe.

const OFFERS = {
  // ---- PACKS 7 SEMAINES — PRIMAIRE → 6e (20 €/h) ----
  PACK_PRIMAIRE_3H: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_PRIMAIRE_3H',
    label: 'Accompagnement Progression — Primaire à 6e — 3h/semaine — 7 semaines',
    cycleScolaire: 'primaire_6e',
    heuresSemaine: 3,
    volumeHeures: 21,
    tarifHoraire: 20,
    montantAffiche: 420
  },
  PACK_PRIMAIRE_4H: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_PRIMAIRE_4H',
    label: 'Accompagnement Progression — Primaire à 6e — 4h/semaine — 7 semaines',
    cycleScolaire: 'primaire_6e',
    heuresSemaine: 4,
    volumeHeures: 28,
    tarifHoraire: 20,
    montantAffiche: 560
  },
  PACK_PRIMAIRE_4H30: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_PRIMAIRE_4H30',
    label: 'Accompagnement Progression — Primaire à 6e — 4h30/semaine — 7 semaines',
    cycleScolaire: 'primaire_6e',
    heuresSemaine: 4.5,
    volumeHeures: 31.5,
    tarifHoraire: 20,
    montantAffiche: 630
  },

  // ---- PACKS 7 SEMAINES — 4e → TERMINALE (24 €/h) ----
  PACK_LYCEE_3H: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_LYCEE_3H',
    label: 'Accompagnement Performance & Préparation aux Épreuves — 4e à Terminale — 3h/semaine — 7 semaines',
    cycleScolaire: '4e_terminale',
    heuresSemaine: 3,
    volumeHeures: 21,
    tarifHoraire: 24,
    montantAffiche: 504
  },
  PACK_LYCEE_4H: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_LYCEE_4H',
    label: 'Accompagnement Performance & Préparation aux Épreuves — 4e à Terminale — 4h/semaine — 7 semaines',
    cycleScolaire: '4e_terminale',
    heuresSemaine: 4,
    volumeHeures: 28,
    tarifHoraire: 24,
    montantAffiche: 672
  },
  PACK_LYCEE_4H30: {
    typeOffre: 'pack_7_semaines',
    mode: 'payment',
    envPrice: 'STRIPE_PRICE_PACK_LYCEE_4H30',
    label: 'Accompagnement Performance & Préparation aux Épreuves — 4e à Terminale — 4h30/semaine — 7 semaines',
    cycleScolaire: '4e_terminale',
    heuresSemaine: 4.5,
    volumeHeures: 31.5,
    tarifHoraire: 24,
    montantAffiche: 756
  },

  // ---- ABONNEMENTS — acompte + 10 mensualités puis arrêt automatique ----
  // Ne correspond pas aux packs : c'est le Parcours Raisonnement & Sciences
  // (cours annuels, 30 séances), indépendant du niveau et du tarif horaire.
  ABONNEMENT_75: {
    typeOffre: 'abonnement',
    mode: 'subscription',
    envPrice: 'STRIPE_PRICE_ABONNEMENT_75',
    envAcompte: 'STRIPE_PRICE_ACOMPTE_75',
    label: 'Abonnement — Formule 1h/semaine (75 €/mois)',
    montantAffiche: 75,
    montantAcompte: 45,
    cyclesPrevus: 10
  },
  ABONNEMENT_90: {
    typeOffre: 'abonnement',
    mode: 'subscription',
    envPrice: 'STRIPE_PRICE_ABONNEMENT_90',
    envAcompte: 'STRIPE_PRICE_ACOMPTE_90',
    label: 'Abonnement — Formule 1h30/semaine (90 €/mois)',
    montantAffiche: 90,
    montantAcompte: 60,
    cyclesPrevus: 10
  }
};

function getOffer(codeOffre) {
  const offer = OFFERS[codeOffre];
  if (!offer) return null;
  return offer;
}

function getPriceId(offer) {
  const priceId = process.env[offer.envPrice];
  if (!priceId) {
    throw new Error(
      `Variable d'environnement Netlify manquante : ${offer.envPrice}. ` +
      `Voir STRIPE-SETUP.md pour créer le produit correspondant dans Stripe.`
    );
  }
  return priceId;
}

function getAcomptePriceId(offer) {
  if (!offer.envAcompte) return null;
  const priceId = process.env[offer.envAcompte];
  if (!priceId) {
    throw new Error(
      `Variable d'environnement Netlify manquante : ${offer.envAcompte}. ` +
      `Voir STRIPE-SETUP.md pour créer le prix d'acompte correspondant dans Stripe.`
    );
  }
  return priceId;
}

module.exports = { OFFERS, getOffer, getPriceId, getAcomptePriceId };
