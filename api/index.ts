/**
 * Signature One — Point d'entrée Serverless Vercel du backend NestJS.
 *
 * Shim volontairement MINCE : toute la logique Nest (CORS, rate-limiting,
 * guards, fail-closed JWT) vit dans server/src/serverless.ts, compilée vers
 * server/dist. Ce fichier n'importe QUE ../server/dist/serverless.
 *
 * Pourquoi ? Le runtime résout chaque require depuis le node_modules le plus
 * proche du fichier qui l'exécute. Si api/ ET server/ chargeaient chacun
 * @nestjs/* depuis leur propre node_modules, DEUX instances de @nestjs/common
 * coexisteraient et `instanceof HttpException` échouerait dans les filtres
 * d'exception Nest : toute 401/400 serait renvoyée en 500 opaque (« Internal
 * server error »). En n'important que server/dist, tout @nestjs/* se résout
 * depuis server/node_modules — un seul arbre, un seul jeu de classes.
 *
 * Sur Vercel, req/res SONT des objets Node (l'interface native d'Express) :
 * on appelle directement l'instance Express de Nest, SANS serverless-express
 * (ce paquet attend un événement Lambda API Gateway/Azure et lève « Unable to
 * determine event source based on event » sur des req/res Node → 500 partout).
 */
import { bootstrapExpressApp } from '../server/dist/serverless.js';

let cachedApp: ((req: unknown, res: unknown) => void) | null = null;

export default async function handler(req: any, res: any) {
  // Repli CORS manuel : le middleware cors de Nest n'existe que si le
  // bootstrap a réussi. Sans ces en-têtes sur les réponses de repli, le
  // navigateur masquerait la vraie erreur derrière une erreur CORS.
  const origin = req?.headers?.origin;
  const applyCorsHeaders = () => {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  };

  // Préflight : répondue ici même si l'app Nest n'est pas encore montée.
  if (req.method === 'OPTIONS') {
    applyCorsHeaders();
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(204).end();
    return;
  }

  if (!cachedApp) {
    try {
      cachedApp = await bootstrapExpressApp();
    } catch (err: any) {
      console.error('❌ [signature-one-backend] Échec du démarrage serverless:', err);
      // Message explicite pour faciliter le diagnostic sur Vercel (logs + réponse).
      applyCorsHeaders();
      res.status(500).json({
        message: 'API indisponible : échec du démarrage du backend.',
        erreur: err?.message || String(err),
        aide: "Vérifiez les variables d'environnement Vercel (JWT_SECRET requis, kym_* Supabase).",
      });
      return;
    }
  }
  return cachedApp(req, res);
}
