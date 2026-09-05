/**
 * Signature One — Bootstrap NestJS SANS serveur HTTP, pour Serverless (Vercel).
 *
 * Le runtime Vercel fournit des objets Node req/res (l'interface native
 * d'Express) : on construit l'application Nest une seule fois par instance
 * froide et on renvoie son instance Express, directement appelable.
 *
 * ⚠️ Toute la logique Nest vit DANS le paquet server/ : la fonction Vercel
 * (api/index.ts) n'importe QUE ce module compilé. Si api/ chargeait aussi
 * @nestjs/* depuis son propre node_modules, DEUX instances de @nestjs/common
 * coexisteraient et `instanceof HttpException` échouerait dans les filtres
 * d'exception Nest — toute 401/400 serait renvoyée en 500 opaque.
 *
 * FAIL-CLOSED (même règle que server/src/main.ts) : aucun démarrage sans
 * secret JWT. Définissez JWT_SECRET dans les variables Vercel.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AppModule } from './app.module';

/** Instance Express de Nest : appelable directement avec (req, res) Node. */
export type ExpressHandler = (req: unknown, res: unknown, next?: NextFunction) => unknown;

async function createApp(): Promise<NestExpressApplication> {
  // FAIL-CLOSED : un secret prévisible permettrait de forger des tokens ADMIN.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    throw new Error(
      '[signature-one-backend] JWT_SECRET manquante : définissez-la dans les variables ' +
        "d'environnement Vercel (fail-closed)."
    );
  }
  if (process.env.JWT_SECRET === 'changez-moi-valeur-longue-et-aleatoire') {
    throw new Error(
      "[signature-one-backend] JWT_SECRET vaut encore la valeur d'exemple : refuse de démarrer."
    );
  }

  // Adaptateur Express fourni EXPLICITEMENT : @nestjs/platform-express est
  // importé statiquement (donc présent dans le bundle tracé par Vercel), au
  // lieu d'un require dynamique interne de Nest résolu à chaud au cold start.
  const adapter = new ExpressAdapter();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');

  // CORS : le frontend et l'API vivent sur le MÊME domaine Vercel (URL de
  // déploiement unique, jamais connue à l'avance). Le JWT voyage dans un
  // en-tête Authorization — jamais dans un cookie cross-site — CORS n'est
  // donc pas une frontière de sécurité ici. On REFLETTE l'origine demandée :
  // la valeur historique CORS_ORIGIN (« https://signature-one.vercel.app »)
  // pointe vers un AUTRE projet Vercel ; avec une liste fixe qui ne contenait
  // pas l'origine réellement déployée, le middleware cors omettait le header
  // Access-Control-Allow-Origin et le navigateur affichait une erreur CORS
  // masquant la vraie erreur serveur. Pour restreindre plus tard, posez
  // CORS_ORIGIN avec la/les bonnes origines et utilisez un callback origin.
  app.enableCors({
    origin: true, // reflète l'Origin de la requête
    credentials: true,
  });

  // Rate-limiting global : 120 requêtes/minute/IP (identique au mode serveur).
  // Clé : l'IP client vient de x-forwarded-for (posé par l'edge Vercel — le
  // runtime serverless n'expose pas forcément d'adresse socket). On normalise
  // via ipKeyGenerator : express-rate-limit v8 exige ce helper pour IPv6
  // (sinon validation ERR_ERL_KEY_GEN_IPV6) et son analyse statique signale
  // tout keyGenerator référençant req.ip.
  const clientIp = (req: Request): string => {
    const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    if (!raw) return 'ip-inconnue';
    try {
      return ipKeyGenerator(raw);
    } catch {
      return 'ip-inconnue';
    }
  };
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      keyGenerator: clientIp,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Trop de requêtes.' },
    })
  );
  // Rate-limiting dédié : soumission d'avis publics (5/min/IP).
  const reviewCreateLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    keyGenerator: clientIp,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop d\u2019avis soumis. Veuillez réessayer plus tard.' },
  });
  app.use('/api/reviews', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST') return reviewCreateLimiter(req, res, next);
    next();
  });

  // Erreurs de MIDDLEWARE (hors routeurs Nest) : réponse JSON diagnosable au
  // lieu d'un 500 opaque. Les erreurs de contrôleurs/guards restent gérées par
  // le filtre d'exceptions de Nest (n'atteignent jamais ce handler).
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ [signature-one-backend] Erreur middleware:', err?.stack || err);
    if (!res.headersSent) {
      res.status(Number(err?.status) || 500).json({
        message: 'Erreur interne du backend (middleware).',
        erreur: err?.message || String(err),
      });
    }
  });

  await app.init();
  return app;
}

/**
 * Construit (une fois par instance froide) l'application Nest et renvoie son
 * instance Express, appelable directement par le runtime Vercel.
 */
export async function bootstrapExpressApp(): Promise<ExpressHandler> {
  const app = await createApp();
  // L'app Express de Nest EST un handler (req, res) : renvoyée telle quelle.
  return app.getHttpAdapter().getInstance() as ExpressHandler;
}
