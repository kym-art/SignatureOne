import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Check, Filter, Info, ArrowLeft, Search, Star, AlertCircle, ShoppingCart, Coffee, Store, Truck, SlidersHorizontal } from 'lucide-react';
import { getActiveProducts, subscribeProducts, DEFAULT_PRODUCT_IMAGES } from '../../lib/products';
import { useCart } from '../../lib/CartContext';
import { Product, TypeCommande } from '../../types';
import { BoutiqueEntryChoice } from './BoutiqueEntryChoice';

interface BoutiqueViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  initialModeChoice?: boolean;
}

export const BoutiqueView: React.FC<BoutiqueViewProps> = ({ onBack, onNavigate, initialModeChoice = false }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEntryChoice, setShowEntryChoice] = useState<boolean>(initialModeChoice);
  const [activeReceptionMode, setActiveReceptionMode] = useState<TypeCommande | null>(null);
  const [activeTableLabel, setActiveTableLabel] = useState<string | null>(null);
  const { addItem, openCart, totalCount, totalAmount } = useCart();
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(getActiveProducts());
    const unsub = subscribeProducts(() => {
      setProducts(getActiveProducts());
    });
    return unsub;
  }, []);

  const handleSelectMode = (mode: TypeCommande, tableId?: string) => {
    setActiveReceptionMode(mode);
    setActiveTableLabel(tableId || null);
    setShowEntryChoice(false);
  };

  const handleAddToCart = (product: Product) => {
    if (!product.disponible) return;

    addItem(product, 1);
    setLastAddedId(product.id);
    setTimeout(() => {
      setLastAddedId(null);
    }, 1200);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.format.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'degue') {
      return product.nom.toLowerCase().includes('dèguè') || product.nom.toLowerCase().includes('degue');
    }
    if (selectedCategory === 'yaourt') {
      return product.nom.toLowerCase().includes('yaourt');
    }
    if (selectedCategory === 'boissons') {
      return (
        product.nom.toLowerCase().includes('bissap') ||
        product.nom.toLowerCase().includes('gnamakoudji') ||
        product.nom.toLowerCase().includes('jus') ||
        product.nom.toLowerCase().includes('boisson')
      );
    }
    if (selectedCategory === 'featured') {
      return product.misEnAvant;
    }
    return true;
  });

  if (showEntryChoice) {
    return (
      <div id="boutique-view-container" className="space-y-6 pb-16">
        <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
          <button
            onClick={onBack}
            className="text-[#53685C] hover:text-[#1F3D2E] p-1.5 -ml-1 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Accueil</span>
          </button>
          <button
            onClick={() => setShowEntryChoice(false)}
            className="text-xs text-[#1F3D2E] font-semibold hover:underline"
          >
            Accéder directement au catalogue →
          </button>
        </div>

        <BoutiqueEntryChoice
          onSelectMode={handleSelectMode}
          onExploreDirectly={() => setShowEntryChoice(false)}
        />
      </div>
    );
  }

  return (
    <div id="boutique-view-container" className="space-y-6 pb-16">
      
      {/* Top Banner with Brand Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5DDD0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={onBack}
              className="text-[#53685C] hover:text-[#1F3D2E] p-1 -ml-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30 font-mono px-2 py-0.5 rounded font-medium">
              Catalogue Produits • Signature One
            </span>
            {activeReceptionMode && (
              <span className="text-[10px] bg-[#1F3D2E] text-[#FAF3E8] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                {activeReceptionMode === 'SUR_PLACE' && <Coffee className="w-3 h-3 text-[#C9A24B]" />}
                {activeReceptionMode === 'RETRAIT' && <Store className="w-3 h-3 text-[#C9A24B]" />}
                {activeReceptionMode === 'LIVRAISON' && <Truck className="w-3 h-3 text-[#C9A24B]" />}
                <span>
                  {activeReceptionMode === 'SUR_PLACE' && (activeTableLabel || 'Sur place')}
                  {activeReceptionMode === 'RETRAIT' && 'À emporter'}
                  {activeReceptionMode === 'LIVRAISON' && 'Livraison'}
                </span>
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F3D2E]">
            Boutique & Vente à Emporter
          </h1>
          <p className="text-xs text-[#53685C] mt-1">
            Dèguè artisanal frais du jour, yaourts onctueux pur lait et boissons naturelles
          </p>
        </div>

        {/* Mode Switcher & Floating Cart Indicator */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowEntryChoice(true)}
            title="Modifier le mode de commande"
            className="flex items-center gap-1.5 bg-[#FAF3E8] hover:bg-stone-200 text-[#1F3D2E] border border-[#E5DDD0] px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9A24B]" />
            <span className="hidden sm:inline">Mode dégustation</span>
          </button>

          <button
            onClick={openCart}
            className="flex items-center gap-2.5 bg-[#FAF3E8] hover:bg-[#1F3D2E] text-[#1F3D2E] hover:text-[#FAF3E8] border border-[#E5DDD0] px-4 py-2.5 rounded-xl text-xs shadow-xs transition-colors group cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-[#C9A24B]" />
            <div>
              <span className="font-semibold">Panier : </span>
              <span className="font-bold text-[#C9A24B] group-hover:text-[#FAF3E8]">
                {totalCount} article{totalCount > 1 ? 's' : ''}
              </span>
            </div>
            {totalAmount > 0 && (
              <span className="text-[11px] font-mono font-bold bg-[#1F3D2E] group-hover:bg-[#FAF3E8] text-[#FAF3E8] group-hover:text-[#1F3D2E] px-2 py-0.5 rounded-md ml-1 transition-colors">
                {totalAmount.toLocaleString('fr-FR')} F
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Category buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
            }`}
          >
            Tous les produits ({products.length})
          </button>
          <button
            onClick={() => setSelectedCategory('degue')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'degue'
                ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
            }`}
          >
            Dèguè Artisanal
          </button>
          <button
            onClick={() => setSelectedCategory('yaourt')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'yaourt'
                ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
            }`}
          >
            Yaourts Brassés
          </button>
          <button
            onClick={() => setSelectedCategory('boissons')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'boissons'
                ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
            }`}
          >
            Boissons & Infusions
          </button>
          <button
            onClick={() => setSelectedCategory('featured')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'featured'
                ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                : 'bg-white text-[#C9A24B] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
            }`}
          >
            <Star className="w-3 h-3 fill-[#C9A24B]" />
            <span>Sélection Signature</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher une saveur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
          />
        </div>

      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E5DDD0] space-y-2">
          <p className="font-serif text-base text-[#1F3D2E] font-bold">Aucun produit trouvé</p>
          <p className="text-xs text-[#53685C]">Essayez une autre recherche ou catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isJustAdded = lastAddedId === product.id;

            return (
              <div
                key={product.id}
                className="bg-white border border-[#E5DDD0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Photo Top Container */}
                <div>
                  <div className="relative h-48 sm:h-52 w-full bg-[#FAF3E8] overflow-hidden">
                    <img
                      src={product.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                      alt={product.nom}
                      className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
                        !product.disponible ? 'grayscale-50 opacity-80' : ''
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                      }}
                    />

                    {/* Format Badge Top Left */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[11px] font-semibold text-[#1F3D2E] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs border border-[#E5DDD0]">
                        {product.format}
                      </span>
                    </div>

                    {/* Featured Star or Availability Top Right */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      {product.misEnAvant && (
                        <span className="text-[10px] font-semibold text-[#1F3D2E] bg-[#FAF3E8]/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-[#C9A24B]/40 flex items-center gap-1 shadow-xs">
                          <Star className="w-3 h-3 fill-[#C9A24B] text-[#C9A24B]" />
                          <span>Populaire</span>
                        </span>
                      )}

                      {!product.disponible && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-red-800/90 backdrop-blur-xs px-2 py-0.5 rounded-lg shadow-xs">
                          Indisponible
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2">
                    <h3 className="font-serif font-bold text-lg text-[#1F3D2E] leading-snug">
                      {product.nom}
                    </h3>
                    <p className="text-xs text-[#53685C] leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Price & Action Footer */}
                <div className="p-5 pt-3 border-t border-[#EFE9DF] flex items-center justify-between gap-3 bg-white">
                  <div>
                    <span className="text-[10px] text-[#53685C] block">Prix unitaire</span>
                    <span className="font-serif font-bold text-lg text-[#1F3D2E]">
                      {product.prix.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                    </span>
                  </div>

                  {product.disponible ? (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                        isJustAdded
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8]'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Ajouté !</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
                          <span>Ajouter</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-stone-100 text-stone-400 text-xs font-medium px-3.5 py-2.5 rounded-xl cursor-not-allowed border border-stone-200"
                    >
                      Actuellement indisponible
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Catalogue Information banner */}
      <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] text-xs text-[#53685C] flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-[#C9A24B] shrink-0 mt-0.5" />
        <span>
          <strong>Catalogue :</strong> Les produits affichés proviennent du catalogue dynamique.
          Les modifications et ajustements de prix effectués dans l'espace <code>(admin)</code> sont immédiatement répercutés ici.
        </span>
      </div>

    </div>
  );
};
