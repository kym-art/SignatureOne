import React, { useState, useEffect } from 'react';
import { QrCode, ArrowLeft, Utensils, CheckCircle, Info, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { getActiveProducts, subscribeProducts, DEFAULT_PRODUCT_IMAGES } from '../../lib/products';
import { useCart } from '../../lib/CartContext';
import { Product } from '../../types';

interface TableQRViewProps {
  tableNumber?: number;
  onBack: () => void;
  onProceedToCheckout?: (tableNumber: number) => void;
}

const AVAILABLE_TABLES = [1, 2, 3, 4, 5, 6, 7, 8];

export const TableQRView: React.FC<TableQRViewProps> = ({
  tableNumber = 3,
  onBack,
  onProceedToCheckout,
}) => {
  const [activeTable, setActiveTable] = useState<number>(tableNumber);
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem, items, totalAmount, openCart } = useCart();
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(getActiveProducts());
    const unsub = subscribeProducts(() => {
      setProducts(getActiveProducts());
    });
    return unsub;
  }, []);

  const handleAddProduct = (product: Product) => {
    if (!product.disponible) return;
    addItem(product, 1);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 1200);
  };

  return (
    <div id="table-qr-view-container" className="space-y-6 pb-16">
      
      {/* Table Header Banner */}
      <div className="bg-[#1F3D2E] text-[#FAF3E8] p-6 rounded-3xl border border-[#C9A24B]/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onBack}
              className="text-[#FAF3E8]/80 hover:text-white p-1 -ml-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] bg-[#FAF3E8]/10 text-[#C9A24B] border border-[#C9A24B]/30 font-mono px-2 py-0.5 rounded">
              Commande sur table
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#C9A24B] text-[#1F3D2E] flex items-center justify-center font-serif font-bold text-xl shadow-xs">
              #{activeTable}
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#FAF3E8]">
                Commande sur Table (QR Code)
              </h1>
              <p className="text-xs text-[#FAF3E8]/80">
                Table numéro {activeTable} • Signature One Salon
              </p>
            </div>
          </div>
        </div>

        {/* Table Selector for testing */}
        <div className="flex items-center gap-1.5 bg-[#FAF3E8]/10 p-1.5 rounded-2xl border border-[#C9A24B]/30">
          <span className="text-[11px] text-[#FAF3E8]/80 px-2 font-medium">Changer table :</span>
          {AVAILABLE_TABLES.map((num) => (
            <button
              key={num}
              onClick={() => setActiveTable(num)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                activeTable === num
                  ? 'bg-[#C9A24B] text-[#1F3D2E] shadow-xs'
                  : 'text-[#FAF3E8] hover:bg-[#FAF3E8]/20'
              }`}
            >
              #{num}
            </button>
          ))}
        </div>
      </div>

      {/* Menu for in-place ordering */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-[#1F3D2E] flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#C9A24B]" />
              <span>Menu de dégustation pour la Table #{activeTable}</span>
            </h2>
            <span className="text-xs text-[#53685C]">{products.length} produits disponibles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => {
              const isAdded = recentlyAddedId === p.id;
              const cartItem = items.find((i) => i.product.id === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#E5DDD0] rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[#FAF3E8] overflow-hidden shrink-0 border border-[#E5DDD0]">
                      <img
                        src={p.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                        alt={p.nom}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                        }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] border border-[#E5DDD0] px-2 py-0.5 rounded font-medium">
                          {p.format}
                        </span>
                        <span className="text-xs font-serif font-bold text-[#1F3D2E]">
                          {p.prix.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-sm text-[#1F3D2E] truncate">{p.nom}</h3>
                      <p className="text-[11px] text-[#53685C] line-clamp-2">{p.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EFE9DF] flex items-center justify-between">
                    <span className="text-[11px] text-[#53685C]">
                      Dans votre panier : <strong>{cartItem?.quantite || 0}</strong>
                    </span>
                    {p.disponible ? (
                      <button
                        onClick={() => handleAddProduct(p)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                          isAdded
                            ? 'bg-emerald-800 text-white'
                            : 'bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8]'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>{isAdded ? 'Ajouté !' : 'Ajouter'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-lg">
                        Indisponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary for Table */}
        <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-4 h-fit sticky top-24">
          <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
              Addition Table #{activeTable}
            </h3>
            <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
              SUR_PLACE
            </span>
          </div>

          <div className="space-y-2 text-xs max-h-56 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-[#53685C] italic py-6 text-center">
                Aucun article sélectionné dans le panier
              </p>
            ) : (
              items.map(({ product, quantite }) => (
                <div key={product.id} className="flex items-center justify-between text-[#1F3D2E]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-[11px] bg-[#FAF3E8] px-1.5 py-0.5 rounded border border-[#E5DDD0]">
                      {quantite}x
                    </span>
                    <span className="truncate">{product.nom}</span>
                  </div>
                  <span className="font-serif font-bold shrink-0">
                    {(product.prix * quantite).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#EFE9DF] pt-3 flex items-center justify-between">
            <span className="font-bold text-[#1F3D2E] text-sm">Total Commande :</span>
            <span className="font-serif font-bold text-lg text-[#1F3D2E]">
              {totalAmount.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
            </span>
          </div>

          <button
            id="btn-table-checkout"
            disabled={items.length === 0}
            onClick={() => onProceedToCheckout && onProceedToCheckout(activeTable)}
            className="w-full bg-[#1F3D2E] disabled:bg-stone-200 disabled:text-stone-400 hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Passer la commande Table #{activeTable}</span>
            <ArrowRight className="w-4 h-4 text-[#C9A24B]" />
          </button>
        </div>

      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E5DDD0] text-xs text-[#53685C] flex items-start gap-2.5 shadow-xs">
        <Info className="w-4 h-4 text-[#C9A24B] shrink-0 mt-0.5" />
        <span>
          <strong>Tunnel Sur Place :</strong> En validant la commande pour la table #{activeTable},
          le mode de réception sur place et le numéro de table sont automatiquement transmis et enregistrés dans la commande.
        </span>
      </div>
    </div>
  );
};
