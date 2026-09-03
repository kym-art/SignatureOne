import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  DollarSign,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Upload,
  RefreshCw,
  Tag
} from 'lucide-react';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  updateProductPrice,
  toggleProductAvailability,
  toggleProductActive,
  toggleProductFeatured,
  deleteProduct,
  subscribeProducts,
  DEFAULT_PRODUCT_IMAGES,
} from '../../lib/products';
import { Product, CreateProductInput } from '../../types';

export const AdminProductsManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'UNAVAILABLE' | 'FEATURED'>('ALL');

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductInput>({
    nom: '',
    description: '',
    format: 'Pot 350ml',
    prix: 1500,
    photoUrl: DEFAULT_PRODUCT_IMAGES.degueNature,
    disponible: true,
    quantiteRestante: 20,
    actif: true,
    misEnAvant: false,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Quick Price Edit state
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState<number>(0);
  const [priceSuccessMsg, setPriceSuccessMsg] = useState<string | null>(null);

  // Load and subscribe
  useEffect(() => {
    setProducts(getAllProducts());
    const unsub = subscribeProducts((updated) => {
      setProducts(updated);
    });
    return unsub;
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.format.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'ACTIVE') return p.actif;
    if (filterMode === 'INACTIVE') return !p.actif;
    if (filterMode === 'UNAVAILABLE') return !p.disponible;
    if (filterMode === 'FEATURED') return p.misEnAvant;
    return true;
  });

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const res = await createProduct({
      ...createForm,
      prix: Number(createForm.prix),
      quantiteRestante: createForm.quantiteRestante ? Number(createForm.quantiteRestante) : null,
    });

    if (res.success) {
      setShowCreateModal(false);
      setCreateForm({
        nom: '',
        description: '',
        format: 'Pot 350ml',
        prix: 1500,
        photoUrl: DEFAULT_PRODUCT_IMAGES.degueNature,
        disponible: true,
        quantiteRestante: 20,
        actif: true,
        misEnAvant: false,
      });
    } else {
      setCreateError(res.error || 'Erreur lors de la création du produit.');
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError(null);

    const res = await updateProduct(editingProduct.id, {
      nom: editingProduct.nom,
      description: editingProduct.description,
      format: editingProduct.format,
      prix: Number(editingProduct.prix),
      photoUrl: editingProduct.photoUrl,
      disponible: editingProduct.disponible,
      quantiteRestante: editingProduct.quantiteRestante !== null ? Number(editingProduct.quantiteRestante) : null,
      actif: editingProduct.actif,
      misEnAvant: editingProduct.misEnAvant,
    });

    if (res.success) {
      setEditingProduct(null);
    } else {
      setEditError(res.error || 'Erreur lors de la mise à jour.');
    }
  };

  // Quick Price Submit
  const handleQuickPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;

    const res = await updateProductPrice(quickPriceProduct.id, quickPriceValue);
    if (res.success) {
      setPriceSuccessMsg(`Prix mis à jour pour ${quickPriceProduct.nom} !`);
      setTimeout(() => {
        setPriceSuccessMsg(null);
        setQuickPriceProduct(null);
      }, 1200);
    } else {
      setPriceSuccessMsg(null);
    }
  };

  // Handle Image Upload Helper
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit && editingProduct) {
          setEditingProduct({ ...editingProduct, photoUrl: base64 });
        } else {
          setCreateForm({ ...createForm, photoUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`Supprimer définitivement le produit "${product.nom}" ? Cette action est irréversible.`)) {
      void deleteProduct(product.id).then((res) => {
        if (!res.success) console.error(res.error);
      });
    }
  };

  return (
    <div id="admin-products-management" className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5DDD0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1F3D2E]">
              Gestion des Produits & Tarifs
            </h2>
          </div>
          <p className="text-xs text-[#53685C] mt-0.5">
            Catalogue complet : {products.length} référence{products.length > 1 ? 's' : ''} ({products.filter((p) => p.actif).length} active{products.filter((p) => p.actif).length > 1 ? 's' : ''} sur le site client)
          </p>
        </div>

        <button
          id="btn-add-product"
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 shrink-0"
        >
          <PackagePlus className="w-4 h-4 text-[#C9A24B]" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            id="input-search-admin-products"
            type="text"
            placeholder="Rechercher par nom, format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#EFE9DF] p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterMode === 'ALL' ? 'bg-white text-[#1F3D2E] shadow-xs' : 'text-[#53685C]'
            }`}
          >
            Tous ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterMode === 'ACTIVE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#53685C]'
            }`}
          >
            Actifs ({products.filter((p) => p.actif).length})
          </button>
          <button
            onClick={() => setFilterMode('INACTIVE')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterMode === 'INACTIVE' ? 'bg-white text-stone-700 shadow-xs' : 'text-[#53685C]'
            }`}
          >
            Masqués ({products.filter((p) => !p.actif).length})
          </button>
          <button
            onClick={() => setFilterMode('UNAVAILABLE')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterMode === 'UNAVAILABLE' ? 'bg-white text-red-700 shadow-xs' : 'text-[#53685C]'
            }`}
          >
            Indisponibles ({products.filter((p) => !p.disponible).length})
          </button>
          <button
            onClick={() => setFilterMode('FEATURED')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterMode === 'FEATURED' ? 'bg-white text-[#C9A24B] shadow-xs' : 'text-[#53685C]'
            }`}
          >
            ★ En avant ({products.filter((p) => p.misEnAvant).length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E5DDD0] shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#53685C]">
            Aucun produit ne correspond à ces critères.
          </div>
        ) : (
          <div className="divide-y divide-[#EFE9DF]">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  !p.actif ? 'bg-stone-50/70 opacity-75' : 'hover:bg-[#FAF3E8]/40'
                }`}
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#FAF3E8] border border-[#E5DDD0] shrink-0">
                    <img
                      src={p.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                      alt={p.nom}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback image if link breaks
                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                      }}
                    />
                    {!p.disponible && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center px-1">
                          Épuisé
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-[#1F3D2E]">{p.nom}</h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-[#FAF3E8] text-[#1F3D2E] rounded border border-[#E5DDD0]">
                        {p.format}
                      </span>
                      {p.misEnAvant && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-[#C9A24B] rounded border border-[#C9A24B]/30 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#C9A24B]" />
                          <span>En Avant</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#53685C] line-clamp-1 max-w-xl">{p.description}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-0.5">
                      <span className="font-serif font-bold text-sm text-[#C9A24B]">
                        {p.prix.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-[11px] text-stone-400">•</span>
                      <span className="text-[11px] text-[#53685C]">
                        {p.quantiteRestante !== null ? `Stock: ${p.quantiteRestante} unité(s)` : 'Stock: Non plafonné'}
                      </span>
                      <span className="text-[11px] text-stone-400">•</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          p.actif ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {p.actif ? 'Public (Actif)' : 'Masqué du site'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Controls & Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EFE9DF]">
                  
                  {/* Quick Price Edit button */}
                  <button
                    onClick={() => {
                      setQuickPriceProduct(p);
                      setQuickPriceValue(p.prix);
                      setPriceSuccessMsg(null);
                    }}
                    title="Modifier le prix indépendamment"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF3E8] hover:bg-[#EFE9DF] text-[#1F3D2E] border border-[#E5DDD0] transition-colors flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#C9A24B]" />
                    <span>Prix</span>
                  </button>

                  {/* Toggle Disponible */}
                  <button
                    onClick={() => toggleProductAvailability(p.id)}
                    title={p.disponible ? 'Marquer comme indisponible' : 'Marquer comme disponible'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      p.disponible
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    {p.disponible ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Disponible</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-red-600" />
                        <span>Indisponible</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Featured Star */}
                  <button
                    onClick={() => toggleProductFeatured(p.id)}
                    title={p.misEnAvant ? 'Retirer des produits mis en avant' : 'Mettre en avant sur la page d’accueil'}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      p.misEnAvant
                        ? 'bg-amber-50 text-[#C9A24B] border-[#C9A24B]/40'
                        : 'bg-stone-50 text-stone-400 hover:text-stone-700 border-stone-200'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${p.misEnAvant ? 'fill-[#C9A24B]' : ''}`} />
                  </button>

                  {/* Toggle Actif (Hide/Show) */}
                  <button
                    onClick={() => toggleProductActive(p.id)}
                    title={p.actif ? 'Masquer du site public (sans supprimer)' : 'Afficher sur le site public'}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      p.actif
                        ? 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {p.actif ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Edit Full */}
                  <button
                    onClick={() => {
                      setEditError(null);
                      setEditingProduct({ ...p });
                    }}
                    title="Modifier tous les champs"
                    className="p-1.5 rounded-lg text-stone-600 hover:text-[#1F3D2E] hover:bg-[#FAF3E8] border border-stone-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(p)}
                    title="Supprimer définitivement"
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Create Product */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF3E8] text-[#1F3D2E] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[#E5DDD0] space-y-4 my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1F3D2E] text-[#C9A24B] flex items-center justify-center">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Créer un Nouveau Produit</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Nom du produit *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dèguè Onctueux Nature"
                    value={createForm.nom}
                    onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Format *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bouteille 500ml, Pot 400g"
                    value={createForm.format}
                    onChange={(e) => setCreateForm({ ...createForm, format: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Prix (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={50}
                    value={createForm.prix}
                    onChange={(e) => setCreateForm({ ...createForm, prix: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1F3D2E] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Composition, saveurs, texture..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                />
              </div>

              {/* Photo Upload & Presets */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#1F3D2E]">Photo du produit</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#E5DDD0] shrink-0">
                    <img
                      src={createForm.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, false)}
                      className="block w-full text-[11px] text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1F3D2E] file:text-[#FAF3E8] hover:file:bg-[#2A4D3B] cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Ou coller une URL d'image..."
                      value={createForm.photoUrl || ''}
                      onChange={(e) => setCreateForm({ ...createForm, photoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-[#E5DDD0] rounded-lg outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E5DDD0]">
                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.disponible}
                    onChange={(e) => setCreateForm({ ...createForm, disponible: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#1F3D2E]">Disponible</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.actif}
                    onChange={(e) => setCreateForm({ ...createForm, actif: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#1F3D2E]">Actif (Visible)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.misEnAvant}
                    onChange={(e) => setCreateForm({ ...createForm, misEnAvant: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#C9A24B]">★ En Avant</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-[#EFE9DF] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#1F3D2E] text-[#FAF3E8] font-semibold px-4 py-2 rounded-xl hover:bg-[#2A4D3B] transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#C9A24B]" />
                  <span>Enregistrer le produit</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF3E8] text-[#1F3D2E] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[#E5DDD0] space-y-4 my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1F3D2E] text-[#C9A24B] flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Modifier : {editingProduct.nom}</h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Nom du produit *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.nom}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Format *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.format}
                    onChange={(e) => setEditingProduct({ ...editingProduct, format: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3D2E] mb-1">Prix (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={50}
                    value={editingProduct.prix}
                    onChange={(e) => setEditingProduct({ ...editingProduct, prix: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1F3D2E] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#1F3D2E]">Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#E5DDD0] shrink-0">
                    <img
                      src={editingProduct.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, true)}
                      className="block w-full text-[11px] text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1F3D2E] file:text-[#FAF3E8] hover:file:bg-[#2A4D3B] cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="URL d'image..."
                      value={editingProduct.photoUrl || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, photoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-[#E5DDD0] rounded-lg outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E5DDD0]">
                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.disponible}
                    onChange={(e) => setEditingProduct({ ...editingProduct, disponible: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#1F3D2E]">Disponible</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.actif}
                    onChange={(e) => setEditingProduct({ ...editingProduct, actif: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#1F3D2E]">Actif (Visible)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E5DDD0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.misEnAvant}
                    onChange={(e) => setEditingProduct({ ...editingProduct, misEnAvant: e.target.checked })}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-xs text-[#C9A24B]">★ En Avant</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-[#EFE9DF] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#1F3D2E] text-[#FAF3E8] font-semibold px-4 py-2 rounded-xl hover:bg-[#2A4D3B] transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#C9A24B]" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Price Edit */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF3E8] text-[#1F3D2E] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#E5DDD0] space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF3E8] text-[#C9A24B] border border-[#C9A24B]/40 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Modifier le Prix</h3>
              </div>
              <button
                onClick={() => setQuickPriceProduct(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {priceSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{priceSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleQuickPriceSubmit} className="space-y-4 text-xs">
                <div>
                  <p className="font-serif font-bold text-sm text-[#1F3D2E]">{quickPriceProduct.nom}</p>
                  <p className="text-[11px] text-[#53685C]">{quickPriceProduct.format}</p>
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3D2E] mb-1">
                    Nouveau tarif unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={50}
                    value={quickPriceValue}
                    onChange={(e) => setQuickPriceValue(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-[#E5DDD0] rounded-xl font-mono text-base font-bold text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickPriceProduct(null)}
                    className="px-3.5 py-2 rounded-xl text-stone-600 hover:bg-[#EFE9DF] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-[#1F3D2E] text-[#FAF3E8] font-semibold px-4 py-2 rounded-xl hover:bg-[#2A4D3B] transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4 text-[#C9A24B]" />
                    <span>Mettre à jour</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
