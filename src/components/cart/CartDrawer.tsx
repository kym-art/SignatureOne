import React from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Sparkles, Store } from 'lucide-react';
import { useCart } from '../../lib/CartContext';
import { DEFAULT_PRODUCT_IMAGES } from '../../lib/products';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  onExploreProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onProceedToCheckout,
  onExploreProducts,
}) => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalCount, isCartOpen, closeCart } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF3E8] text-[#1F3D2E] shadow-2xl flex flex-col justify-between border-l border-[#E5DDD0] animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1F3D2E] text-[#FAF3E8] flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4 text-[#C9A24B]" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-[#1F3D2E]">Mon Panier</h2>
                <p className="text-xs text-[#53685C]">
                  {totalCount} article{totalCount > 1 ? 's' : ''} sélectionné{totalCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  title="Vider le panier"
                  className="text-[11px] text-red-700 hover:text-red-900 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Vider
                </button>
              )}
              <button
                onClick={closeCart}
                className="p-2 rounded-xl text-[#53685C] hover:text-[#1F3D2E] hover:bg-[#FAF3E8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-white border border-[#E5DDD0] flex items-center justify-center text-[#53685C] shadow-xs">
                  <ShoppingBag className="w-8 h-8 text-[#C9A24B]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Votre panier est vide</h3>
                  <p className="text-xs text-[#53685C] max-w-xs">
                    Découvrez nos recettes artisanales de dèguè, yaourts brassés pur lait et boissons fraîches.
                  </p>
                </div>
                <button
                  onClick={() => {
                    closeCart();
                    onExploreProducts();
                  }}
                  className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-semibold px-5 py-3 rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <Store className="w-4 h-4 text-[#C9A24B]" />
                  <span>Découvrir la boutique</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ product, quantite }) => {
                  const itemSubtotal = product.prix * quantite;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl p-3.5 border border-[#E5DDD0] shadow-xs flex gap-3 items-center justify-between"
                    >
                      {/* Product Photo */}
                      <div className="w-16 h-16 rounded-xl bg-[#FAF3E8] overflow-hidden shrink-0 border border-[#E5DDD0]">
                        <img
                          src={product.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                          alt={product.nom}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                          }}
                        />
                      </div>

                      {/* Info & Quantity controls */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1F3D2E] truncate">
                            {product.nom}
                          </h4>
                          <button
                            onClick={() => removeItem(product.id)}
                            className="text-stone-400 hover:text-red-700 p-1 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[10px] text-[#53685C] block">
                          Format : {product.format}
                        </span>

                        <div className="flex items-center justify-between pt-1">
                          {/* Quantity Counter */}
                          <div className="flex items-center gap-2 bg-[#FAF3E8] rounded-lg p-1 border border-[#E5DDD0]">
                            <button
                              onClick={() => updateQuantity(product.id, quantite - 1)}
                              className="w-6 h-6 rounded-md bg-white text-[#1F3D2E] flex items-center justify-center hover:bg-stone-100 transition-colors shadow-2xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center font-mono text-[#1F3D2E]">
                              {quantite}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantite + 1)}
                              className="w-6 h-6 rounded-md bg-white text-[#1F3D2E] flex items-center justify-center hover:bg-stone-100 transition-colors shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Item Subtotal */}
                          <div className="text-right">
                            <span className="font-serif font-bold text-sm text-[#1F3D2E]">
                              {itemSubtotal.toLocaleString('fr-FR')}{' '}
                              <span className="text-[10px] font-normal text-[#C9A24B]">FCFA</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-5 sm:p-6 bg-white border-t border-[#E5DDD0] space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#53685C]">
                  <span>Sous-total ({totalCount} articles)</span>
                  <span className="font-semibold text-[#1F3D2E]">
                    {totalAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between font-serif font-bold text-base sm:text-lg text-[#1F3D2E] pt-2 border-t border-[#EFE9DF]">
                  <span>Total à régler</span>
                  <span className="text-[#1F3D2E]">
                    {totalAmount.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  id="btn-cart-proceed-checkout"
                  onClick={() => {
                    closeCart();
                    onProceedToCheckout();
                  }}
                  className="w-full bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Passer la commande</span>
                  <ArrowRight className="w-4 h-4 text-[#C9A24B]" />
                </button>

                <button
                  onClick={closeCart}
                  className="w-full text-center text-xs font-semibold text-[#53685C] hover:text-[#1F3D2E] py-2 transition-colors"
                >
                  Continuer les achats
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
