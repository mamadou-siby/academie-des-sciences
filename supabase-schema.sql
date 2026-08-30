-- Schéma de base de données pour le formulaire d'inscription
-- « Atelier découverte » — à exécuter dans l'éditeur SQL de Supabase
-- (ou toute base Postgres équivalente).
--
-- Ces tables sont lues/écrites UNIQUEMENT par les Netlify Functions
-- (netlify/functions/*.js), via la clé service_role côté serveur.
-- Row Level Security est activée sans policy publique : aucun accès
-- direct depuis le navigateur n'est possible.

-- ============ LIEUX ============
create table if not exists lieux (
  id     bigserial primary key,
  nom    text not null,
  actif  boolean not null default true,
  ordre  integer not null default 0
);

-- ============ NIVEAUX ============
create table if not exists niveaux (
  id     bigserial primary key,
  nom    text not null,
  actif  boolean not null default true,
  ordre  integer not null default 0
);

-- ============ DATES DISPONIBLES ============
-- lieu_id / niveau_id sont optionnels : NULL = date valable pour tous
-- les lieux (ou tous les niveaux). Renseignés, ils restreignent la date
-- au lieu et/ou au niveau concerné.
create table if not exists dates_disponibles (
  id         bigserial primary key,
  date       date not null,
  actif      boolean not null default true,
  lieu_id    bigint references lieux(id) on delete set null,
  niveau_id  bigint references niveaux(id) on delete set null
);

-- ============ INSCRIPTIONS / DEMANDES ============
create table if not exists inscriptions (
  id                  bigserial primary key,
  lieu_id             bigint references lieux(id),
  niveau_id           bigint references niveaux(id),
  date_id             bigint references dates_disponibles(id),
  prenom_eleve        text not null,
  nom_eleve           text not null,
  age_eleve           text not null,
  nom_prenom_parent   text not null,
  email_parent        text not null,
  telephone_parent    text not null,
  date_creation       timestamptz not null default now(),
  statut              text not null default 'Nouvelle'
    check (statut in ('Nouvelle', 'Contactée', 'Confirmée', 'Annulée'))
);

create index if not exists idx_inscriptions_statut on inscriptions(statut);
create index if not exists idx_dates_disponibles_date on dates_disponibles(date);

-- ============ SÉCURITÉ ============
alter table lieux enable row level security;
alter table niveaux enable row level security;
alter table dates_disponibles enable row level security;
alter table inscriptions enable row level security;
-- Aucune policy publique créée volontairement : seules les fonctions
-- serveur (clé service_role) peuvent lire/écrire ces tables.

-- ============ DONNÉES DE DÉPART (à adapter) ============
insert into lieux (nom, actif, ordre) values
  ('Paris', true, 1),
  ('Versailles', true, 2),
  ('Boulogne', true, 3)
on conflict do nothing;

insert into niveaux (nom, actif, ordre) values
  ('Primaire', true, 1),
  ('6e', true, 2),
  ('5e', true, 3),
  ('4e', true, 4),
  ('3e', true, 5),
  ('Seconde', true, 6),
  ('Première', true, 7),
  ('Terminale', true, 8)
on conflict do nothing;

-- Exemple de dates (à ajuster/ajouter depuis l'espace administrateur) :
-- insert into dates_disponibles (date, actif) values ('2026-09-13', true);

-- =====================================================================
-- PAIEMENT EN LIGNE STRIPE — Packs de 7 semaines & Abonnements
-- =====================================================================
-- Table distincte de `inscriptions` (qui reste dédiée à l'atelier
-- découverte gratuit). Une commande correspond à un achat payant :
-- un pack de 7 semaines (paiement unique) ou un abonnement (75€/90€
-- par mois, acompte + 10 mensualités puis arrêt automatique).

create table if not exists commandes (
  id                          bigserial primary key,

  -- Offre
  type_offre                  text not null check (type_offre in ('pack_7_semaines', 'abonnement')),
  code_offre                  text not null,        -- ex: PACK_PRIMAIRE_3H, ABONNEMENT_75
  formule_label               text not null,        -- libellé lisible affiché au parent
  niveau                      text,                  -- niveau élève (packs uniquement)
  cycle_scolaire               text,                  -- ex "primaire_6e" / "4e_terminale" (packs)
  heures_semaine               numeric,               -- 3, 4, 4.5 (packs)
  volume_heures                numeric,               -- 21, 28, 31.5 (packs)
  tarif_horaire                 numeric,               -- 20 ou 24 (packs)
  prix_total                   numeric not null,      -- montant du pack, ou mensualité pour abonnement
  montant_acompte               numeric,               -- abonnements uniquement
  devise                       text not null default 'eur',

  -- Élève
  prenom_eleve                 text not null,
  nom_eleve                    text not null,
  classe                       text,
  etablissement                 text,
  matieres                     text,
  objectif                     text,
  difficultes                  text,
  echeance                     text,

  -- Parent
  prenom_parent                 text not null,
  nom_parent                   text not null,
  email_parent                  text not null,
  telephone_parent               text not null,
  adresse_facturation            text,

  -- Stripe
  stripe_customer_id            text,
  stripe_checkout_session_id     text,
  stripe_subscription_id         text,
  stripe_payment_intent_id       text,

  -- Statuts
  statut_paiement               text not null default 'en_attente'
    check (statut_paiement in ('en_attente', 'paye', 'echoue', 'rembourse', 'annule')),
  statut_inscription            text not null default 'a_planifier'
    check (statut_inscription in ('a_planifier', 'creneaux_a_confirmer', 'confirmee', 'en_cours', 'terminee', 'annulee')),

  -- Suivi abonnement (10 mensualités puis arrêt automatique)
  cycles_payes                  integer not null default 0,
  cycles_prevus                 integer,               -- 10 pour un abonnement
  date_fin_prevue                timestamptz,           -- calculée à la création (cancel_at Stripe)

  -- Suivi pack (cycle de 7 semaines)
  date_debut_cycle               date,
  date_fin_cycle                 date,

  date_creation                 timestamptz not null default now(),
  date_paiement                 timestamptz,
  metadata                     jsonb
);

create index if not exists idx_commandes_statut_paiement on commandes(statut_paiement);
create index if not exists idx_commandes_type_offre on commandes(type_offre);
create index if not exists idx_commandes_stripe_session on commandes(stripe_checkout_session_id);

-- Journal des événements Stripe reçus, pour garantir l'idempotence du
-- webhook (un même événement ne doit jamais être traité deux fois).
create table if not exists stripe_events_log (
  id           text primary key,   -- Stripe event id (evt_...)
  type         text not null,
  commande_id  bigint references commandes(id),
  recu_le      timestamptz not null default now()
);

alter table commandes enable row level security;
alter table stripe_events_log enable row level security;
-- Aucune policy publique : ces tables ne sont accessibles que via les
-- Netlify Functions, avec la clé service_role côté serveur.
