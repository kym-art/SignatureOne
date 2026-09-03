# Signature One — Module 1 (Setup, Schéma Prisma & PWA)

Plateforme de vente en ligne et boutique pour **Signature One** (dèguè artisanal, yaourts et boissons gourmandes au Togo).

---

## 📦 Stack Technique

- **Framework** : React 19 / Vite + Next.js App Router structure
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de données & ORM** : Prisma 6 + PostgreSQL (Supabase)
- **Services Cloud** : Supabase (Auth, Storage, Realtime)
- **PWA** : Service Worker (`sw.js`), Web App Manifest (`manifest.json`), Display Standalone, Install Banner

---

## 🚀 Démarrage Rapide en Local

### 1. Cloner le projet et installer les dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier d'exemple et renseignez vos identifiants Supabase & Database :
```bash
cp .env.example .env
```

Variables requises dans `.env` :
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[VOTRE_CLE_ANON]"
```

### 3. Synchroniser la base de données Prisma
```bash
# Générer le client Prisma
npx prisma generate

# Appliquer la migration initiale sur PostgreSQL (Supabase)
npx prisma migrate dev --name init

# Injecter le jeu de données initial (Admin de test, tables et produits)
npx prisma db seed
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

---

## 📱 PWA & Installation Mobile

- **Android (Chrome)** : Le bandeau d'installation apparaît automatiquement (`beforeinstallprompt`).
- **iOS (Safari)** : Bouton Partager ➔ *« Sur l'écran d'accueil »*.
- **Icônes incluses** : `192x192`, `512x512` et SVG vectoriel.
- **Cache** : Stratégie de mise en cache des assets statiques dans `public/sw.js`.

---

## 🗂️ Arborescence des Modules

```
├── prisma/
│   ├── schema.prisma       # Schéma Prisma validé (8 modèles, 5 enums)
│   └── seed.ts             # Jeu de données de démarrage
├── public/
│   ├── manifest.json       # Manifeste PWA
│   ├── sw.js               # Service worker avec cache statique
│   ├── icon-192.png        # Icône PWA 192x192
│   ├── icon-512.png        # Icône PWA 512x512
│   └── icon.svg            # Logo vectoriel Signature One
├── src/
│   ├── components/
│   │   ├── admin/          # Espace administration & métriques
│   │   ├── boutique/       # Vente à emporter & livraison
│   │   ├── common/         # Header & Footer
│   │   ├── db/             # Inspecteur de schéma Prisma
│   │   ├── public/         # Accueil public
│   │   ├── pwa/            # Bandeau d'installation PWA
│   │   ├── table/          # Commande sur table QR (t/[tableId])
│   │   └── vendeur/        # Prise de commande & caisse
│   ├── lib/
│   │   ├── prisma.ts       # Singleton client Prisma
│   │   ├── supabase.ts     # Client Supabase
│   │   └── register-service-worker.ts
│   └── types.ts            # Types TypeScript dérivés du schéma
├── .env.example
└── package.json
```
