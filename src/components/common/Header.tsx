import React, { useState, useEffect } from 'react';
import { ShoppingBag, Store, QrCode, LogOut, Clock, ShoppingCart } from 'lucide-react';
import { getCurrentUser, logout, subscribeAuth } from '../../lib/auth';
import { useCart } from '../../lib/CartContext';
import { User } from '../../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const { totalCount, totalAmount, openCart } = useCart();

  useEffect(() => {
    const unsubscribe = subscribeAuth((session) => {
      setCurrentUser(session ? session.user : null);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logout();
    onSelectTab('public');
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-[#FAF3E8]/95 backdrop-blur-md border-b border-[#E5DDD0]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <button
          onClick={() => onSelectTab('public')}
          className="flex items-center gap-2.5 text-left group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-[#C9A24B]/40 group-hover:scale-105 transition-transform">
            <img src="/icon.svg" alt="Logo Signature One" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#1F3D2E]">Signature One</span>
            </div>
            <p className="text-[10px] text-[#53685C] hidden md:block">Dèguè • Yaourt • Boissons Artisanales</p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-xs">
          <button
            id="nav-public"
            onClick={() => onSelectTab('public')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'public'
                ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
                : 'text-[#53685C] hover:bg-[#EFE9DF] hover:text-[#1F3D2E]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accueil</span>
            <span className="sm:hidden">Accueil</span>
          </button>

          <button
            id="nav-boutique"
            onClick={() => onSelectTab('boutique')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'boutique'
                ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
                : 'text-[#53685C] hover:bg-[#EFE9DF] hover:text-[#1F3D2E]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Boutique</span>
          </button>

          <button
            id="nav-suivi"
            onClick={() => onSelectTab('suivi')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'suivi'
                ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
                : 'text-[#53685C] hover:bg-[#EFE9DF] hover:text-[#1F3D2E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
            <span className="hidden sm:inline">Suivi Commande</span>
            <span className="sm:hidden">Suivi</span>
          </button>

          <button
            id="nav-table"
            onClick={() => onSelectTab('table')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'table'
                ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
                : 'text-[#53685C] hover:bg-[#EFE9DF] hover:text-[#1F3D2E]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table (t/3)</span>
            <span className="sm:hidden">Table</span>
          </button>
        </nav>

        {/* User Auth & Cart Section */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Cart Button */}
          <button
            id="btn-open-cart-header"
            onClick={openCart}
            className="flex items-center gap-2 bg-[#1F3D2E] text-[#FAF3E8] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#2A4D3B] transition-all shadow-xs"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 text-[#C9A24B]" />
              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#C9A24B] text-[#1F3D2E] font-mono font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-mono">
              {totalAmount > 0 ? `${totalAmount.toLocaleString('fr-FR')} F` : 'Panier'}
            </span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-1.5 bg-white border border-[#E5DDD0] p-1 pl-2 sm:pl-2.5 rounded-xl text-xs shadow-xs">
              <div className="flex flex-col text-left">
                <span className="font-bold text-[11px] text-[#1F3D2E] leading-tight truncate max-w-[90px] sm:max-w-[120px]">
                  {currentUser.nom}
                </span>
                <span className={`text-[9px] font-semibold leading-tight ${currentUser.role === 'ADMIN' ? 'text-red-700' : 'text-[#C9A24B]'}`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                id="btn-logout"
                onClick={handleLogout}
                title="Se déconnecter"
                className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-[#FAF3E8] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
