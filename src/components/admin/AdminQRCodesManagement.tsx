import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
  Store,
  Coffee,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { TableQR } from '../../types';
import {
  getAllTables,
  createTable,
  deleteTable,
  subscribeTables
} from '../../lib/tables';
import {
  generateQRCode,
  getBoutiqueQRUrl,
  getTableQRUrl,
  downloadQRCodePng,
  downloadQRCodeSvg,
  printChevaletCard,
  QRCodeData
} from '../../lib/qr';

export const AdminQRCodesManagement: React.FC = () => {
  const [tables, setTables] = useState<TableQR[]>(getAllTables());
  const [newTableNumber, setNewTableNumber] = useState<number>(() => {
    const current = getAllTables();
    return current.length > 0 ? Math.max(...current.map((t) => t.numero)) + 1 : 1;
  });
  
  const [boutiqueQR, setBoutiqueQR] = useState<QRCodeData | null>(null);
  const [tableQRs, setTableQRs] = useState<Record<number, QRCodeData>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Subscribe to table updates
  useEffect(() => {
    setTables(getAllTables());
    const unsub = subscribeTables(() => {
      setTables(getAllTables());
    });
    return unsub;
  }, []);

  // Generate QR codes for boutique and all tables
  useEffect(() => {
    let isMounted = true;

    async function loadAllQRCodes() {
      setIsGenerating(true);
      try {
        // 1. Boutique QR
        const bUrl = getBoutiqueQRUrl();
        const bQR = await generateQRCode(bUrl);
        if (isMounted) setBoutiqueQR(bQR);

        // 2. Tables QRs
        const tableMap: Record<number, QRCodeData> = {};
        for (const t of tables) {
          const tUrl = getTableQRUrl(t.numero);
          const tQR = await generateQRCode(tUrl);
          tableMap[t.numero] = tQR;
        }
        if (isMounted) {
          setTableQRs(tableMap);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Error generating QRs:', err);
        if (isMounted) setIsGenerating(false);
      }
    }

    loadAllQRCodes();

    return () => {
      isMounted = false;
    };
  }, [tables]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const res = createTable(Number(newTableNumber));
    if (res.success) {
      setFeedbackMessage(`Table #${newTableNumber} créée avec succès.`);
      setNewTableNumber((prev) => prev + 1);
    } else {
      setFeedbackMessage(res.error || 'Erreur lors de la création de la table.');
    }
  };

  const handleDeleteTable = (id: string, num: number) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la Table #${num} ?`)) {
      const res = deleteTable(id);
      if (res.success) {
        setFeedbackMessage(`Table #${num} supprimée.`);
      }
    }
  };

  const handleCopyUrl = (url: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handlePrintAllChevalets = () => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer les chevalets.');
      return;
    }

    const cardsHtml = tables
      .map((t) => {
        const qr = tableQRs[t.numero];
        if (!qr) return '';
        return `
          <div class="card">
            <div class="brand">Signature One</div>
            <div class="sub">Dèguè • Yaourt • Boissons</div>
            <div class="table-pill">TABLE #${t.numero}</div>
            <img class="qr-img" src="${qr.dataUrlPng}" alt="QR Table #${t.numero}" />
            <div class="instructions">Scannez pour commander sur place</div>
            <div class="hint">Vos articles seront directement servis à cette table.</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Tous les Chevalets de Table - Signature One</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAF3E8;
            color: #1F3D2E;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .card {
            background: #ffffff;
            border: 3px solid #C9A24B;
            border-radius: 20px;
            padding: 24px;
            text-align: center;
            width: 260px;
            box-sizing: border-box;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          .brand {
            font-size: 18px;
            font-weight: bold;
            font-family: Georgia, serif;
            color: #1F3D2E;
            margin-bottom: 2px;
          }
          .sub {
            font-size: 9px;
            color: #53685C;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }
          .table-pill {
            display: inline-block;
            background: #1F3D2E;
            color: #FAF3E8;
            font-size: 14px;
            font-weight: bold;
            padding: 4px 14px;
            border-radius: 20px;
            margin-bottom: 12px;
          }
          .qr-img {
            width: 160px;
            height: 160px;
            border-radius: 12px;
            border: 1px solid #E5DDD0;
            margin: 0 auto 12px auto;
            display: block;
          }
          .instructions {
            font-size: 12px;
            font-weight: 600;
            color: #1F3D2E;
            line-height: 1.3;
            margin-bottom: 4px;
          }
          .hint {
            font-size: 9px;
            color: #53685C;
          }
        </style>
      </head>
      <body>
        ${cardsHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="admin-qr-codes-container" className="space-y-8">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Codes Boutique & Tables</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Génération & Export des QR Codes
          </h2>
          <p className="text-xs text-[#53685C]">
            Générez, téléchargez en HD (PNG/SVG) et imprimez les QR codes physiques pour le comptoir et les tables du salon.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintAllChevalets}
          className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#C9A24B]" />
          <span>Imprimer Tous les Chevalets (A4)</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* SECTION 1: QR CODE BOUTIQUE */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-[#EFE9DF] pb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30 flex items-center justify-center">
            <Store className="w-5 h-5 text-[#C9A24B]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
              1. QR Code Boutique (Point d'Entrée Global)
            </h3>
            <p className="text-xs text-[#53685C]">
              Pointe vers la route <code>/boutique</code>. Affiche le sélecteur « Sur place » / « À emporter » / « Livraison ».
            </p>
          </div>
        </div>

        {boutiqueQR ? (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-[#FAF3E8] p-3 rounded-2xl border border-[#E5DDD0] shrink-0">
              <img
                src={boutiqueQR.dataUrlPng}
                alt="QR Code Boutique Signature One"
                className="w-44 h-44 rounded-xl border border-white shadow-2xs"
              />
            </div>

            <div className="space-y-3 flex-1 text-xs">
              <div>
                <span className="text-[10px] text-[#53685C] uppercase tracking-wider block">
                  URL de destination
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-[#1F3D2E] bg-[#FAF3E8] px-3 py-1.5 rounded-lg border border-[#E5DDD0] text-xs">
                    {boutiqueQR.url}
                  </span>
                  <button
                    onClick={() => handleCopyUrl(boutiqueQR.url)}
                    className="p-1.5 bg-white border border-[#E5DDD0] rounded-lg hover:bg-stone-100 text-[#1F3D2E]"
                    title="Copier le lien"
                  >
                    {copiedUrl === boutiqueQR.url ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => downloadQRCodePng(boutiqueQR.dataUrlPng, 'signature_one_qr_boutique')}
                  className="px-3 py-2 bg-[#1F3D2E] text-[#FAF3E8] rounded-xl font-semibold flex items-center gap-1.5 hover:bg-[#2A4D3B] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Télécharger PNG (HD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadQRCodeSvg(boutiqueQR.svgString, 'signature_one_qr_boutique')}
                  className="px-3 py-2 bg-white border border-[#E5DDD0] text-[#1F3D2E] rounded-xl font-semibold flex items-center gap-1.5 hover:bg-[#FAF3E8] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Télécharger SVG Vectoriel</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#53685C]">Génération du QR Code Boutique...</div>
        )}
      </div>

      {/* SECTION 2: QR CODES TABLES */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE9DF] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#C9A24B]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                2. QR Codes des Tables (Modèle TableQR)
              </h3>
              <p className="text-xs text-[#53685C]">
                Chaque QR code pointe vers <code>/t/[tableId]</code> et verrouille automatiquement la table dans la commande.
              </p>
            </div>
          </div>

          {/* Form to add table */}
          <form onSubmit={handleAddTable} className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="99"
              required
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(Number(e.target.value))}
              placeholder="Table #"
              className="w-24 px-3 py-2 bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl text-xs font-mono font-bold text-[#1F3D2E] text-center"
            />
            <button
              type="submit"
              className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>Ajouter Table</span>
            </button>
          </form>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tables.map((t) => {
            const qr = tableQRs[t.numero];
            const directUrl = getTableQRUrl(t.numero);

            return (
              <div
                key={t.id}
                className="bg-[#FAF3E8]/50 border border-[#E5DDD0] rounded-2xl p-4 flex flex-col items-center justify-between text-center space-y-3 relative group hover:border-[#C9A24B] transition-all"
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-serif font-bold text-xs bg-[#1F3D2E] text-[#FAF3E8] px-2.5 py-0.5 rounded-full shadow-2xs">
                    Table #{t.numero}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteTable(t.id, t.numero)}
                    title="Supprimer la table"
                    className="text-[#53685C] hover:text-red-700 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* QR Image */}
                {qr ? (
                  <div className="bg-white p-2 rounded-xl border border-[#E5DDD0] shadow-2xs">
                    <img
                      src={qr.dataUrlPng}
                      alt={`QR Table ${t.numero}`}
                      className="w-28 h-28 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-stone-100 rounded-lg flex items-center justify-center text-[10px] text-stone-400">
                    Chargement...
                  </div>
                )}

                {/* Direct Link */}
                <div className="text-[10px] font-mono text-[#53685C] truncate max-w-full">
                  /t/{t.numero}
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-1.5 w-full pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => qr && downloadQRCodePng(qr.dataUrlPng, `signature_one_table_${t.numero}`)}
                    className="py-1.5 px-2 bg-white border border-[#E5DDD0] rounded-lg font-semibold text-[#1F3D2E] hover:bg-[#FAF3E8] transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3 text-[#C9A24B]" />
                    <span>PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => qr && printChevaletCard(t.numero, qr.dataUrlPng)}
                    className="py-1.5 px-2 bg-[#1F3D2E] text-[#FAF3E8] rounded-lg font-semibold hover:bg-[#2A4D3B] transition-colors flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3 h-3 text-[#C9A24B]" />
                    <span>Chevalet</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
