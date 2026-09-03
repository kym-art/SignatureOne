import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Banknote,
  Calendar,
  DollarSign,
  TrendingDown,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { Expense } from '../../types';
import {
  getAllExpenses,
  createExpense,
  deleteExpense,
  subscribeExpenses,
  getTotalExpenses
} from '../../lib/expenses';

export const AdminExpensesManagement: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(getAllExpenses());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [libelle, setLibelle] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [dateExpense, setDateExpense] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setExpenses(getAllExpenses());
    const unsub = subscribeExpenses((updated) => setExpenses(updated));
    return unsub;
  }, []);

  const totalAll = getTotalExpenses('all');
  const totalToday = getTotalExpenses('today');
  const totalWeek = getTotalExpenses('week');
  const totalMonth = getTotalExpenses('month');

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amountNum = parseFloat(montant);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: 'error', message: 'Veuillez saisir un montant valide supérieur à 0 FCFA.' });
      return;
    }

    const isoDate = new Date(dateExpense).toISOString();
    const res = createExpense(libelle, amountNum, isoDate);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Dépense enregistrée avec succès.' });
      setLibelle('');
      setMontant('');
      setIsModalOpen(false);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors de la création.' });
    }
  };

  const handleDeleteExpense = (id: string, lib: string) => {
    if (window.confirm(`Confirmez-vous la suppression de la dépense "${lib}" ?`)) {
      const res = deleteExpense(id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Dépense supprimée.' });
      }
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery) return true;
    return e.libelle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div id="admin-expenses-management" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Pilotage Financier & Charges</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Gestion des Dépenses & Charges
          </h2>
          <p className="text-xs text-[#53685C]">
            Enregistrez les achats d'ingrédients, emballages et charges pour le calcul automatique du bénéfice net.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C9A24B]" />
          <span>Ajouter une Dépense</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-500 hover:text-stone-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Dépenses Aujourd'hui</span>
          <span className="font-serif font-bold text-lg text-rose-700">
            {totalToday.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">F</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Cette Semaine</span>
          <span className="font-serif font-bold text-lg text-[#1F3D2E]">
            {totalWeek.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">F</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Ce Mois-ci</span>
          <span className="font-serif font-bold text-lg text-[#1F3D2E]">
            {totalMonth.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">F</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Total Historique</span>
          <span className="font-serif font-bold text-lg text-[#1F3D2E]">
            {totalAll.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">F</span>
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-serif font-bold text-sm text-[#1F3D2E]">
            Journal des Dépenses ({filteredExpenses.length})
          </h3>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#53685C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par libellé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl text-[#1F3D2E] outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF3E8] text-[#1F3D2E] font-semibold border-y border-[#E5DDD0]">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Libellé de la dépense</th>
                <th className="p-3 text-right">Montant (FCFA)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DF]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-xs text-[#53685C]">
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAF3E8]/40 transition-colors">
                    <td className="p-3 text-[#53685C] whitespace-nowrap">
                      {new Date(exp.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3 font-medium text-[#1F3D2E]">{exp.libelle}</td>
                    <td className="p-3 font-serif font-bold text-rose-700 text-right whitespace-nowrap">
                      -{exp.montant.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.libelle)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Supprimer la dépense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5DDD0] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#1F3D2E] relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">
              Ajouter une Dépense
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1F3D2E] block mb-1">
                  Libellé / Objet de la dépense *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Achat ferments & lait frais..."
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F3D2E] block mb-1">
                  Montant en FCFA *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 15000"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E] font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F3D2E] block mb-1">
                  Date de la dépense
                </label>
                <input
                  type="date"
                  value={dateExpense}
                  onChange={(e) => setDateExpense(e.target.value)}
                  className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="py-2.5 bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold rounded-xl shadow-xs transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 bg-white border border-[#E5DDD0] text-[#53685C] font-semibold rounded-xl hover:bg-stone-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
