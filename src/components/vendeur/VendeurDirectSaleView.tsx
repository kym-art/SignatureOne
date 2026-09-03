import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Banknote,
  Smartphone,
  Store,
  Coffee,
  Truck,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Printer
} from 'lucide-react';
import { getActiveProducts } from '../../lib/products';
import { createDirectSale } from '../../lib/orders';
import { getCurrentUser } from '../../lib/auth';
import { getAllTables } from '../../lib/tables';
import { Product, TypeCommande, ModePaiement, Order } from '../../types';
import { VendeurReceiptModal } from './VendeurReceiptModal';

interface VendeurDirectSaleViewProps {
  onSaleCompleted?: (order: Order) => void;
}

export const VendeurDirectSaleView: React.FC<VendeurDirectSaleViewProps> = ({ onSaleCompleted }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantite: number }[]>([]);
  const [typeCommande, setTypeCommande] = useState<TypeCommande>('RETRAIT');
  const [selectedTable, setSelectedTable] = useState<string>('Table #1');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('SUR_PLACE');
  const [clientNom, setClientNom] = useState<string>('');
  const [clientTel, setClientTel] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const currentUser = getCurrentUser();
  const tables = getAllTables();

  useEffect(() => {
    setProducts(getActiveProducts());
  }, []);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantite += 1;
        return next;
      }
      return [...prev, { product, quantite: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantite + delta;
            return nextQty > 0 ? { ...item, quantite: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantite: number }[];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.prix * item.quantite, 0);

  const handleValidateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Le panier est vide. Sélectionnez au moins un article.' });
      return;
    }

    if (!currentUser) {
      setFeedback({ type: 'error', message: 'Session vendeur invalide. Veuillez vous reconnecter.' });
      return;
    }

    const saleRes = await createDirectSale({
      vendorId: currentUser.id,
      vendorName: currentUser.nom,
      clientNom: clientNom.trim() || 'Client Comptoir',
      clientTel: clientTel.trim() || '+228 90 00 00 00',
      typeCommande,
      tableId: typeCommande === 'SUR_PLACE' ? selectedTable : null,
      modePaiement,
      items: cart.map((i) => ({
        productId: i.product.id,
        quantite: i.quantite,
        prixUnitaire: i.product.prix,
      })),
    });

    if (saleRes.success && saleRes.order) {
      setLastCreatedOrder(saleRes.order);
      setIsReceiptOpen(true);
      setCart([]);
      setClientNom('');
      setClientTel('');
      setFeedback({
        type: 'success',
        message: `Vente ${saleRes.order.numero} enregistrée avec succès (${saleRes.order.total.toLocaleString('fr-FR')} FCFA).`,
      });
      if (onSaleCompleted) {
        onSaleCompleted(saleRes.order);
      }
    } else {
      setFeedback({ type: 'error', message: saleRes.error || "Erreur lors de l'enregistrement de la vente." });
    }
  };

  return (
    <div id="vendeur-direct-sale-container" className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <Store className="w-3.5 h-3.5" />
            <span>Caisse Express & Vente Directe Comptoir</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Nouvelle Vente au Comptoir
          </h2>
          <p className="text-xs text-[#53685C]">
            Enregistrez une vente immédiate, encaissez le client et générez le ticket de caisse en un clic.
          </p>
        </div>

        <div className="text-xs bg-[#FAF3E8] border border-[#C9A24B]/30 px-3.5 py-2 rounded-2xl text-[#1F3D2E]">
          Vendeur Responsable : <strong>{currentUser?.nom || 'Vendeur'}</strong>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Products Grid (POS Left) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-serif font-bold text-sm text-[#1F3D2E] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#C9A24B]" />
            <span>Sélectionner les Produits</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => {
              const inCartItem = cart.find((i) => i.product.id === p.id);
              const qtyInCart = inCartItem ? inCartItem.quantite : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left space-y-2 select-none ${
                    qtyInCart > 0
                      ? 'bg-white border-[#1F3D2E] ring-2 ring-[#1F3D2E]/10 shadow-xs'
                      : 'bg-white border-[#E5DDD0] hover:border-[#C9A24B] hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-serif font-bold text-xs text-[#1F3D2E] leading-snug line-clamp-2">
                        {p.nom}
                      </h4>
                      {qtyInCart > 0 && (
                        <span className="bg-[#1F3D2E] text-[#FAF3E8] font-bold text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                          x{qtyInCart}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#53685C] block mt-0.5">{p.format}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#EFE9DF]">
                    <span className="font-serif font-bold text-xs text-[#1F3D2E]">
                      {p.prix.toLocaleString('fr-FR')} <span className="text-[9px] text-[#C9A24B]">FCFA</span>
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-[#FAF3E8] text-[#1F3D2E] hover:bg-[#1F3D2E] hover:text-[#FAF3E8] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart & Checkout (POS Right) */}
        <div className="lg:col-span-5 bg-white border border-[#E5DDD0] rounded-3xl p-5 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Panier Vente Directe
              </h3>
              <span className="text-xs text-[#53685C] font-mono">
                {cart.reduce((s, i) => s + i.quantite, 0)} articles
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#53685C] bg-[#FAF3E8]/40 rounded-2xl border border-dashed border-[#E5DDD0]">
                Cliquez sur un produit à gauche pour l'ajouter à la vente.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 divide-y divide-[#EFE9DF]">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#1F3D2E] truncate">{item.product.nom}</div>
                      <div className="text-[10px] text-[#53685C]">
                        {item.product.prix.toLocaleString('fr-FR')} F / unité
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#FAF3E8] px-2 py-1 rounded-xl border border-[#E5DDD0]">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="text-[#1F3D2E] hover:text-red-700"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs w-4 text-center text-[#1F3D2E]">
                        {item.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="text-[#1F3D2E] hover:text-emerald-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-serif font-bold text-[#1F3D2E] text-xs w-16 text-right">
                      {(item.quantite * item.product.prix).toLocaleString('fr-FR')} F
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-[#53685C] hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Type de Commande Options */}
            <div className="space-y-2 pt-2 border-t border-[#EFE9DF]">
              <label className="text-[11px] font-bold text-[#1F3D2E] block">
                Type de service :
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTypeCommande('RETRAIT')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    typeCommande === 'RETRAIT'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Emporter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeCommande('SUR_PLACE')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    typeCommande === 'SUR_PLACE'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Sur place</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeCommande('LIVRAISON')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    typeCommande === 'LIVRAISON'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Livraison</span>
                </button>
              </div>

              {typeCommande === 'SUR_PLACE' && (
                <div className="pt-2">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs font-bold text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E]"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={`Table #${t.numero}`}>
                        Table #{t.numero}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Mode de Paiement */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#1F3D2E] block">
                Mode de règlement (immédiat) :
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setModePaiement('SUR_PLACE')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    modePaiement === 'SUR_PLACE'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Espèces</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModePaiement('TMONEY')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    modePaiement === 'TMONEY'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>TMoney</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModePaiement('FLOOZ')}
                  className={`py-2 px-2 rounded-xl font-semibold border flex items-center justify-center gap-1 transition-all ${
                    modePaiement === 'FLOOZ'
                      ? 'bg-[#1F3D2E] text-[#FAF3E8] border-[#1F3D2E]'
                      : 'bg-[#FAF3E8] text-[#1F3D2E] border-[#E5DDD0]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Flooz</span>
                </button>
              </div>
            </div>

            {/* Optional Customer Infos */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <input
                  type="text"
                  placeholder="Nom client (optionnel)"
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                  className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F3D2E] outline-hidden placeholder:text-[#53685C]/60"
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Tél client (optionnel)"
                  value={clientTel}
                  onChange={(e) => setClientTel(e.target.value)}
                  className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F3D2E] outline-hidden placeholder:text-[#53685C]/60 font-mono"
                />
              </div>
            </div>

          </div>

          {/* Bottom Total & Checkout Button */}
          <div className="pt-4 border-t-2 border-dashed border-[#E5DDD0] space-y-3">
            <div className="flex items-baseline justify-between text-[#1F3D2E]">
              <span className="font-bold text-sm">Total à Encaisser</span>
              <span className="font-serif font-bold text-2xl text-[#1F3D2E]">
                {totalAmount.toLocaleString('fr-FR')}{' '}
                <span className="text-sm font-normal text-[#C9A24B]">FCFA</span>
              </span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleValidateSale}
              className="w-full bg-[#1F3D2E] hover:bg-[#2A4D3B] disabled:opacity-40 text-[#FAF3E8] font-bold text-sm py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C9A24B]" />
              <span>Valider & Encaisser Vente Directe</span>
            </button>
          </div>

        </div>

      </div>

      {/* Receipt Modal */}
      {isReceiptOpen && lastCreatedOrder && (
        <VendeurReceiptModal
          order={lastCreatedOrder}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}

    </div>
  );
};
