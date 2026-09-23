/**
 * AUDIT LIVE PRODUCTION — Signature One
 * Usage: ADMIN_PASSWORD_TEST=xxx node scripts/audit-prod.mjs
 * Données de test marquées "AUDIT-TEST", nettoyées quand possible.
 */
const BASE = 'https://signature-one-navy.vercel.app/api';

const results = [];
const t = (ok, name, detail = '') => {
  results.push({ ok, name, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    return { status: 0, body: { message: String(e) } };
  }
  let data = null;
  try { data = await res.json(); } catch { /* pas de JSON */ }
  return { status: res.status, data };
}

(async () => {
  console.log('════════ AUDIT PRODUCTION ' + new Date().toISOString() + ' ════════');

  // ─── 1. AUTH ────────────────────────────────────────────────
  let r = await req('/auth/login', { method: 'POST', body: { telephone: '+22890000000', motDePasse: 'MAUVAIS-MDP' } });
  t(r.status === 401, 'AUTH: login mauvais mot de passe → 401', 'status=' + r.status);
  r = await req('/auth/login', { method: 'POST', body: { telephone: '+22890000000', motDePasse: process.env.ADMIN_PASSWORD_TEST } });
  const adminToken = r.data?.token;
  t(r.status === 200 && adminToken, 'AUTH: login admin → 200 + JWT', 'role=' + r.data?.user?.role);
  r = await req('/auth/me', { token: adminToken });
  t(r.status === 200 && r.data?.user?.role === 'ADMIN', 'AUTH: GET /auth/me (JWT) → 200', 'nom=' + (r.data?.user?.nom || '?'));
  r = await req('/auth/me');
  t(r.status === 401, 'AUTH: GET /auth/me sans JWT → 401', 'status=' + r.status);
  r = await req('/orders');
  t(r.status === 401, 'AUTH: GET /orders sans JWT → 401 (protection)', 'status=' + r.status);

  // ─── 2. PRODUITS (CRUD complet) ─────────────────────────────
  r = await req('/products');
  const products = Array.isArray(r.data) ? r.data : [];
  t(r.status === 200 && products.length > 0, 'PRODUCTS: GET public → 200', products.length + ' produit(s)');
  r = await req('/products', { method: 'POST', token: adminToken, body: { nom: 'AUDIT-TEST Produit', description: 'test audit', format: 'Pot 350ml', prix: 1000, disponible: true } });
  const testProduct = r.data;
  t(r.status === 200 || r.status === 201, 'PRODUCTS: POST création (admin) → ' + r.status, 'id=' + testProduct?.id);
  r = await req(`/products/${testProduct.id}`, { method: 'PATCH', token: adminToken, body: { prix: 1200 } });
  t(r.status === 200 && r.data?.prix === 1200, 'PRODUCTS: PATCH prix (admin) → 200', 'prix=' + r.data?.prix);
  r = await req('/products', { method: 'POST', body: { nom: 'X', format: 'F', prix: 100 } });
  t(r.status === 401, 'PRODUCTS: POST sans JWT → 401', 'status=' + r.status);
  r = await req(`/products/${testProduct.id}`, { method: 'DELETE', token: adminToken });
  t(r.status === 200, 'PRODUCTS: DELETE (admin, cleanup) → ' + r.status);

  // ─── 3. COMMANDES (cycle de vie complet) ────────────────────
  const prod = products[0];
  r = await req('/orders', { method: 'POST', body: { clientNom: 'AUDIT-TEST (ignorer)', clientPrenom: 'Test', clientTel: '+22890000001', typeCommande: 'RETRAIT', modePaiement: 'TMONEY', items: [{ productId: prod.id, quantite: 1, prixUnitaire: prod.prix }] } });
  const order = r.data;
  t(r.status === 200 || r.status === 201, 'ORDERS: POST création publique (client) → ' + r.status, 'numero=' + order?.numero + ' total=' + order?.total);
  r = await req(`/orders/${order.id}`, { token: adminToken });
  t(r.status === 200 && Array.isArray(r.data?.items), 'ORDERS: GET :id (admin) → 200 + items', 'items=' + (r.data?.items?.length ?? '?'));
  r = await req(`/orders/${order.id}/claim`, { method: 'POST', token: adminToken });
  t(r.status === 403, 'ORDERS: claim par ADMIN → 403 (design : claim réservé VENDEUR, admin passe par /assign)', 'status=' + r.status);
  r = await req(`/orders/${order.id}/status`, { method: 'PATCH', token: adminToken, body: { statut: 'ACCEPTEE' } });
  t(r.status === 200 && r.data?.statut === 'ACCEPTEE', 'ORDERS: statut NOUVELLE→ACCEPTEE → ' + r.status);
  r = await req(`/orders/${order.id}/pay`, { method: 'PATCH', token: adminToken });
  t(r.status === 200 && r.data?.statutPaiement === 'PAYE', 'ORDERS: /pay → PAYE → ' + r.status);
  r = await req(`/orders/${order.id}/unpay`, { method: 'PATCH', token: adminToken });
  t(r.status === 200 && r.data?.statutPaiement !== 'PAYE', 'ORDERS: /unpay (revert) → ' + r.status);
  r = await req(`/orders/${order.id}/status`, { method: 'PATCH', token: adminToken, body: { statut: 'TERMINEE' } });
  t(r.status === 200 && r.data?.statut === 'TERMINEE', 'ORDERS: statut → TERMINEE → ' + r.status);

  // ─── 4. AVIS ────────────────────────────────────────────────
  r = await req('/reviews', { method: 'POST', body: { orderId: order.id, note: 5, commentaire: 'AUDIT-TEST avis', prenom: 'Audit' } });
  const review = r.data;
  t(r.status === 200 || r.status === 201, 'REVIEWS: POST public → ' + r.status, 'valide=' + review?.valide);
  r = await req('/reviews/pending', { token: adminToken });
  const pendingCount = Array.isArray(r.data) ? r.data.length : '?';
  t(r.status === 200, 'REVIEWS: GET /pending (admin) → ' + r.status, pendingCount + ' en attente');
  r = await req(`/reviews/${review.id}/validate`, { method: 'PATCH', token: adminToken });
  t(r.status === 200, 'REVIEWS: validate (admin) → ' + r.status);
  r = await req('/reviews');
  t(r.status === 200 && Array.isArray(r.data) && r.data.some((x) => x.id === review.id), 'REVIEWS: GET public liste → validé visible', (Array.isArray(r.data) ? r.data.length : 0) + ' avis');
  r = await req(`/reviews/${review.id}`, { method: 'DELETE', token: adminToken });
  t(r.status === 200, 'REVIEWS: DELETE (admin, cleanup) → ' + r.status);

  // ─── 5. VENDEURS ────────────────────────────────────────────
  r = await req('/vendors', { token: adminToken });
  t(r.status === 200 && Array.isArray(r.data), 'VENDORS: GET liste (admin) → ' + r.status, r.data?.length + ' vendeur(s)');
  r = await req('/vendors', { method: 'POST', token: adminToken, body: { nom: 'AUDIT-TEST Vendeur', telephone: '+22891111222', motDePasse: 'Audit-Test-2026' } });
  const vendor = r.data;
  t(r.status === 200 || r.status === 201, 'VENDORS: POST création (admin) → ' + r.status, 'id=' + vendor?.id);
  r = await req('/auth/login', { method: 'POST', body: { telephone: '+22891111222', motDePasse: 'Audit-Test-2026' } });
  const vendorToken = r.data?.token;
  t(r.status === 200 && r.data?.user?.role === 'VENDEUR', 'VENDORS: login vendeur → 200 rôle VENDEUR', 'role=' + r.data?.user?.role);
  r = await req('/vendors', { token: vendorToken });
  t(r.status === 403, 'VENDORS: GET liste avec JWT VENDEUR → 403 (interdit)', 'status=' + r.status);
  r = await req(`/orders/${order.id}/claim`, { method: 'POST', token: vendorToken });
  t(r.status === 200 || r.status === 409, 'VENDORS: claim commande (vendeur) → ' + r.status, 'vendeur=' + (r.data?.vendeur?.nom || 'déjà pris'));
  r = await req('/orders/direct-sale', { method: 'POST', token: vendorToken, body: { clientNom: 'AUDIT-TEST comptoir', typeCommande: 'RETRAIT', modePaiement: 'TMONEY', items: [{ productId: prod.id, quantite: 1, prixUnitaire: prod.prix }] } });
  t(r.status === 200 || r.status === 201, 'VENDORS: vente directe comptoir (vendeur) → ' + r.status, 'numero=' + r.data?.numero + ' statut=' + r.data?.statut);
  r = await req(`/vendors/${vendor.id}/toggle`, { method: 'PATCH', token: adminToken });
  t(r.status === 200 && r.data?.actif === false, 'VENDORS: toggle désactivation (admin) → ' + r.status, 'actif=' + r.data?.actif);
  r = await req('/auth/login', { method: 'POST', body: { telephone: '+22891111222', motDePasse: 'Audit-Test-2026' } });
  t(r.status === 401 || r.status === 403, 'VENDORS: login vendeur désactivé → refusé', 'status=' + r.status);
  r = await req(`/vendors/${vendor.id}/reset-password`, { method: 'PATCH', token: adminToken });
  t(r.status === 200 && r.data?.tempPassword, 'VENDORS: reset-password (admin) → tempPassword généré');
  r = await req(`/vendors/${vendor.id}`, { method: 'DELETE', token: adminToken });
  t(r.status === 200, 'VENDORS: DELETE vendeur (admin, cleanup) → ' + r.status);

  // ─── 5b. COMMANDES — machine à états (transition arrière) ───
  r = await req(`/orders/${order.id}/status`, { method: 'PATCH', token: adminToken, body: { statut: 'NOUVELLE' } });
  t(r.status === 400 || r.status === 409, 'ORDERS: transition arrière interdite (machine à états) → 400/409', 'status=' + r.status);

  // ─── 6. RÉGLAGES BOUTIQUE ───────────────────────────────────
  r = await req('/store/settings');
  t(r.status === 200 && typeof r.data?.isOpen === 'boolean', 'SETTINGS: GET public → isOpen=' + r.data?.isOpen, `${r.data?.openHour ?? '?'}-${r.data?.closeHour ?? '?'}`);
  r = await req('/store/settings', { method: 'PATCH', token: adminToken, body: { openHour: r.data.openHour, closeHour: r.data.closeHour, closedEnabled: r.data.closedEnabled === true } });
  t(r.status === 200, 'SETTINGS: PATCH (admin, valeurs inchangées) → ' + r.status);

  // ─── 7. UPLOADS ─────────────────────────────────────────────
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(pngB64, 'base64')], { type: 'image/png' }), 'audit.png');
  let upRes = await fetch(BASE + '/uploads/product-image', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: form });
  let upData = null; try { upData = await upRes.json(); } catch { /* ignore */ }
  t([200, 201].includes(upRes.status) && upData?.url?.includes('supabase.co/storage'), 'UPLOADS: POST product-image (admin) → Supabase Storage', 'status=' + upRes.status);
  if (upData?.url) {
    const img = await fetch(upData.url);
    t(img.status === 200 && (img.headers.get('content-type') || '').startsWith('image/'), 'UPLOADS: GET image publique → 200 ' + img.headers.get('content-type'));
  }
  upRes = await fetch(BASE + '/uploads/product-image', { method: 'POST', body: form });
  t(upRes.status === 401 || upRes.status === 403, 'UPLOADS: POST sans JWT → refusé', 'status=' + upRes.status);

  // ─── 8. SANTÉ & ASSETS FRONTEND ─────────────────────────────
  r = await req('/__liveness');
  t(r.status === 200 && r.data?.ok === true, 'HEALTH: /api/__liveness → ok', 'supabase=' + r.data?.supabaseConfigured + ' jwt=' + r.data?.jwtConfigured);
  for (const asset of ['/', '/sw.js', '/manifest.json']) {
    const res = await fetch('https://signature-one-navy.vercel.app' + asset);
    t(res.status === 200, 'FRONTEND: ' + asset + ' → 200', (res.headers.get('content-type') || '').split(';')[0]);
  }

  // ─── BILAN ──────────────────────────────────────────────────
  const ok = results.filter((x) => x.ok).length;
  console.log('════════ BILAN: ' + ok + '/' + results.length + ' tests OK ════════');
  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.log('ÉCHECS:');
    failed.forEach((f) => console.log('  ❌ ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')));
  }
})();

