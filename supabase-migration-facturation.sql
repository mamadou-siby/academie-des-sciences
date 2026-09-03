-- ============================================================================
-- Migration à exécuter sur votre base Supabase existante
-- (Supabase > SQL Editor > New query > coller ce contenu > Run)
--
-- Ajoute la numérotation séquentielle des factures (obligation légale :
-- une suite continue, sans trou, sans réutilisation de numéro).
-- ============================================================================

-- 1. Compteur de factures (une seule ligne, incrémentée à chaque facture émise)
create table if not exists facture_compteur (
  id     int primary key default 1,
  valeur int not null default 0
);
insert into facture_compteur (id, valeur) values (1, 0) on conflict (id) do nothing;

-- 2. Fonction qui incrémente le compteur de façon atomique et renvoie le
--    numéro de facture formaté (ex. AVEN-2026-000001)
create or replace function public.next_numero_facture()
returns text
language plpgsql
as $$
declare
  n int;
begin
  update facture_compteur set valeur = valeur + 1 where id = 1 returning valeur into n;
  return 'AVEN-' || extract(year from now())::text || '-' || lpad(n::text, 6, '0');
end;
$$;

-- 3. Colonne sur commandes pour mémoriser le numéro attribué
alter table commandes add column if not exists numero_facture text;
