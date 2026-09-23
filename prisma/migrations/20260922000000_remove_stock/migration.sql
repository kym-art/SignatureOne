-- Signature One — Suppression du compteur de stock (ventes illimitées).
-- Retire Product.quantiteRestante : plus de décrément auto, plus de blocage
-- "produit épuisé", plus d'alertes de stock. Le bouton Disponible/Indisponible
-- (colonne `disponible`) et l'interrupteur Actif restent les seuls contrôles.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "quantiteRestante";
