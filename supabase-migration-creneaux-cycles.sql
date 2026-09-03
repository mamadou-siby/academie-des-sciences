-- ============================================================================
-- Migration à exécuter sur votre base Supabase existante
-- (Supabase > SQL Editor > New query > coller ce contenu > Run)
--
-- Sans risque pour vos données déjà en place : aucune suppression de données
-- existantes. Si vous avez déjà exécuté une version précédente de cette
-- migration, les instructions ci-dessous sont sans effet sur ce qui existe
-- déjà (create table if not exists / add column if not exists).
-- ============================================================================

-- 1. Table des créneaux horaires (si pas déjà créée)
create table if not exists creneaux (
  id       bigserial primary key,
  nom      text not null,
  actif    boolean not null default true,
  ordre    integer not null default 0,
  date_id  bigint references dates_disponibles(id) on delete cascade
);
alter table creneaux enable row level security;

-- 2. Si la table existait déjà sans la colonne date_id (créée avant ce
--    changement), on l'ajoute maintenant : un créneau peut désormais être
--    lié à une date précise (NULL = valable pour toutes les dates).
alter table creneaux add column if not exists date_id bigint references dates_disponibles(id) on delete cascade;
create index if not exists idx_creneaux_date on creneaux(date_id);

-- 3. Nouvelle colonne sur inscriptions pour mémoriser le créneau choisi
alter table inscriptions add column if not exists creneau_id bigint references creneaux(id);

-- 4. Remplacement des niveaux détaillés par les cycles (sans effet si déjà fait)
update niveaux set actif = false
where nom in ('Primaire','6e','5e','4e','3e','Seconde','Première','Terminale');

insert into niveaux (nom, actif, ordre)
select v.nom, true, v.ordre
from (values
  ('Cycle 1 (MS, GS)', 1),
  ('Cycle 2 (CP, CE1, CE2)', 2),
  ('Cycle 3 (CM1, CM2, 6e)', 3),
  ('Cycle 4 (5e, 4e, 3e)', 4),
  ('Lycée (2nde, 1re, Terminale)', 5)
) as v(nom, ordre)
where not exists (select 1 from niveaux where nom = v.nom);

-- 5. Créneaux d'exemple en 30 minutes (uniquement si la table est encore
--    vide — n'écrase jamais des créneaux que vous auriez déjà créés)
insert into creneaux (nom, actif, ordre)
select v.nom, true, v.ordre
from (values
  ('9h - 9h30', 1),
  ('9h30 - 10h', 2),
  ('10h - 10h30', 3),
  ('10h30 - 11h', 4),
  ('14h - 14h30', 5),
  ('14h30 - 15h', 6),
  ('16h - 16h30', 7),
  ('16h30 - 17h', 8),
  ('17h - 17h30', 9),
  ('17h30 - 18h', 10)
) as v(nom, ordre)
where not exists (select 1 from creneaux);

-- 6. Code de suivi (partenariats) sur les inscriptions à l'atelier découverte
alter table inscriptions add column if not exists code_suivi text;
