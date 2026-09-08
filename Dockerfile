# ============================================================================
# Signature One — Image multi-stage « prod-like »
#
# Trois cibles (docker compose les sélectionne via `target:`) :
#   - web     : nginx qui sert le build Vite + reverse proxy /api (miroir
#               des rewrites vercel.json, voir docker/nginx.conf)
#   - api     : runtime Node du backend NestJS compilé (server/dist/main.js)
#   - migrate : outils racine (CLI Prisma, tsx) pour rejouer scripts/ci-migrate
#               (migrations + seed admin) — l'étape de build Vercel en local.
# ============================================================================

# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Dépendances racine : Vite (build frontend) + CLI Prisma/tsx (migrate).
# Un `npm ci` échoue bruyamment si package-lock.json est désynchronisé de
# package.json — c'est exactement le comportement Vercel que l'on veut
# reproduire pour détecter les erreurs de déploiement.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps-root
# Prisma a besoin d'openssl/libc sur Alpine.
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Build frontend (Vite) — même inline des variables publiques que Vercel.
# ---------------------------------------------------------------------------
FROM deps-root AS web-build
WORKDIR /app
# Variables lues côté client (envPrefix VITE_ / NEXT_PUBLIC_ dans vite.config).
# Passées en build args par docker-compose (défaults = valeurs sûres).
ARG VITE_API_URL=/api
ARG VITE_USE_MOCK_DATA=""
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_CINETPAY_SITE_ID=""
ARG VITE_CINETPAY_API_KEY=""
ARG VITE_CINETPAY_SANDBOX=""
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_kym_SUPABASE_URL=""
ARG NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_CINETPAY_SITE_ID=$VITE_CINETPAY_SITE_ID \
    VITE_CINETPAY_API_KEY=$VITE_CINETPAY_API_KEY \
    VITE_CINETPAY_SANDBOX=$VITE_CINETPAY_SANDBOX \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_kym_SUPABASE_URL=$NEXT_PUBLIC_kym_SUPABASE_URL \
    NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY lib ./lib
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime web : nginx (statique + proxy /api vers le service `api`).
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ---------------------------------------------------------------------------
# Backend NestJS : dépendances server/ → compilation tsc → runtime minimal.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps-server
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM deps-server AS api-build
WORKDIR /app
COPY server/tsconfig.json ./
COPY server/src ./src
# Compile TOUT server/src, y compris serverless.ts (l'entrée Vercel) :
# une erreur TS dans l'un ou l'autre échoue ici, comme sur Vercel.
RUN npx tsc

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=api-build /app/dist ./dist
EXPOSE 4000
# FAIL-CLOSED : main.js refuse de démarrer sans JWT_SECRET valide.
CMD ["node", "dist/main.js"]

# ---------------------------------------------------------------------------
# Outils migration/seed : rejoue l'étape pré-build Vercel (ci-migrate.mjs).
# Nécessite DATABASE_URL / SUPABASE_* réelles — sinon skip gracieux (comme CI).
# ---------------------------------------------------------------------------
FROM deps-root AS migrate
WORKDIR /app
COPY prisma ./prisma
COPY scripts ./scripts
CMD ["node", "scripts/ci-migrate.mjs"]