/**
 * Signature One — Point d'entrée Serverless Vercel du backend NestJS.
 *
 * Vercel n'exécute pas `app.listen()` : le serveur HTTP persistant est remplacé
 * par une Serverless Function qui enveloppe l'application NestJS (Express) avec
 * serverless-express. Toutes les requêtes /api/* sont réécrites vers cette
 * fonction (cf. vercel.json).
 *
 * La logique de démarrage (CORS, rate-limiting, guards) est celle d'un module
 * Nest classique ; seul le `listen()` de server/main.ts est remplacé.
 */
import 'reflect-metadata';
import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from '../server/dist/app.module';

let cachedHandler: ReturnType<typeof serverlessExpress> | null = null;

async function bootstrapHandler() {
  // FAIL-CLOSED (même règle que server/src/main.ts) : aucun démarrage sans
  // secret JWT. Définissez JWT_SECRET dans les variables Vercel.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    throw new Error(
      '[signature-one-backend] JWT_SECRET manquante : définissez-la dans les variables ' +
        "d'environnement Vercel (fail-closed)."
    );
  }
  if (process.env.JWT_SECRET === 'changez-moi-valeur-longue-et-aleatoire') {
    throw new Error(
      '[signature-one-backend] JWT_SECRET vaut encore la valeur d\'exemple : refuse de démarrer.'
    );
  }

  // Nest crée lui-même son instance Express (version cohérente avec
  // @nestjs/platform-express) ; on la récupère ensuite pour serverless-express.
  const app = await NestFactory.create(AppModule, {
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
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    try {
      cachedHandler = await bootstrapHandler();
    } catch (err) {
      console.error('❌ [signature-one-backend] Échec du démarrage serverless:', err);
      res.status(500).json({ message: 'API indisponible (configuration serveur manquante).' });
      return;
    }
  }
  return cachedHandler(req as any, res as any);
}
