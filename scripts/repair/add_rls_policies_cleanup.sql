-- Nettoyage des artefacts de la migration add_rls_policies (auto-réparation P3009).
-- Idempotent : chaque instruction ne fait rien si l'objet n'existe pas.
DROP POLICY IF EXISTS "product_select_public" ON "Product";
DROP POLICY IF EXISTS "tableqr_select_public" ON "TableQR";
DROP POLICY IF EXISTS "order_insert_public_place" ON "Order";
DROP POLICY IF EXISTS "order_select_limited_public_track" ON "Order";
DROP POLICY IF EXISTS "orderitem_insert_public_place" ON "OrderItem";