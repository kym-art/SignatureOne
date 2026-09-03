/**
 * Signature One - Module 9: Reçus PDF & Documents de Caisse
 * 
 * Génération automatique, consultation, impression standard A4
 * et téléchargement des reçus officiels dès validation du paiement.
 */

import { Order, StatutPaiement } from '../types';
import { getOrderById, getAllOrders, getPaymentStatusDetails, getReceptionModeDetails } from './orders';
import { generateQRCode } from './qr';

const STORAGE_RECEIPT_COUNTER_KEY = 'signature_one_receipt_counter_v9';
const STORAGE_RECEIPTS_KEY = 'signature_one_receipts_v9';

export interface ReceiptRecord {
  id: string;
  recuNumero: string;
  orderId: string;
  orderNumero: string;
  clientNom: string;
  clientTel: string;
  total: number;
  modePaiement: string;
  typeCommande: string;
  datePaiement: string;
  recuUrl?: string;
  itemsCount: number;
}

/**
 * Generate sequential receipt number (e.g. REC-0001, REC-0002)
 */
export function getNextReceiptNumber(orderNumero?: string): string {
  if (orderNumero && orderNumero.startsWith('SO-')) {
    const suffix = orderNumero.replace('SO-', '');
    return `REC-${suffix}`;
  }

  if (typeof window === 'undefined') {
    return `REC-${Date.now().toString().slice(-4)}`;
  }

  try {
    const raw = localStorage.getItem(STORAGE_RECEIPT_COUNTER_KEY);
    let counter = raw ? parseInt(raw, 10) : 0;
    if (isNaN(counter) || counter < 0) {
      counter = 0;
    }
    counter += 1;
    localStorage.setItem(STORAGE_RECEIPT_COUNTER_KEY, counter.toString());
    const padded = String(counter).padStart(4, '0');
    return `REC-${padded}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `REC-${random}`;
  }
}

/**
 * Save receipt index record in local storage
 */
function saveReceiptRecord(record: ReceiptRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_RECEIPTS_KEY);
    const list: ReceiptRecord[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex((r) => r.orderId === record.orderId);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(STORAGE_RECEIPTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving receipt record:', err);
  }
}

/**
 * Get all stored receipt records (Module 9 admin/vendor history)
 */
export function getAllReceipts(): ReceiptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Main function: Automatically generate a receipt for an Order upon payment (statutPaiement = PAYE)
 */
export function generateReceiptForOrder(order: Order): { success: boolean; recuNumero: string; recuUrl: string } {
  const recuNumero = order.recuNumero || getNextReceiptNumber(order.numero);
  const datePaiement = order.datePaiement || new Date().toISOString();
  const recuUrl = `/recu/${order.numero}`;

  // Update order object
  order.recuNumero = recuNumero;
  order.recuUrl = recuUrl;
  order.datePaiement = datePaiement;

  // Persist updated order in localStorage
  const allOrders = getAllOrders();
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index !== -1) {
    allOrders[index].recuNumero = recuNumero;
    allOrders[index].recuUrl = recuUrl;
    allOrders[index].datePaiement = datePaiement;
    try {
      localStorage.setItem('signature_one_orders_v4', JSON.stringify(allOrders));
    } catch (e) {
      console.warn('Could not save updated order with receipt:', e);
    }
  }

  // Create receipt index record
  const record: ReceiptRecord = {
    id: `rec_${order.id}`,
    recuNumero,
    orderId: order.id,
    orderNumero: order.numero,
    clientNom: order.clientNom,
    clientTel: order.clientTel,
    total: order.total,
    modePaiement: order.modePaiement,
    typeCommande: order.typeCommande,
    datePaiement,
    recuUrl,
    itemsCount: order.items.reduce((acc, i) => acc + i.quantite, 0),
  };
  saveReceiptRecord(record);

  // NOTE : la persistance durable de `recuUrl` passe désormais par le backend
  // (service_role) — toute écriture Supabase directe depuis le navigateur est
  // supprimée (bloquée par RLS, orphanée depuis le basculement API).

  return { success: true, recuNumero, recuUrl };
}

/**
 * Format date nicely for official receipt
 */
export function formatReceiptDate(isoString?: string | Date | null): string {
  const d = isoString ? new Date(isoString) : new Date();
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Build the full A4 HTML printable document for an order
 */
export async function buildReceiptA4Html(order: Order): Promise<string> {
  const receptionInfo = getReceptionModeDetails(order.typeCommande);
  const paymentInfo = getPaymentStatusDetails(order.statutPaiement);
  const recuNum = order.recuNumero || `REC-${order.numero.replace('SO-', '')}`;
  const dateFormatted = formatReceiptDate(order.datePaiement || order.createdAt);

  // Generate verification QR code (links to order tracking)
  let qrDataUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://signature-one.vercel.app';
    const trackingUrl = `${origin}/commande?numero=${order.numero}`;
    const qrResult = await generateQRCode(trackingUrl, {
      width: 140,
      margin: 1,
      colorDark: '#1F3D2E',
      colorLight: '#FFFFFF',
    });
    qrDataUrl = qrResult.dataUrlPng;
  } catch (err) {
    console.warn('QR generation in receipt warning:', err);
  }

  const itemsRows = order.items
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #EFE9DF;">
        <td style="padding: 10px 8px; text-align: center; color: #53685C; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 700; color: #1F3D2E; font-size: 13px;">${item.product?.nom || 'Article Artisanal'}</div>
          <div style="font-size: 11px; color: #7A8B7F;">${item.product?.format || 'Format standard'}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #1F3D2E; font-size: 13px;">
          ${item.quantite}
        </td>
        <td style="padding: 10px 8px; text-align: right; color: #53685C; font-size: 13px; font-family: monospace;">
          ${item.prixUnitaire.toLocaleString('fr-FR')} F
        </td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #1F3D2E; font-size: 13px; font-family: monospace;">
          ${(item.quantite * item.prixUnitaire).toLocaleString('fr-FR')} FCFA
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Reçu Officiel ${recuNum} - Signature One</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #FAF3E8;
          color: #1F3D2E;
          padding: 20px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .a4-container {
          background: #ffffff;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          border: 1px solid #E5DDD0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #C9A24B;
          padding-bottom: 24px;
          margin-bottom: 28px;
        }
        .brand-block h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          color: #1F3D2E;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .brand-block .slogan {
          font-size: 12px;
          color: #C9A24B;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .brand-block .contact {
          font-size: 11px;
          color: #53685C;
          line-height: 1.5;
        }
        .receipt-badge-block {
          text-align: right;
        }
        .receipt-title {
          font-size: 18px;
          font-weight: 800;
          color: #1F3D2E;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .receipt-number {
          font-family: monospace;
          font-size: 16px;
          font-weight: 700;
          color: #C9A24B;
          background: #FAF3E8;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 6px;
        }
        .paid-stamp {
          display: inline-block;
          border: 2px solid #10B981;
          color: #10B981;
          font-weight: 800;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
          background: #FAF3E8;
          padding: 18px 20px;
          border-radius: 12px;
          border: 1px solid #EFE9DF;
        }
        .info-col h4 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #C9A24B;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .info-row {
          font-size: 12px;
          color: #1F3D2E;
          margin-bottom: 4px;
          display: flex;
        }
        .info-label {
          color: #53685C;
          width: 110px;
          flex-shrink: 0;
        }
        .info-val {
          font-weight: 600;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .items-table th {
          background: #1F3D2E;
          color: #FAF3E8;
          padding: 10px 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 28px;
        }
        .totals-box {
          width: 320px;
          background: #FAF3E8;
          border: 1px solid #E5DDD0;
          border-radius: 10px;
          padding: 16px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          color: #53685C;
        }
        .totals-grand {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 800;
          color: #1F3D2E;
          border-top: 2px solid #C9A24B;
          padding-top: 10px;
          margin-top: 6px;
        }
        .footer-thankyou {
          text-align: center;
          border-top: 1px dashed #E5DDD0;
          padding-top: 20px;
          margin-top: 20px;
        }
        .thankyou-msg {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-weight: 700;
          color: #1F3D2E;
          font-style: italic;
          margin-bottom: 8px;
        }
        .sub-legal {
          font-size: 10px;
          color: #7A8B7F;
          line-height: 1.4;
        }
        .qr-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #EFE9DF;
          border-radius: 8px;
          max-width: 360px;
          margin-left: auto;
          margin-right: auto;
        }
        .qr-section img {
          width: 60px;
          height: 60px;
        }
        .qr-text {
          font-size: 10px;
          color: #53685C;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="a4-container">
        
        <!-- Header -->
        <div class="header">
          <div class="brand-block">
            <h1>Signature One</h1>
            <div class="slogan">Le goût qui fait la différence</div>
            <div class="contact">
              Artisanat Gourmand & Boissons Naturelles<br>
              Lomé, Togo • Tél : +228 90 00 00 00 / +228 91 00 00 00<br>
              service@signatureone.tg • www.signatureone.tg
            </div>
          </div>
          <div class="receipt-badge-block">
            <div class="receipt-title">Reçu de Paiement</div>
            <div class="receipt-number">${recuNum}</div>
            <div>
              <span class="paid-stamp">✓ Paiement Validé</span>
            </div>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-col">
            <h4>Détails de la Commande</h4>
            <div class="info-row">
              <span class="info-label">N° Commande :</span>
              <span class="info-val" style="font-family: monospace;">${order.numero}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date & Heure :</span>
              <span class="info-val">${dateFormatted}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Type Service :</span>
              <span class="info-val">${receptionInfo.label} ${order.tableId ? `(Table #${order.tableId})` : ''}</span>
            </div>
            ${order.adresseLivraison ? `
              <div class="info-row">
                <span class="info-label">Livraison :</span>
                <span class="info-val" style="font-size: 11px;">${order.adresseLivraison}</span>
              </div>
            ` : ''}
          </div>

          <div class="info-col">
            <h4>Client & Règlement</h4>
            <div class="info-row">
              <span class="info-label">Client :</span>
              <span class="info-val">${order.clientNom}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Téléphone :</span>
              <span class="info-val">${order.clientTel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mode Paiement :</span>
              <span class="info-val">${order.modePaiement} (${paymentInfo.label})</span>
            </div>
            ${order.vendeur?.nom ? `
              <div class="info-row">
                <span class="info-label">Servi par :</span>
                <span class="info-val">${order.vendeur.nom}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="text-align: left;">Désignation Produit</th>
              <th style="width: 70px; text-align: center;">Quantité</th>
              <th style="width: 110px; text-align: right;">Prix Unit.</th>
              <th style="width: 130px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>Sous-total articles :</span>
              <span style="font-family: monospace;">${order.total.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div class="totals-row">
              <span>Frais de service / TVA :</span>
              <span style="font-family: monospace;">0 FCFA (Inclus)</span>
            </div>
            <div class="totals-grand">
              <span>TOTAL NET PAYÉ :</span>
              <span style="color: #1F3D2E;">${order.total.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

        <!-- Thank you footer -->
        <div class="footer-thankyou">
          <div class="thankyou-msg">
            "Merci d'avoir choisi Signature One — Le goût qui fait la différence."
          </div>
          <div class="sub-legal">
            Document généré numériquement faisant office de preuve officielle de règlement comptant.<br>
            Conservez ce reçu pour tout suivi ou réclamation auprès de notre service clientèle.
          </div>

          ${qrDataUrl ? `
            <div class="qr-section">
              <img src="${qrDataUrl}" alt="QR Vérification" />
              <div class="qr-text">
                <strong>Authenticité & Suivi</strong><br>
                Scannez pour consulter l'état de votre commande en direct.
              </div>
            </div>
          ` : ''}
        </div>

      </div>

      <script>
        window.onload = function() {
          // Check if auto-print parameter is passed
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('print') === 'true') {
            window.print();
          }
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Open official A4 receipt printable window
 */
export async function printReceiptA4(order: Order): Promise<void> {
  if (typeof window === 'undefined') return;

  // Make sure receipt attributes are generated
  if (!order.recuNumero || !order.recuUrl) {
    generateReceiptForOrder(order);
  }

  const html = await buildReceiptA4Html(order);
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer le reçu.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Trigger print once rendered
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Download receipt as HTML / printable PDF document
 */
export async function downloadReceiptPdf(order: Order): Promise<void> {
  if (typeof window === 'undefined') return;

  // Make sure receipt is generated
  if (!order.recuNumero || !order.recuUrl) {
    generateReceiptForOrder(order);
  }

  const recuNum = order.recuNumero || `REC-${order.numero.replace('SO-', '')}`;
  const html = await buildReceiptA4Html(order);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Recu_${recuNum}_${order.numero}_SignatureOne.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
