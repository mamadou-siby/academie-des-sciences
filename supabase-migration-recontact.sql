-- ============================================================================
-- Migration Supabase — mode « à recontacter »
--
-- Où l'exécuter : Supabase > votre projet > SQL Editor > New query
--                 > coller TOUT ce contenu > bouton « Run ».
-- Quand : UNE SEULE FOIS, avant de déployer la nouvelle version du site.
-- Sans risque : le script peut être relancé, il ne supprime aucune donnée
-- et ne modifie pas les demandes déjà enregistrées.
-- ============================================================================

-- Académie choisie par le parent : 'sciences' (maths, sciences, logique) ou 'langues' (anglais)
alter table inscriptions
  add column if not exists academie text not null default 'sciences'
  check (academie in ('sciences', 'langues'));

-- Vrai quand la demande attend d'être recontactée pour fixer la date
alter table inscriptions
  add column if not exists a_recontacter boolean not null default false;

-- Niveau choisi quand il ne correspond à aucune ligne de la table « niveaux »
-- (ex. « Anglais — Primaire » tant que les niveaux d'anglais ne sont pas créés)
alter table inscriptions
  add column if not exists niveau_libre text;

create index if not exists idx_inscriptions_a_recontacter on inscriptions(a_recontacter);

-- Vérification : cette requête doit afficher 3 lignes
-- (academie, a_recontacter, niveau_libre).
select column_name, data_type
from information_schema.columns
where table_name = 'inscriptions'
  and column_name in ('academie', 'a_recontacter', 'niveau_libre')
order by column_name;
