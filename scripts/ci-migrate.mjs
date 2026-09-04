#!/usr/bin/env node
/**
 * Signature One — Étape de préparation base de données au DÉPLOIEMENT.
 *
 * Exécutée en tête du buildCommand Vercel (vercel.json). Vercel ne fournit
 * AUCUN terminal : cette étape tourne donc automatiquement au moment du build,
 * avec les variables d'environnement définies dans le dashboard Vercel.
 *
 *  1. Migrations Prisma  : applique prisma/migrations (tables + policies RLS)
 *                          si une URL de base est disponible
 *                          (DATABASE_URL ou replis kym_POSTGRES_*).
 *  2. Seed administrateur : exécute scripts/seed-admin.ts si les variables
 *                           Supabase + ADMIN_PASSWORD sont présentes
 *                           (idempotent : crée/mets à jour le compte admin).
 *
 * Règle de sûreté :
 *  - Variables DB/seed manquantes → log explicite et build NON bloqué.
 *  - Variables présentes mais migrate/seed en échec (base injoignable) →
 *    on laisse échouer le build : mieux vaut un déploiement rouge qu'une
 *    base silencieusement incohérente.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function pick(...keys) {
  for (const k of keys) {
    if (process.env[k]) return { key: k, value: process.env[k] };
  }
  return null;
}

loadDotEnv('.env');

// --- 1. Migrations Prisma ------------------------------------------------
const dbUrl = pick('DATABASE_URL', 'kym_POSTGRES_PRISMA_URL');
const dirUrl = pick('DIRECT_URL', 'kym_POSTGRES_URL_NON_POOLING');

if (dbUrl) {
  process.env.DATABASE_URL = dbUrl.value;
  process.env.DIRECT_URL = dirUrl ? dirUrl.value : dbUrl.value;
  console.log(`[ci-backend] Source DB « ${dbUrl.key} » détectée → prisma migrate deploy …`);
  execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: process.cwd() });
} else {
  console.warn(
    '[ci-backend] Aucune DATABASE_URL / kym_POSTGRES_PRISMA_URL : migrations ignorées (build non bloqué).'
  );
}

// --- 2. Seed administrateur (idempotent) ---------------------------------
const serviceKey = pick(
  'SUPABASE_SERVICE_ROLE_KEY',
  'kym_SUPABASE_SERVICE_ROLE_KEY',
  'kym_SUPABASE_SECRET_KEY'
);
const supabaseUrl = pick(
  'SUPABASE_URL',
  'kym_SUPABASE_URL',
  'NEXT_PUBLIC_kym_SUPABASE_URL'
);

if (serviceKey && supabaseUrl && process.env.ADMIN_PASSWORD) {
  console.log('[ci-backend] Variables admin présentes → seed de l’administrateur …');
  execSync('npx tsx scripts/seed-admin.ts', { stdio: 'inherit', cwd: process.cwd() });
} else {
  console.warn(
    '[ci-backend] Seed admin ignoré : manquent SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD. ' +
      'Exécution manuelle possible avec : npm run db:seed-admin'
  );
}