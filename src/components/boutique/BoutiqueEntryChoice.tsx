import React, { useState } from 'react';
import {
  Store,
  Truck,
  Coffee,
  ShoppingBag,
  Sparkles,
  QrCode,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { TypeCommande } from '../../types';
import { getAllTables } from '../../lib/tables';

interface BoutiqueEntryChoiceProps {
  onSelectMode: (mode: TypeCommande, tableId?: string) => void;
  onExploreDirectly: () => void;
}

export const BoutiqueEntryChoice: React.FC<BoutiqueEntryChoiceProps> = ({
  onSelectMode,
  onExploreDirectly,
}) => {
  const [selectedMode, setSelectedMode] = useState<TypeCommande | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const tables = getAllTables();

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode === 'SUR_PLACE') {
      onSelectMode('SUR_PLACE', `Table #${selectedTable}`);
    } else {
      onSelectMode(selectedMode);
    }
  };

  return (
    <div id="boutique-entry-choice" className="max-w-3xl mx-auto space-y-8 py-6">
      
      {/* Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-[#FAF3E8] border border-[#C9A24B]/40 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1F3D2E]">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Bienvenue chez Signature One</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F3D2E]">
          Comment souhaitez-vous déguster ?
        </h1>
        <p className="text-xs sm:text-sm text-[#53685C] max-w-lg mx-auto">
          Sélectionnez votre mode de commande pour personnaliser votre expérience et préparer vos dèguès et boissons dans les meilleures conditions.
        </p>
      </div>

      {/* Choice Cards Grid (Module 6 Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Choice 1: Sur place */}
        <div
          onClick={() => setSelectedMode('SUR_PLACE')}
          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
            selectedMode === 'SUR_PLACE'
              ? 'border-[#1F3D2E] bg-white shadow-lg ring-2 ring-[#1F3D2E]/10'
              : 'border-[#E5DDD0] bg-white/70 hover:border-[#53685C] hover:bg-white'
          }`}
        >
          <div className="space-y-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              selectedMode === 'SUR_PLACE' ? 'bg-[#1F3D2E] text-[#FAF3E8]' : 'bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30'
            }`}>
              <Coffee className="w-6 h-6 text-[#C9A24B]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1F3D2E]">Boire sur place</h2>
              <p className="text-xs text-[#53685C] mt-1 leading-relaxed">
                Installez-vous confortablement en salon ou terrasse. Vous serez servi directement à votre table.
              </p>
            </div>
          </div>

          {selectedMode === 'SUR_PLACE' && (
            <div className="pt-3 border-t border-[#EFE9DF] space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-bold text-[#1F3D2E]">
                Sélectionnez votre table :
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs font-bold text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E]"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.numero}>
                    Table #{t.numero}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-semibold text-[#1F3D2E] pt-2">
            <span>Service en salon</span>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              selectedMode === 'SUR_PLACE' ? 'border-[#1F3D2E] bg-[#1F3D2E] text-[#FAF3E8]' : 'border-[#E5DDD0]'
            }`}>
              {selectedMode === 'SUR_PLACE' && <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24B]" />}
            </div>
          </div>
        </div>

        {/* Choice 2: À emporter / Retrait */}
        <div
          onClick={() => setSelectedMode('RETRAIT')}
          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
            selectedMode === 'RETRAIT'
              ? 'border-[#1F3D2E] bg-white shadow-lg ring-2 ring-[#1F3D2E]/10'
              : 'border-[#E5DDD0] bg-white/70 hover:border-[#53685C] hover:bg-white'
          }`}
        >
          <div className="space-y-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              selectedMode === 'RETRAIT' ? 'bg-[#1F3D2E] text-[#FAF3E8]' : 'bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30'
            }`}>
              <Store className="w-6 h-6 text-[#C9A24B]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1F3D2E]">À emporter</h2>
              <p className="text-xs text-[#53685C] mt-1 leading-relaxed">
                Commandez à l'avance et retirez vos gourmandises au comptoir sans faire la queue.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#1F3D2E] pt-2">
            <span>Retrait express</span>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              selectedMode === 'RETRAIT' ? 'border-[#1F3D2E] bg-[#1F3D2E] text-[#FAF3E8]' : 'border-[#E5DDD0]'
            }`}>
              {selectedMode === 'RETRAIT' && <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24B]" />}
            </div>
          </div>
        </div>

        {/* Choice 3: Livraison */}
        <div
          onClick={() => setSelectedMode('LIVRAISON')}
          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
            selectedMode === 'LIVRAISON'
              ? 'border-[#1F3D2E] bg-white shadow-lg ring-2 ring-[#1F3D2E]/10'
              : 'border-[#E5DDD0] bg-white/70 hover:border-[#53685C] hover:bg-white'
          }`}
        >
          <div className="space-y-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              selectedMode === 'LIVRAISON' ? 'bg-[#1F3D2E] text-[#FAF3E8]' : 'bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30'
            }`}>
              <Truck className="w-6 h-6 text-[#C9A24B]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1F3D2E]">Livraison à domicile</h2>
              <p className="text-xs text-[#53685C] mt-1 leading-relaxed">
                Recevez votre commande au bureau ou à domicile partout dans la ville de Lomé.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#1F3D2E] pt-2">
            <span>Partout à Lomé</span>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              selectedMode === 'LIVRAISON' ? 'border-[#1F3D2E] bg-[#1F3D2E] text-[#FAF3E8]' : 'border-[#E5DDD0]'
            }`}>
              {selectedMode === 'LIVRAISON' && <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24B]" />}
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={!selectedMode}
          onClick={handleConfirm}
          className="w-full sm:w-auto bg-[#1F3D2E] hover:bg-[#2A4D3B] disabled:opacity-40 text-[#FAF3E8] font-bold text-xs sm:text-sm px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Accéder au catalogue Signature One</span>
          <ArrowRight className="w-4 h-4 text-[#C9A24B]" />
        </button>

        <button
          type="button"
          onClick={onExploreDirectly}
          className="text-xs text-[#53685C] hover:text-[#1F3D2E] py-2 px-4 font-medium transition-colors"
        >
          Découvrir les produits sans choisir maintenant
        </button>
      </div>

    </div>
  );
};
