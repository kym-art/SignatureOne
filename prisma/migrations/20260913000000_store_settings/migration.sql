-- ============================================================================
-- Signature One — Paramètres dynamiques du magasin (horaires, fermeture)
-- ============================================================================

-- Table clé-valeur JSON pour les settings du magasin.
-- Permet de modifier les horaires ou d'activer une fermeture exceptionnelle
-- sans redeployer l'application.
CREATE TABLE "StoreSetting" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "key"       TEXT NOT NULL,
    "value"     JSONB NOT NULL DEFAULT '{}'::JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreSetting_key_key" ON "StoreSetting"("key");

-- Seed : configuration horaire par défaut (09h–22h, pas de fermeture)
INSERT INTO "StoreSetting" ("id", "key", "value", "updatedAt")
VALUES (
    'settings_store_config',
    'store_config',
    '{"openHour":"09:00","closeHour":"22:00","closedEnabled":false,"closedMessage":null,"closedUntil":null}'::JSONB,
    NOW()
) ON CONFLICT ("key") DO NOTHING;