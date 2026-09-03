/**
 * Signature One — Seed de l'administrateur dans Supabase (au déploiement).
 *
 * ⚠️ SCRIPT CÔTÉ SERVEUR (déploiement uniquement), jamais importé côté client.
 *
 * Lit les variables de .env (non publiques, donc jamais dans le bundle) :
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY : accès privilégié Supabase
 *   - ADMIN_TELEPHONE        : numéro de téléphone de l'admin (ex. +22890000000)
 *   - ADMIN_PASSWORD         : mot de passe administrateur (vérifié par Supabase Auth)
 *   - ADMIN_NOM              : nom affiché de l'admin (optionnel)
 *
 * Crée (ou met à jour) l'utilisateur Supabase Auth qui sera vérifié par
 * `loginWithPhone` (email synthétique <telephone>@signature-one.local), puis
 * s'assure que le profil User (role ADMIN) existe dans la table `User`.
 *
 * Usage : npm run db:seed-admin
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Chargement manuel du .env (portable partout, sans dépendance).
function loadEnv(file = '.env'): void {
  try {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) return;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.substring(2)}`;
  if (!cleaned.startsWith('+')) return cleaned.startsWith('228') ? `+${cleaned}` : `+228${cleaned}`;
  return cleaned;
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const telephone = formatPhone(process.env.ADMIN_TELEPHONE ?? '+22890000000');
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!url || !serviceKey) {
    console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env');
    process.exit(1);
  }
  if (!password) {
    console.error('❌ ADMIN_PASSWORD est requis dans .env (mot de passe administrateur)');
    process.exit(1);
  }

  const adminEmail = `${telephone.replace('+', '')}@signature-one.local`;
  const nom = process.env.ADMIN_NOM ?? 'Directeur Signature One';

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`🔐 Seed admin : ${telephone} (${adminEmail})`);

  // 1. Créer / mettre à jour l'utilisateur Supabase Auth
  let authUserId: string | undefined;
  const { data: byEmail } = await supabase.auth.admin.listUsers();
  const users = ((byEmail?.users ?? []) as Array<{ id: string; email?: string | null }>);
  const existing = users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  if (existing) {
    authUserId = existing.id;
    const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, { password });
    if (updErr) throw new Error(`updateUserById: ${updErr.message}`);
    console.log('   ↳ Utilisateur Auth existant, mot de passe mis à jour.');
  } else {
    const { data, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { nom, role: 'ADMIN', telephone },
    });
    if (createErr) throw new Error(`createUser: ${createErr.message}`);
    authUserId = data.user?.id;
    console.log('   ↳ Utilisateur Auth créé.');
  }

  if (!authUserId) throw new Error('Impossible de déterminer l’id de l’utilisateur Auth.');

  // 2. S'assurer que le profil User (role ADMIN) existe
  const { data: profile } = await supabase
    .from('User')
    .select('id, role, actif')
    .eq('telephone', telephone)
    .maybeSingle();

  if (profile) {
    await supabase
      .from('User')
      .update({ role: 'ADMIN', actif: true, nom })
      .eq('telephone', telephone);
    console.log('   ↳ Profil User ADMIN synchronisé.');
  } else {
    await supabase
      .from('User')
      .insert({ id: authUserId, role: 'ADMIN', nom, telephone, actif: true });
    console.log('   ↳ Profil User ADMIN créé.');
  }

  console.log('✅ Administrateur prêt. La connexion s’effectue via Supabase Auth.');
}

main().catch((err) => {
  console.error('❌ Erreur lors du seed admin :', err?.message || err);
  process.exit(1);
});