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
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');

  // CORS : même origine par défaut (frontend + API réécrites sur le même
  // domaine Vercel). CORS_ORIGIN reste supporté si l'API est appelée depuis
  // un autre domaine.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigin && corsOrigin.length > 0 ? (corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin) : true,
    credentials: true,
  });

  // Rate-limiting global : 120 requêtes/minute/IP (identique au mode serveur).
  // Sur Vercel serverless, l'IP client arrive dans l'en-tête x-forwarded-for
  // (pas de socket TCP) : keyGenerator explicite requis.
  const clientIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'ip-inconnue';
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
