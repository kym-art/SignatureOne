import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  QrCode,
  Star,
  ShieldCheck,
  Award,
  HeartHandshake,
  Clock,
  Check,
  Plus
} from 'lucide-react';
import { getFeaturedProducts, getLatestProducts, subscribeProducts, DEFAULT_PRODUCT_IMAGES } from '../../lib/products';
import { useCart } from '../../lib/CartContext';
import { Product } from '../../types';

interface PublicHomeViewProps {
  onNavigate: (view: string) => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({ onNavigate }) => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const { addItem } = useCart();
  const [addedIds, setAddedIds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setFeaturedProducts(getFeaturedProducts());
    setLatestProducts(getLatestProducts(4));

    const unsub = subscribeProducts(() => {
      setFeaturedProducts(getFeaturedProducts());
      setLatestProducts(getLatestProducts(4));
    });
    return unsub;
  }, []);

  const handleQuickAdd = (p: Product) => {
    if (!p.disponible) return;
    addItem(p, 1);
    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
    }, 1200);
  };

  return (
    <div id="public-home-container" className="space-y-10 pb-16">
      
      {/* Hero Welcome Card - Strict Forest Green #1F3D2E, Cream #FAF3E8, Golden #C9A24B (Solid & Refined) */}
      <section className="bg-[#1F3D2E] text-[#FAF3E8] rounded-3xl p-6 sm:p-10 border border-[#C9A24B]/30 shadow-md relative overflow-hidden">
        
        {/* Subtle decorative wheat watermark */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none w-96 h-96">
          <img src="/logo.svg" alt="" className="w-full h-full" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#FAF3E8]/10 border border-[#C9A24B]/40 px-3 py-1 rounded-full text-xs text-[#FAF3E8] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#C9A24B] animate-pulse"></span>
            <span>Artisanat Culinaire Authentique</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#FAF3E8] leading-tight">
            L'excellence du Dèguè & des Saveurs Authentiques
          </h1>

          <p className="text-sm sm:text-base text-[#FAF3E8]/85 leading-relaxed">
            Bienvenue chez <strong>Signature One</strong>. Découvrez notre sélection de dèguè onctueux, yaourts brassés pur lait et boissons fraîches préparés chaque jour avec passion et rigueur.
          </p>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              id="hero-btn-boutique"
              onClick={() => onNavigate('boutique')}
              className="bg-[#C9A24B] hover:bg-[#B8913B] text-[#1F3D2E] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-all shadow-xs flex items-center gap-2 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Commander en Boutique</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-btn-table"
              onClick={() => onNavigate('table')}
              className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] border border-[#C9A24B]/50 font-semibold text-xs sm:text-sm px-5 py-3 rounded-xl transition-all flex items-center gap-2 active:scale-95"
            >
              <QrCode className="w-4 h-4 text-[#C9A24B]" />
              <span>Commander sur Table (QR)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Brand Commitments (3 pillars) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-[#E5DDD0] shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#FAF3E8] border border-[#C9A24B]/30 flex items-center justify-center text-[#1F3D2E]">
            <Award className="w-5 h-5 text-[#C9A24B]" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#1F3D2E]">100% Artisanal & Pur Lait</h3>
          <p className="text-xs text-[#53685C] leading-relaxed">
            Élaboré à partir de lait de qualité supérieure et de céréales locales sélectionnées sans conservateurs chimiques.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5DDD0] shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#FAF3E8] border border-[#C9A24B]/30 flex items-center justify-center text-[#1F3D2E]">
            <Clock className="w-5 h-5 text-[#C9A24B]" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Fraîcheur Quotidienne</h3>
          <p className="text-xs text-[#53685C] leading-relaxed">
            Nos recettes de dèguè et yaourts brassés sont cuisinées au jour le jour pour préserver toute leur onctuosité.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5DDD0] shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#FAF3E8] border border-[#C9A24B]/30 flex items-center justify-center text-[#1F3D2E]">
            <ShieldCheck className="w-5 h-5 text-[#C9A24B]" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Le Goût qui fait la Différence</h3>
          <p className="text-xs text-[#53685C] leading-relaxed">
            La signature gustative d'une maison attachée à l'exigence, au respect du terroir et à l'innovation savoureuse.
          </p>
        </div>
      </section>

      {/* Section 1: Produits Populaires & Recommandés (misEnAvant = true) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-[#C9A24B] text-[#C9A24B]" />
              <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
                Produits Populaires & Recommandations
              </h2>
            </div>
            <p className="text-xs text-[#53685C] mt-0.5">
              Les recettes les plus plébiscitées par nos clients
            </p>
          </div>
          <button
            onClick={() => onNavigate('boutique')}
            className="text-xs font-semibold text-[#1F3D2E] hover:text-[#C9A24B] flex items-center gap-1 transition-colors"
          >
            <span>Tout le catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((p) => {
            const isAdded = addedIds[p.id];

            return (
              <div
                key={p.id}
                className="bg-white border border-[#E5DDD0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-[#FAF3E8] overflow-hidden">
                    <img
                      src={p.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                      alt={p.nom}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-semibold text-[#1F3D2E] bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-md shadow-xs border border-[#E5DDD0]">
                        {p.format}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-semibold text-[#1F3D2E] bg-[#FAF3E8]/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-[#C9A24B]/40 flex items-center gap-1 shadow-xs">
                        <Star className="w-3 h-3 fill-[#C9A24B] text-[#C9A24B]" />
                        <span>Recommandé</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h3 className="font-serif font-bold text-base text-[#1F3D2E]">{p.nom}</h3>
                    <p className="text-xs text-[#53685C] line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-[#EFE9DF] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-[#53685C] block">Prix</span>
                    <span className="font-serif font-bold text-base text-[#1F3D2E]">
                      {p.prix.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                    </span>
                  </div>

                  {p.disponible ? (
                    <button
                      onClick={() => handleQuickAdd(p)}
                      className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                        isAdded
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8]'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Ajouté</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
                          <span>Ajouter</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-red-800 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                      Indisponible
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Nouveautés & Délices du moment */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
              Nouveautés & Délices du Moment
            </h2>
            <p className="text-xs text-[#53685C] mt-0.5">
              Les dernières créations fraîches de notre atelier
            </p>
          </div>
          <button
            onClick={() => onNavigate('boutique')}
            className="text-xs font-semibold text-[#1F3D2E] hover:text-[#C9A24B] flex items-center gap-1 transition-colors"
          >
            <span>Voir boutique</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => onNavigate('boutique')}
              className="bg-white border border-[#E5DDD0] rounded-xl p-4 flex flex-col justify-between hover:border-[#1F3D2E] transition-all cursor-pointer shadow-xs group"
            >
              <div className="space-y-2">
                <div className="relative h-28 w-full rounded-lg overflow-hidden bg-[#FAF3E8]">
                  <img
                    src={p.photoUrl || DEFAULT_PRODUCT_IMAGES.degueNature}
                    alt={p.nom}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGES.degueNature;
                    }}
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-white/95 text-[#1F3D2E] rounded shadow-xs">
                      {p.format}
                    </span>
                  </div>
                </div>

                <h4 className="font-serif font-bold text-sm text-[#1F3D2E] line-clamp-1">{p.nom}</h4>
                <p className="text-[11px] text-[#53685C] line-clamp-2 leading-relaxed">{p.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EFE9DF] flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-sm text-[#1F3D2E]">
                  {p.prix.toLocaleString('fr-FR')}{' '}
                  <span className="text-[10px] font-normal text-[#C9A24B]">FCFA</span>
                </span>
                <span className="text-[11px] text-[#1F3D2E] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Commander</span>
                  <ArrowRight className="w-3 h-3 text-[#C9A24B]" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
