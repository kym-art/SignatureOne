-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEUR');

-- CreateEnum
CREATE TYPE "TypeCommande" AS ENUM ('LIVRAISON', 'RETRAIT', 'SUR_PLACE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('NOUVELLE', 'ACCEPTEE', 'EN_PREPARATION', 'PRETE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'PAYE', 'PAIEMENT_LIVRAISON', 'PAIEMENT_SUR_PLACE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('FLOOZ', 'TMONEY', 'LIVRAISON', 'SUR_PLACE');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'MATCHED', 'UNMATCHED', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "prix" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "quantiteRestante" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "misEnAvant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableQR" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    CONSTRAINT "TableQR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTel" TEXT NOT NULL,
    "typeCommande" "TypeCommande" NOT NULL,
    "tableId" TEXT,
    "adresseLivraison" TEXT,
    "statut" "StatutCommande" NOT NULL DEFAULT 'NOUVELLE',
    "statutPaiement" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "modePaiement" "ModePaiement" NOT NULL,
    "total" INTEGER NOT NULL,
    "payment_reference" TEXT,
    "payment_amount_expected" INTEGER,
    "payment_matched_sms" JSONB,
    "recuNumero" TEXT,
    "recuUrl" TEXT,
    "datePaiement" TIMESTAMP(3),
    "vendeurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT,
    "statut" "StatutPaiement" NOT NULL,
    "confirmePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "prenom" TEXT,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "parsedAmount" INTEGER,
    "parsedSender" TEXT,
    "parsedBalance" INTEGER,
    "previousBalance" INTEGER,
    "matchedOrderId" TEXT,
    "status" "SmsStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "TableQR_numero_key" ON "TableQR"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Order_numero_key" ON "Order"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;