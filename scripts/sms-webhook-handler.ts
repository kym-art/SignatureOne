import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { parseSms } from '../src/lib/payment-sms';
import {
  saveSmsLog,
  reconcilePaymentFromSms,
} from '../src/lib/orders';
import {
  fetchOrdersServerSide,
  saveSmsLogServerSide,
  settleOrderPaymentServerSide,
  updateSmsLogStatusServerSide,
  isSupabaseServiceConfigured,
} from '../src/lib/supabase-server';

dotenv.config();

const app = express();

// Minimal CORS (no extra dependency): allow any origin for the POC webhook.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10kb' }));

// Secret partagé du webhook — comportement FAIL-CLOSED.
// Aucune valeur par défaut prévisible : si SMS_GATEWAY_WEBHOOK_SECRET n'est pas
// définie dans l'environnement, le webhook REFUSE de démarrer avec un message
// d'erreur explicite. En dev, définissez une valeur dans votre .env
// (ex. `.env` copié depuis `.env.example`) avant `npm run dev:sms`.
const WEBHOOK_SECRET = process.env.SMS_GATEWAY_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET || WEBHOOK_SECRET.trim() === '') {
  console.error(
    '❌ [webhook] SMS_GATEWAY_WEBHOOK_SECRET n’est pas définie dans l’environnement. ' +
    'Refus de démarrer (fail-closed). Définissez une valeur longue et aléatoire dans .env.'
  );
  process.exit(1);
}

// Rate limiting basique (POC) : 30 requêtes/minute par IP sur le webhook SMS.
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 requêtes / minute / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
});

app.post('/sms-incoming', smsLimiter, async (req: Request, res: Response) => {
  const secret = req.header('x-webhook-secret');
  if (secret !== WEBHOOK_SECRET) {
    return res.status(403).send('Unauthorized');
  }

  const body = req.body as {
    sender?: string;
    message?: string;
    receivedAt?: string;
  };
  const sender = body?.sender || '';
  const message = body?.message || '';
  const receivedAt = body?.receivedAt || new Date().toISOString();

  if (!sender || !message) {
    return res.status(400).json({ error: 'Missing fields (sender, message)' });
  }

  const parsed = parseSms(message);

  // 1) Persist the raw SMS (server-side to Supabase when configured, else local dev store).
  let smsLogId: string | undefined;
  try {
    smsLogId = (await saveSmsLogServerSide({
      sender,
      message,
      receivedAt,
      parsedAmount: parsed?.amount,
      parsedSender: parsed?.sender,
      parsedBalance: parsed?.balance,
      status: parsed ? 'PENDING' : 'ERROR',
    })) || undefined;
  } catch (err) {
    console.warn('[webhook] Persist SMS log (server) failed, using local fallback:', err);
  }

  if (!parsed) {
    // Store locally too when server store unavailable (dev mode)
    if (!smsLogId) saveSmsLog({ sender, message, receivedAt, status: 'ERROR' });
    return res.status(200).json({ ok: true, matched: false, reason: 'unparsable' });
  }

  // 2) Reconcile against real orders.
  //    When Supabase is configured we read durable orders directly; otherwise
  //    (dev, mock) we fall back to the localStorage-based reconcile helper.
  let outcome: 'matched' | 'ambiguous' | 'no_match';
  let matchedOrderId: string | undefined;

  const serverOrders = await fetchOrdersServerSide();

  if (serverOrders.length > 0) {
    const candidates = serverOrders.filter(
      (o) => o.total === parsed.amount && o.statutPaiement === 'EN_ATTENTE'
    );

    if (candidates.length === 1) {
      const order = candidates[0];
      const settled = await settleOrderPaymentServerSide(order.id, {
        raw_text: message,
        sender: parsed.sender,
        received_at: receivedAt,
        matched_amount: parsed.amount,
      });
      outcome = settled ? 'matched' : 'no_match';
      if (settled) matchedOrderId = order.id;
    } else if (candidates.length > 1) {
      outcome = 'ambiguous';
    } else {
      outcome = 'no_match';
    }
  } else {
    // Fallback to the local (dev/mock) reconcile.
    const localLog = saveSmsLog({
      sender,
      message,
      receivedAt,
      parsedAmount: parsed.amount,
      parsedSender: parsed.sender,
      parsedBalance: parsed.balance,
      status: 'PENDING',
    });
    outcome = reconcilePaymentFromSms(localLog.id || '', parsed.amount);
  }

  // Update SMS log status server-side (if we have a server log id).
  if (smsLogId) {
    await updateSmsLogStatusServerSide(
      smsLogId,
      outcome === 'matched' ? 'MATCHED' : 'UNMATCHED',
      outcome === 'matched' ? matchedOrderId : undefined
    );
  }

  if (outcome === 'matched') {
    console.log(`✅ Paiement validé pour ${parsed.amount} FCFA (${sender})`);
  } else if (outcome === 'ambiguous') {
    console.warn(`⚠️ Ambiguïté : plusieurs commandes pour ${parsed.amount} FCFA`);
  } else {
    console.log(`❌ Aucun match pour ${parsed.amount} FCFA (${sender})`);
  }

  res.json({ ok: true, matched: outcome === 'matched', outcome });
});

const smsWebhookPort = Number(process.env.SMS_WEBHOOK_PORT || 3001);

app.listen(smsWebhookPort, () => {
  if (!isSupabaseServiceConfigured) {
    console.warn(
      '⚠️ [webhook] SUPABASE_SERVICE_ROLE_KEY non configuré : rapprochement serveur désactivé. ' +
      'Mode dev/mock local uniquement. Configurez la clé service_role dans .env pour un fonctionnement réel.'
    );
  }
  console.log(
    `📲 Webhook SMS écouté sur http://localhost:${smsWebhookPort}/sms-incoming`
  );
});