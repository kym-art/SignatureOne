-- ============================================================================
-- Signature One — Activation RLS + policies minimales (audit sécurité)
--
-- Objectif : le navigateur accède aux données via la clé anon (publique).
-- Sans RLS, cette clé peut lire/écrire sur toutes les tables. On active donc
-- RLS partout et on expose à l'anon UNIQUEMENT ce dont le flux de commande a
-- réellement besoin. Le service_role (webhook / seed, côté serveur de confiance)
-- contourne RLS par design : il n'a donc besoin d'aucune policy ici.
--
-- Principe retenu :
--   * Tables publiques (catalogue, tables)      -> SELECT anon
--   * Tables de commande (Order/OrderItem)      -> INSERT anon + SELECT anon
--                                                     restreinte aux colonnes
--                                                     NON sensibles (pas de
--                                                     nom/tél/adresse des
--                                                     clients, pas de SMS brut)
--   * Tables sensibles (SmsLog, Payment, ...)   -> AUCUN accès anon
--
-- NB : RLS étant actif, une table sans policy et sans GRANT ne retourne aucune
-- ligne à l'anon (accès refusé) — c'est le comportement voulu pour les données
-- sensibles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Product : catalogue public (lecture pour tous).
-- Le navigateur doit lister les produits pour la boutique, la table, le vendeur.
-- Aucune écriture anon : la gestion produit est une action admin (à migrer côté
-- serveur). Toute écriture admin en anon sera donc bloquée par RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_select_public"
  ON "Product"
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- TableQR : numéros de table publics (choix de la table au QR).
-- Lecture seule pour tous.
-- ----------------------------------------------------------------------------
ALTER TABLE "TableQR" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tableqr_select_public"
  ON "TableQR"
  FOR SELECT
  USING (true);
-- ----------------------------------------------------------------------------
-- Order : PASSER COMMANDE (INSERT) + SUIVI (SELECT restreint par colonnes).
--
-- * INSERT : tout visiteur anonyme peut créer une commande (flux de commande).
--   WITH CHECK(true) = aucune contrainte d'écriture RLS supplémentaire : le
--   serveur validera les données au moment où les écritures privilégiées y
--   seront migrées. (En l'état courant, la commande est créée côté navigateur ;
--   l'isolation réelle de la création passera par le serveur — voir rapport.)
--
-- * SELECT : on autorise la lecture, mais UNIQUEMENT des colonnes non sensibles
--   (numero, statut, total, ...) via un GRANT par colonnes. L'anon ne voit donc
--   PAS clientNom, clientTel, adresseLivraison ni payment_matched_sms des
--   commandes. Aucune colonne "propriétaire" n'existant sur Order, cette
--   lecture reste "ouverte" par numero (pas d'isolation par utilisateur) :
--   arbitrage à valider — la source de vérité et le rapprochement réel restent
--   côté serveur (service_role).
-- ----------------------------------------------------------------------------
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_insert_public_place"
  ON "Order"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "order_select_limited_public_track"
  ON "Order"
  FOR SELECT
  USING (true);

-- Colonnes exposées à l'anon/authenticated pour le suivi de commande.
-- Les données clients (clientNom, clientTel, adresseLivraison) et l'historique
-- de rapprochement SMS (payment_matched_sms) ne sont PAS listées : elles
-- restent inaccessibles à la clé anon.
GRANT SELECT (id, numero, typeCommande, tableId, statut, statutPaiement,
              modePaiement, total, recuNumero, recuUrl, datePaiement,
              vendeurId, createdAt, payment_reference, payment_amount_expected)
  ON "Order" TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- OrderItem : l'anon peut insérer les lignes de la commande en cours de
-- création (flux de commande). Aucune lecture anon.
-- ----------------------------------------------------------------------------
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orderitem_insert_public_place"
  ON "OrderItem"
  FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Tables SENSIBLES — AUCUN accès anon.
-- Seul le service_role (webhook de rapprochement SMS, seed admin, futures
-- écritures serveur) y accède. On active RLS ET on révoque explicitement les
-- privilèges anon/authenticated (double protection).
-- ----------------------------------------------------------------------------

-- SmsLog : journaux bruts des SMS de paiement (montants, solde, téléphones).
ALTER TABLE "SmsLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SmsLog" FROM anon, authenticated;

-- Payment : flux de validation de paiement.
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Payment" FROM anon, authenticated;

-- Expense : dépenses internes (marge, coûts fournisseurs).
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Expense" FROM anon, authenticated;

-- User : profils internes (rôles admin/vendeur).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "User" FROM anon, authenticated;

-- Review : avis clients. La validation d'avis est une action admin (à migrer
-- côté serveur) et l'exposition des avis non validés est à éviter : on ne donne
-- donc PAS d'accès anon ici. À ré-ouvrir en INSERT/SELECT si le flux d'avis
-- public le nécessite, sur arbitrage (cf. rapport).
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Review" FROM anon, authenticated;