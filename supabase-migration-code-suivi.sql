-- ============================================================================
-- Migration à exécuter sur votre base Supabase existante
-- (Supabase > SQL Editor > New query > coller ce contenu > Run)
--
-- Corrige l'erreur "Could not find the 'code_suivi' column of 'inscriptions'
-- in the schema cache" — la colonne existait dans le code du site mais
-- n'avait jamais été ajoutée à votre base réelle.
-- ============================================================================

alter table inscriptions add column if not exists code_suivi text;
