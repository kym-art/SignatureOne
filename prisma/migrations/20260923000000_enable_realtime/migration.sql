-- Signature One — Active Supabase Realtime sur les tables publiques.
--
-- Raison : le front écoute les changements (INSERT/UPDATE/DELETE) via le
-- client anon pour invalider ses caches SANS polling aveugle. Seules les
-- tables lisibles par l'anon émettent des événements :
--   * Product, TableQR : SELECT public total → payload complet.
--   * Order : SELECT anon restreint aux colonnes non sensibles (migration
--     ..._add_rls_policies) → payload restreint, suffisant comme SIGNAL
--     ("quelque chose a changé" → le front re-fetch via le backend JWT).
-- Les tables sensibles (SmsLog, Payment, Expense, User, Review) restent
-- hors publication : aucun événement anon, elles restent en polling staff.
--
-- Idempotent (IF NOT EXISTS / DROP IF EXISTS) : rejouable sans erreur.

-- La publication supabase_realtime est créée par Supabase ; on ajoute
-- nos tables si elles n'y sont pas déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE "Product";
ALTER PUBLICATION supabase_realtime ADD TABLE "TableQR";
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";

-- Replica identity FULL : le payload DELETE/UPDATE contient l'ancienne
-- ligne (utile pour invalider le bon cache même sans SELECT complet).
ALTER TABLE "Product" REPLICA IDENTITY FULL;
ALTER TABLE "TableQR" REPLICA IDENTITY FULL;
ALTER TABLE "Order" REPLICA IDENTITY FULL;
