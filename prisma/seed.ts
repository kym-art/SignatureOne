/**
 * Signature One - Initial Database Seeding Script
 * Seeds the initial test Admin, sample tables and base products for validation.
 */

// Note: When running with prisma directly: `npx prisma db seed`
export const initialSeedData = {
  users: [
    {
      id: "usr_admin_01",
      role: "ADMIN" as const,
      nom: "Directeur Signature One",
      telephone: "+22890000000",
      actif: true,
    },
    {
      id: "usr_vendeur_01",
      role: "VENDEUR" as const,
      nom: "Vendeur Comptoir 1",
      telephone: "+22891000000",
      actif: true,
    }
  ],
  tables: [
    { id: "tbl_01", numero: 1 },
    { id: "tbl_02", numero: 2 },
    { id: "tbl_03", numero: 3 },
    { id: "tbl_04", numero: 4 },
    { id: "tbl_05", numero: 5 },
  ],
  products: [
    {
      id: "prod_degue_nature",
      nom: "Dèguè Onctueux Nature",
      description: "Dèguè traditionnel au yaourt artisanal crémeux et couscous de mil doré.",
      format: "Bouteille 500ml",
      prix: 1500, // En FCFA
      disponible: true,
      quantiteRestante: 25,
      actif: true,
    },
    {
      id: "prod_degue_vanille",
      nom: "Dèguè Gourmand Vanille & Coco",
      description: "Recette signature infusée à la gousse de vanille et éclats de noix de coco grillée.",
      format: "Pot 400g",
      prix: 1800,
      disponible: true,
      quantiteRestante: 18,
      actif: true,
    },
    {
      id: "prod_yaourt_brassé",
      nom: "Yaourt Brassé Pur Lait",
      description: "Yaourt brassé artisanal doux et velouté à base de lait entier pasteurisé.",
      format: "Bouteille 1L",
      prix: 2500,
      disponible: true,
      quantiteRestante: 15,
      actif: true,
    },
    {
      id: "prod_bissap_menthe",
      nom: "Infusion Bissap Fraîcheur & Menthe",
      description: "Fleurs d'hibiscus infusées aux feuilles de menthe fraîche et subtil zeste de citron.",
      format: "Bouteille 500ml",
      prix: 1000,
      disponible: true,
      quantiteRestante: 30,
      actif: true,
    }
  ]
};

console.log("🌱 Signature One seed dataset configured successfully.");
