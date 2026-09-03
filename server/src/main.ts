import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const dotenv = await import('dotenv');
  dotenv.config();

  // FAIL-CLOSED : aucun démarrage sans secret de signature JWT. Un secret
  // prévisible permettrait de forger des tokens ADMIN (usurpation de rôle).
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    console.error(
      '❌ [signature-one-backend] JWT_SECRET n’est pas définie. Refus de démarrer (fail-closed). ' +
        'Définissez une valeur longue et aléatoire dans .env.'
    );
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'changez-moi-valeur-longue-et-aleatoire') {
    console.error(
      '❌ [signature-one-backend] JWT_SECRET vaut encore la valeur d’exemple de .env.example. ' +
        'Refus de démarrer : définissez une valeur longue et aléatoire.'
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // CORS : autoriser uniquement l'origine du frontend.
  // Défaut restrictif : l'origine du serveur de dev Vite de CE projet (port 3000,
  // cf. script "dev" racine). Plus jamais '*' par défaut — en production,
  // définissez CORS_ORIGIN (une ou plusieurs origines, séparées par des virgules).
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean)
    ?? ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
    credentials: true,
  });

  // Rate-limiting global (POC) : 120 requêtes/minute/IP sur toutes les routes.
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Trop de requêtes.' },
    })
  );
  // Rate-limiting dédié anti-spam : soumission d'avis publics (POST /api/reviews)
  // limitée à 5 requêtes/minute/IP, en plus du limiter global ci-dessus.
  const reviewCreateLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop d\u2019avis soumis. Veuillez réessayer plus tard.' },
  });
  app.use('/api/reviews', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST') return reviewCreateLimiter(req, res, next);
    next();
  });
  // En-têtes de sécurité basiques (sans dépendance externe).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'deny');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Port dédié à l'API : PORT_API (documenté dans .env.example). On ne lit PAS
  // `PORT` car cette variable sert à d'autres processus du projet (Vite, webhook SMS).
  const port = Number(process.env.PORT_API || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`✅ [signature-one-backend] API écoutée sur http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ [signature-one-backend] Échec du démarrage:', err);
  process.exit(1);
});

