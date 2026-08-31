-- ============================================================================
-- Migration à exécuter UNE FOIS sur votre base Supabase existante
-- (Supabase > SQL Editor > New query > coller ce contenu > Run)
--
-- Sans risque pour vos données déjà en place : aucune suppression, les
-- anciens niveaux sont désactivés (pas supprimés) pour ne jamais casser
-- une inscription déjà enregistrée qui y ferait référence.
-- ============================================================================

-- 1. Nouvelle table des créneaux horaires
create table if not exists creneaux (
  id     bigserial primary key,
  nom    text not null,
  actif  boolean not null default true,
  ordre  integer not null default 0
);
alter table creneaux enable row level security;

insert into creneaux (nom, actif, ordre) values
  ('9h - 10h', true, 1),
  ('10h - 11h', true, 2),
  ('14h - 15h', true, 3),
  ('16h - 17h', true, 4),
  ('17h - 18h', true, 5),
  ('18h - 19h', true, 6)
on conflict do nothing;

-- 2. Nouvelle colonne sur inscriptions pour mémoriser le créneau choisi
alter table inscriptions add column if not exists creneau_id bigint references creneaux(id);

-- 3. Remplacement des niveaux détaillés par les cycles
update niveaux set actif = false;

insert into niveaux (nom, actif, ordre) values
  ('Cycle 1 (MS, GS)', true, 1),
  ('Cycle 2 (CP, CE1, CE2)', true, 2),
  ('Cycle 3 (CM1, CM2, 6e)', true, 3),
  ('Cycle 4 (5e, 4e, 3e)', true, 4),
  ('Lycée (2nde, 1re, Terminale)', true, 5);
