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
 *  - Variables DB/seed manquantes ou à valeur placeholder (ex. [YOUR-PASSWORD])
 *    → log explicite et build NON bloqué (le frontend reste déployable).
 *  - Variables réelles mais échec réel (base injoignable, credentials invalides,
 *    URL de pooling sans DIRECT_URL) → le build échoue EN AFFICHANT la cause
 *    exacte capturée : mieux vaut un déploiement rouge documenté qu'une base
 *    silencieusement incohérente.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { deployWithRepair } from './repair-migrations.mjs';

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

const PLACEHOLDER_RE = /\[your-|<your-|changezmoi|placeholder|your-password/i;

function isPlaceholder(v) {
  return PLACEHOLDER_RE.test(v);
}

function hostOnly(url) {
  try {
    return new URL(url).host;
  } catch {
    return '(url illisible)';
  }
}

function isPooled(url) {
  return (
    /[?&]pgbouncer=true/i.test(url) ||
    /\.pooler\.supabase\.com/i.test(url) ||
    /:6543(\?|$)/.test(url)
  );
}

/** Tente de dériver une URL directe depuis une URL de pooling Supabase. */
function deriveDirectUrl(pooledUrl) {
  try {
    const u = new URL(pooledUrl);
    if (/\.pooler\.supabase\.com/i.test(u.host)) return null; // hôte pooler dédié
    if (u.port === '6543') u.port = '5432';
    u.searchParams.delete('pgbouncer');
    return u.toString();
  } catch {
    return null;
  }
}

/** Lance une commande visible au log, capture sa sortie, échoue avec un détail exploitable. */
function run(cmd, label) {
  console.log(`\n━━━ [ci-backend] ${label}\n\$ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out && out.trim()) console.log(out);
    return true;
  } catch (err) {
    const stderr = String(err?.stderr ?? '');
    const stdout = String(err?.stdout ?? '');
    if (stdout && stdout.trim()) console.log(stdout);
    if (stderr && stderr.trim()) console.error(stderr);
    const detail =
      stderr.trim().split('\n').slice(-8).join(' ⏎ ') ||
      stdout.trim().split('\n').slice(-4).join(' ⏎ ') ||
      'aucun détail capturé';
    throw new Error(`[ci-backend] ${label} échoué (exit ${err.status ?? '?'}). Détail : ${detail}`);
  }
}

loadDotEnv('.env');

// --- 1. Migrations Prisma ------------------------------------------------
const dbUrl = pick('DATABASE_URL', 'kym_POSTGRES_PRISMA_URL');
const dirUrl = pick('DIRECT_URL', 'kym_POSTGRES_URL_NON_POOLING');
const serviceKey = pick('SUPABASE_SERVICE_ROLE_KEY', 'kym_SUPABASE_SERVICE_ROLE_KEY', 'kym_SUPABASE_SECRET_KEY');
const supabaseUrl = pick('SUPABASE_URL', 'kym_SUPABASE_URL', 'NEXT_PUBLIC_kym_SUPABASE_URL');

console.log('[ci-backend] Variables détectées :');
console.log(`  - DB         : ${dbUrl ? dbUrl.key + ' (host ' + hostOnly(dbUrl.value) + (isPooled(dbUrl.value) ? ', pooling pgbouncer)' : ')') : 'aucune'}`);
console.log(`  - DIRECT_URL : ${dirUrl ? dirUrl.key : 'absente'}`);
console.log(`  - Supabase   : ${supabaseUrl ? supabaseUrl.key : 'aucune'}`);
console.log(`  - ServiceKey : ${serviceKey ? serviceKey.key : 'aucune'}`);
console.log(`  - ADMIN_PASSWORD : ${process.env.ADMIN_PASSWORD ? 'présente' : 'absente'}`);
console.log(`  - JWT_SECRET     : ${process.env.JWT_SECRET ? 'présente' : 'absente'}`);

// --- 1. Migrations Prisma ------------------------------------------------

if (dbUrl) {
  if (isPlaceholder(dbUrl.value)) {
    console.warn(
      `\n⚠️ [ci-backend] ${dbUrl.key} contient une valeur placeholder (ex. [YOUR-PASSWORD] de .env.example).\n` +
        '   Migrations IGNORÉES (build non bloqué). Dans Vercel → Settings → Environment Variables,\n' +
        '   remplacez la valeur par la vraie URL de votre base Supabase.\n'
    );
  } else {
    process.env.DATABASE_URL = dbUrl.value;
    if (dirUrl) {
      process.env.DIRECT_URL = dirUrl.value;
    } else if (isPooled(dbUrl.value)) {
      const derived = deriveDirectUrl(dbUrl.value);
      if (derived) {
        process.env.DIRECT_URL = derived;
        console.warn(
          `\n⚠️ [ci-backend] ${dbUrl.key} est une URL de pooling ; DIRECT_URL absente.\n` +
            `   Dérivation automatique d'une connexion directe (${hostOnly(derived)}).\n` +
            '   Pour un contrôle total, définissez DIRECT_URL (ou kym_POSTGRES_URL_NON_POOLING) sur l’URL directe Supabase.\n'
        );
      } else {
        console.warn(
          `\n⚠️ [ci-backend] ${dbUrl.key} est une URL de pooling (pgbouncer) et DIRECT_URL est absente.\n` +
            '   Prisma Migrate exige une connexion directe. Définissez dans Vercel :\n' +
            '   DIRECT_URL (ou kym_POSTGRES_URL_NON_POOLING) = URL directe Supabase (port 5432, sans pgbouncer).\n' +
            '   Tentative quand même…\n'
        );
        process.env.DIRECT_URL = dbUrl.value;
      }
    } else {
      process.env.DIRECT_URL = dbUrl.value;
    }
    deployWithRepair();
  }
} else {
  console.warn(
    '\n⚠️ [ci-backend] Aucune DATABASE_URL / kym_POSTGRES_PRISMA_URL : migrations ignorées (build non bloqué).\n'
  );
}

// --- 2. Seed administrateur (idempotent) ---------------------------------

if (serviceKey && supabaseUrl && process.env.ADMIN_PASSWORD) {
  if (isPlaceholder(serviceKey.value) || isPlaceholder(supabaseUrl.value)) {
    console.warn(
      '\n⚠️ [ci-backend] Une variable Supabase/ADMIN a une valeur placeholder : seed admin IGNORÉ (build non bloqué).\n'
    );
  } else {
    run('npx tsx scripts/seed-admin.ts', 'Seed administrateur');
  }
} else {
  console.warn(
    '\n⚠️ [ci-backend] Seed admin ignoré : manquent SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD.\n' +
      '   Exécution manuelle possible avec : npm run db:seed-admin\n'
  );
}

console.log('\n✅ [ci-backend] Étape de préparation base de données terminée.');