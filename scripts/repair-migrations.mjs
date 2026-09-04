#!/usr/bin/env node
/**
 * Signature One — Auto-réparation des migrations Prisma échouées (P3009).
 *
 * Deux usages :
 *  1. Build Vercel : importé par scripts/ci-migrate.mjs (deployWithRepair).
 *  2. Local        : npm run db:repair  (charge .env puis relance deploy avec réparation).
 *
 * P3009 apparaît quand une migration a déjà été marquée « failed » dans la base.
 * Tant que son statut n'est pas corrigé, Prisma refuse d'appliquer les suivantes
 * (c'est ce qui bloquait le build Vercel : add_rls_policies a échoué une première
 * fois, puis P3009 a tout arrêté).
 *
 * Stratégie sûre pour nos migrations (DDL additives) :
 *   1. prisma db execute --file scripts/repair/<migration>.sql  → nettoie les
 *      artefacts éventuellement créés à moitié (DROP POLICY IF EXISTS …) ;
 *   2. prisma migrate resolve --rolled-back <migration>         → lève le blocage ;
 *   3. relocation de prisma migrate deploy (une seule tentative).
 * En cas de nouvel échec, l'erreur EXACTE est remontée telle quelle.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --------------------------------------------------------------------------
// Mini outils d'environnement (autonomes, sans import circulaire)
// --------------------------------------------------------------------------

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

function isPlaceholder(v) {
  return /\[your-|<your-|changezmoi|placeholder|your-password/i.test(String(v ?? ''));
}

function prepareDbEnv() {
  const dbUrl = pick('DATABASE_URL', 'kym_POSTGRES_PRISMA_URL');
  const dirUrl = pick('DIRECT_URL', 'kym_POSTGRES_URL_NON_POOLING');
  if (dbUrl && !isPlaceholder(dbUrl.value)) {
    process.env.DATABASE_URL = dbUrl.value;
    process.env.DIRECT_URL = dirUrl && !isPlaceholder(dirUrl.value) ? dirUrl.value : dbUrl.value;
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------
// Exécution de commandes Prisma (sortie capturée, visible au log)
// --------------------------------------------------------------------------

function runCapture(cmd, label) {
  console.log(`\n━━━ ${label}\n\$ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out && out.trim()) console.log(out);
    return { ok: true, output: out || '' };
  } catch (err) {
    const stderr = String(err?.stderr ?? '');
    const stdout = String(err?.stdout ?? '');
    if (stdout && stdout.trim()) console.log(stdout);
    if (stderr && stderr.trim()) console.error(stderr);
    return { ok: false, output: `${stdout}\n${stderr}`.trim() };
  }
}
// --------------------------------------------------------------------------
// Détection P3009 et nom des migrations échouées
// --------------------------------------------------------------------------

export function hasP3009(output) {
  return /P3009/.test(output || '');
}

export function extractFailedMigrations(output) {
  // Message Prisma : The `NOM` migration started at <date> UTC failed
  const pattern = /The\s*`([^`]+)`\s+migration\s+started\s+at\s+.*?\s+failed/gi;
  const names = [];
  let m;
  while ((m = pattern.exec(output || '')) !== null) names.push(m[1]);
  return [...new Set(names)];
}

// Migrations connues pour lesquelles un nettoyage SQL idempotent existe.
const KNOWN_REPAIRS = Object.freeze({
  '20260830000300_add_rls_policies': 'add_rls_policies_cleanup.sql',
});

export function repairFailedMigrations(prismaOutput) {
  const failed = extractFailedMigrations(prismaOutput);
  if (failed.length === 0) {
    throw new Error('[repair] P3009 détecté mais aucun nom de migration échouée n’a pu être extrait.');
  }
  const unknown = failed.filter((n) => !Object.prototype.hasOwnProperty.call(KNOWN_REPAIRS, n));
  if (unknown.length > 0) {
    throw new Error(
      `[repair] Migrations échouées sans procédure de nettoyage connue : ${unknown.join(', ')}. ` +
        'Ajoutez le fichier .sql correspondant dans scripts/repair/.'
    );
  }
  for (const name of failed) {
    const sqlFile = path.join(process.cwd(), 'scripts', 'repair', KNOWN_REPAIRS[name]);
    const cleanup = runCapture(
      `npx prisma db execute --schema prisma/schema.prisma --file "${sqlFile}"`,
      `Nettoyage DDL de « ${name} »`
    );
    if (!cleanup.ok) {
      throw new Error(`[repair] Nettoyage SQL de « ${name} » échoué. Détail : ${cleanup.output.slice(-700)}`);
    }
    const resolve = runCapture(
      `npx prisma migrate resolve --schema prisma/schema.prisma --rolled-back "${name}"`,
      `Marquage « ${name} » rollbackée`
    );
    if (!resolve.ok) {
      throw new Error(`[repair] prisma migrate resolve de « ${name} » a échoué. Détail : ${resolve.output.slice(-700)}`);
    }
  }
  return failed;
}

export function deployWithRepair() {
  const first = runCapture('npx prisma migrate deploy --schema prisma/schema.prisma', 'Migrations Prisma');
  if (first.ok) return { ok: true, repaired: [] };

  if (!hasP3009(first.output)) {
    throw new Error(`[ci-backend] Migrations Prisma échouées. Détail : ${first.output.slice(-1200)}`);
  }

  console.warn('\n⚠️ [ci-backend] P3009 : migration(s) « failed » détectée(s) → auto-réparation…');
  const repaired = repairFailedMigrations(first.output);
  console.warn(`↳ Migration(s) réparée(s) : ${repaired.join(', ')} → relance du deploy…`);

  const second = runCapture('npx prisma migrate deploy --schema prisma/schema.prisma', 'Migrations Prisma (relance)');
  if (second.ok) {
    console.log('\n✅ [ci-backend] Migrations appliquées après réparation.');
    return { ok: true, repaired };
  }

  const detail = second.output.slice(-1200);
  throw new Error(
    `[ci-backend] Les migrations échouent encore après réparation.\n` +
      `Erreur exacte : ${detail}\n\n` +
      `Vérifiez en priorité :\n` +
      `  • DIRECT_URL (kym_POSTGRES_URL_NON_POOLING) doit être une connexion DIRECTE ou SESSION Supabase, ` +
      `pas un pooler transactionnel : utilisez pooler.supabase.com:5434 ou db.<ref>.supabase.co:5432.\n` +
      `  • L'utilisateur de la base doit être propriétaire des tables (privilèges pour CREATE POLICY / GRANT).`
  );
}

// --------------------------------------------------------------------------
// Exécution en ligne de commande : npm run db:repair
// --------------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadDotEnv('.env');
  if (prepareDbEnv()) {
    deployWithRepair().catch((err) => {
      console.error('\n❌', err.message);
      process.exit(1);
    });
  } else {
    console.error('❌ [db:repair] Aucune DATABASE_URL / kym_POSTGRES_PRISMA_URL utilisable (absente ou placeholder).');
    process.exit(1);
  }
}