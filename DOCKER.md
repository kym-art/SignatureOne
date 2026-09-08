# 🐳 Docker — Tester Signature One en local (mode « prod-like »)

Cette stack rejoue **exactement le pipeline Vercel** pour détecter les erreurs
de déploiement avant de pousser :

| Étape Vercel (vercel.json) | Équivalent Docker |
|---|---|
| `npm ci` (racine) | stage `deps-root` du Dockerfile |
| `node scripts/ci-migrate.mjs` (migrations + seed admin) | service `migrate` |
| `npm run build` (Vite, inlines `VITE_*`/`NEXT_PUBLIC_*`) | stage `web-build` |
| `cd server && npm ci && npx tsc` | stages `deps-server` + `api-build` |
| rewrites `/api/*` → fonction, `/` → SPA | nginx `docker/nginx.conf` |

## 🚀 Démarrage

```bash
docker compose up -d --build
```

- **Frontend** : http://localhost:3000 (nginx + SPA fallback, comme Vercel)
- **API NestJS** : http://localhost:4000/api (aussi joignable via
  http://localhost:3000/api — le proxy nginx, chemin identique à Vercel)

Le frontend appelle `/api` en same-origin (`VITE_API_URL=/api`) : aucune
configuration CORS nécessaire, routing identique à la production.

## 🗄️ Migrations & seed admin (étape Vercel rejouée)

Le service `migrate` exécute `scripts/ci-migrate.mjs` dans un conteneur
one-shot :

```bash
docker compose --profile setup run --rm migrate
```

- **Sans credentials** (état actuel du .env local : pas de `DATABASE_URL`,
  pas de `SUPABASE_URL`) → skip gracieux avec avertissement, exit 0
  (comportement identique à la CI Vercel).
- **Avec credentials** : ajoute dans `.env` les valeurs de la plateforme :

  ```env
  DATABASE_URL=<kym_POSTGRES_PRISMA_URL>
  DIRECT_URL=<kym_POSTGRES_URL_NON_POOLING>
  SUPABASE_URL=<kym_SUPABASE_URL>
  SUPABASE_SERVICE_ROLE_KEY=<kym_SUPABASE_SERVICE_ROLE_KEY>
  ```

  puis relance la commande : migrations Prisma + seed admin seront appliquées.

## 🔑 Données réelles dans le frontend

Les clés Supabase (`kym_*`) sont injectées par la plateforme sur Vercel mais
**absentes en local**. Pour que le navigateur charge les vraies données,
ajoute dans `.env` (variables publiques, safe à inliner) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

puis rebuilde : `docker compose up -d --build web`.

## 🔍 Détecter les erreurs de déploiement

- `npm ci` désynchronisé → le build échoue au stage `deps-root`/`deps-server`
- Erreurs TypeScript backend (y compris `serverless.ts`, l'entrée Vercel) →
  stage `api-build`
- Erreurs de build Vite (imports, variables manquantes) → stage `web-build`
- `JWT_SECRET` manquante ou = valeur d'exemple → le conteneur `api` **refuse
  de démarrer** (fail-closed, comme en prod)
- Migrations qui cassent → service `migrate` (avec creds réelles)
- CORS / routing `/api` → testables via le proxy nginx

## 🛠️ Commandes utiles

```bash
docker compose logs -f api      # logs backend
docker compose logs -f web      # logs nginx
docker compose ps               # état + healthcheck
docker compose down             # arrêter
docker compose build web        # rebuilde le frontend seul (après modif .env)
docker compose build api        # rebuilde le backend seul
```

## 📁 Fichiers ajoutés

- `Dockerfile` — multi-stage, cibles `web` / `api` / `migrate`
- `docker-compose.yml` — orchestration
- `docker/nginx.conf` — statique + proxy `/api`
- `.dockerignore` — contexte de build slim

Le dossier `api/` (wrapper serverless Vercel) est volontairement **ignoré** :
en Docker on lance `server/dist/main.js`, la même application Nest.
