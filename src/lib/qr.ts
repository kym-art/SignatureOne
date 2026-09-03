/**
 * Signature One - Module 6: QR Code Generator & Exporter
 * Generates PNG Data URLs and SVGs for Boutique & Table QR codes
 */

import QRCode from 'qrcode';

export interface QRCodeData {
  url: string;
  dataUrlPng: string;
  svgString: string;
}

export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://signature-one.vercel.app';
}

/**
 * Returns the direct URL for the Boutique Entry Point (Choice: Sur place vs À emporter)
 */
export function getBoutiqueQRUrl(baseUrl?: string): string {
  const base = baseUrl || getAppBaseUrl();
  return `${base}/boutique`;
}

/**
 * Returns the direct URL for a specific Table QR Code
 */
export function getTableQRUrl(tableNumero: number, baseUrl?: string): string {
  const base = baseUrl || getAppBaseUrl();
  return `${base}/t/${tableNumero}`;
}

/**
 * Generates both PNG data URL and SVG string for a given payload URL
 */
export async function generateQRCode(
  url: string,
  options?: {
    colorDark?: string;
    colorLight?: string;
    width?: number;
    margin?: number;
  }
): Promise<QRCodeData> {
  const colorDark = options?.colorDark || '#1F3D2E'; // Signature One Forest Green
  const colorLight = options?.colorLight || '#FAF3E8'; // Signature One Warm Cream
  const width = options?.width || 512;
  const margin = options?.margin || 2;

  try {
    const dataUrlPng = await QRCode.toDataURL(url, {
      width,
      margin,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    });

    const svgString = await QRCode.toString(url, {
      type: 'svg',
      margin,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    });

    return {
      url,
      dataUrlPng,
      svgString,
    };
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Helper to download a PNG image file
 */
export function downloadQRCodePng(dataUrl: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper to download an SVG file
 */
export function downloadQRCodeSvg(svgString: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to open printable window for a QR code / Chevalet de table
 */
export function printChevaletCard(tableNumber: number, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour imprimer le chevalet de table.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Chevalet de Table #${tableNumber} - Signature One</title>
      <style>
        @page {
          size: A6 portrait;
          margin: 10mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #FAF3E8;
          color: #1F3D2E;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .card {
          background: #ffffff;
          border: 3px solid #C9A24B;
          border-radius: 24px;
          padding: 30px;
          text-align: center;
          max-width: 320px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .brand {
          font-size: 20px;
          font-weight: bold;
          font-family: Georgia, serif;
          color: #1F3D2E;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .sub {
          font-size: 11px;
          color: #53685C;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }
        .table-pill {
          display: inline-block;
          background: #1F3D2E;
          color: #FAF3E8;
          font-size: 16px;
          font-weight: bold;
          padding: 6px 18px;
          border-radius: 30px;
          margin-bottom: 16px;
        }
        .qr-img {
          width: 200px;
          height: 200px;
          border-radius: 16px;
          border: 1px solid #E5DDD0;
          margin: 0 auto 16px auto;
          display: block;
        }
        .instructions {
          font-size: 13px;
          font-weight: 600;
          color: #1F3D2E;
          line-height: 1.4;
          margin-bottom: 4px;
        }
        .hint {
          font-size: 10px;
          color: #53685C;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">Signature One</div>
        <div class="sub">Dèguè • Yaourt • Boissons</div>
        <div class="table-pill">TABLE #${tableNumber}</div>
        <img class="qr-img" src="${dataUrl}" alt="QR Table #${tableNumber}" />
        <div class="instructions">Scannez pour commander sur place</div>
        <div class="hint">Vos articles seront directement servis à cette table.</div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
