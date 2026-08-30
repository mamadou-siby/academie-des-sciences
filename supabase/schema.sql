-- ============================================================================
-- L'Académie des Sciences — Schéma base de données (Supabase / PostgreSQL)
-- Formulaire d'inscription "Cours d'essai / Atelier découverte"
-- ============================================================================
-- À exécuter dans : Supabase > SQL Editor > New query
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLE : lieux
-- ----------------------------------------------------------------------------
create table if not exists public.lieux (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null,
  actif      boolean not null default true,
  ordre      integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. TABLE : niveaux
-- ----------------------------------------------------------------------------
create table if not exists public.niveaux (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null,
  actif      boolean not null default true,
  ordre      integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. TABLE : dates_disponibles
-- lieu_id / niveau_id NULL = la date s'applique à tous les lieux / niveaux
-- ----------------------------------------------------------------------------
create table if not exists public.dates_disponibles (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  actif      boolean not null default true,
  lieu_id    uuid references public.lieux(id) on delete set null,
  niveau_id  uuid references public.niveaux(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. TABLE : inscriptions
-- ----------------------------------------------------------------------------
create table if not exists public.inscriptions (
  id                 uuid primary key default gen_random_uuid(),
  lieu_id            uuid references public.lieux(id),
  niveau_id          uuid references public.niveaux(id),
  date_id            uuid references public.dates_disponibles(id),
  prenom_eleve       text not null,
  nom_eleve          text not null,
  age_eleve          text not null,
  nom_prenom_parent  text not null,
  email_parent       text not null,
  telephone_parent   text not null,
  date_creation      timestamptz not null default now(),
  statut             text not null default 'Nouvelle'
                       check (statut in ('Nouvelle','Contactée','Confirmée','Annulée'))
);

-- ----------------------------------------------------------------------------
-- 5. TABLE : profiles (rôle admin, lié à Supabase Auth)
-- Un administrateur doit d'abord créer un compte via Auth > Users, puis :
--   insert into public.profiles (id, email, role) values ('<uuid-de-l-utilisateur>', 'admin@exemple.fr', 'admin');
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'user' check (role in ('user','admin'))
);

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : l'utilisateur connecté est-il admin ?
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Validation serveur à l'enregistrement d'une inscription :
-- le lieu, le niveau et la date doivent toujours exister ET être actifs.
-- (Vérification indépendante du front-end, non contournable.)
-- ----------------------------------------------------------------------------
create or replace function public.validate_inscription()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.lieu_id is null or not exists (
    select 1 from public.lieux where id = new.lieu_id and actif = true
  ) then
    raise exception 'Lieu invalide ou inactif';
  end if;

  if new.niveau_id is null or not exists (
    select 1 from public.niveaux where id = new.niveau_id and actif = true
  ) then
    raise exception 'Niveau invalide ou inactif';
  end if;

  if new.date_id is null or not exists (
    select 1 from public.dates_disponibles where id = new.date_id and actif = true
  ) then
    raise exception 'Date invalide ou indisponible';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_inscription on public.inscriptions;
create trigger trg_validate_inscription
  before insert on public.inscriptions
  for each row execute function public.validate_inscription();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.lieux             enable row level security;
alter table public.niveaux           enable row level security;
alter table public.dates_disponibles enable row level security;
alter table public.inscriptions      enable row level security;
alter table public.profiles          enable row level security;

-- Lecture publique : uniquement les lignes actives (formulaire public)
drop policy if exists "public_read_active_lieux" on public.lieux;
create policy "public_read_active_lieux" on public.lieux
  for select using (actif = true);

drop policy if exists "public_read_active_niveaux" on public.niveaux;
create policy "public_read_active_niveaux" on public.niveaux
  for select using (actif = true);

drop policy if exists "public_read_active_dates" on public.dates_disponibles;
create policy "public_read_active_dates" on public.dates_disponibles
  for select using (actif = true);

-- Écriture publique : uniquement la création d'une inscription
drop policy if exists "public_insert_inscriptions" on public.inscriptions;
create policy "public_insert_inscriptions" on public.inscriptions
  for insert with check (true);

-- Accès complet réservé aux administrateurs
drop policy if exists "admin_all_lieux" on public.lieux;
create policy "admin_all_lieux" on public.lieux
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_niveaux" on public.niveaux;
create policy "admin_all_niveaux" on public.niveaux
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_dates" on public.dates_disponibles;
create policy "admin_all_dates" on public.dates_disponibles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_read_inscriptions" on public.inscriptions;
create policy "admin_read_inscriptions" on public.inscriptions
  for select using (public.is_admin());

drop policy if exists "admin_update_inscriptions" on public.inscriptions;
create policy "admin_update_inscriptions" on public.inscriptions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_delete_inscriptions" on public.inscriptions;
create policy "admin_delete_inscriptions" on public.inscriptions
  for delete using (public.is_admin());

drop policy if exists "self_read_profile" on public.profiles;
create policy "self_read_profile" on public.profiles
  for select using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Index utiles
-- ----------------------------------------------------------------------------
create index if not exists idx_lieux_ordre on public.lieux (ordre);
create index if not exists idx_niveaux_ordre on public.niveaux (ordre);
create index if not exists idx_dates_date on public.dates_disponibles (date);
create index if not exists idx_inscriptions_statut on public.inscriptions (statut);

-- ----------------------------------------------------------------------------
-- Données d'exemple (à adapter ou supprimer depuis l'espace admin)
-- ----------------------------------------------------------------------------
insert into public.lieux (nom, actif, ordre) values
  ('Paris', true, 1),
  ('Versailles', true, 2),
  ('Boulogne', true, 3)
on conflict do nothing;

insert into public.niveaux (nom, actif, ordre) values
  ('Primaire', true, 1),
  ('6e', true, 2),
  ('5e', true, 3),
  ('4e', true, 4),
  ('3e', true, 5),
  ('Seconde', true, 6),
  ('Première', true, 7),
  ('Terminale', true, 8)
on conflict do nothing;

-- Quelques dates de démonstration (à remplacer depuis l'espace admin)
insert into public.dates_disponibles (date, actif, lieu_id, niveau_id)
select d, true, null, null
from (values
  (current_date + interval '7 day'),
  (current_date + interval '14 day'),
  (current_date + interval '21 day')
) as t(d)
on conflict do nothing;
