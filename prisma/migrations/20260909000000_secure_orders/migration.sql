-- ============================================================================
-- Signature One — Robusteesse commandes & avis (audit code)
--  1. next_order_number() : numérotation SO-XXXX atomique côté DB (max SQL),
--     au lieu d'un scan applicatif limité (fallback conservé dans le code).
--  2. Review.orderId : index UNIQUE — un seul avis par commande garanti en base
--     (anti-spam, race condition impossible).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Numéro de commande suivant (SO-XXXX) — calculé par PostgreSQL.
--    Combiné au retry applicatif (insertOrderWithRetry), couvre la concurrence.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT 'SO-' || LPAD(
    (COALESCE(MAX(NULLIF(REGEXP_REPLACE(numero, '^SO-0*', ''), '')::integer), 0) + 1)::text,
    4,
    '0'
  )
  FROM "Order"
  WHERE numero ~ '^SO-[0-9]+$';
$$;

-- ---------------------------------------------------------------------------
-- 2. Un seul avis par commande — garantie base de données.
--    Avant de poser l'index UNIQUE, on déduplique les doublons éventuels
--    (on conserve l'avis le plus récent par orderId).
-- ---------------------------------------------------------------------------
DELETE FROM "Review" a
USING "Review" b
WHERE a."orderId" = b."orderId"
  AND a."createdAt" < b."createdAt";

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_key" ON "Review"("orderId");