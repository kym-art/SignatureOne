/**
 * Signature One - Expenses Service (Module 8)
 * Handles CRUD on Expenses (libelle, montant, createdAt) for calculating net profits
 */

import { Expense } from '../types';

const STORAGE_EXPENSES_KEY = 'signature_one_expenses_v1';

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    libelle: 'Achat lait frais entier & ferments bio (Lomé Nord)',
    montant: 18500,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp_02',
    libelle: 'Fourniture Mil décortiqué & Couscous Dèguè artisanal',
    montant: 12000,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp_03',
    libelle: 'Conditionnements & Bouteilles thermos recyclables',
    montant: 8500,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp_04',
    libelle: 'Approvisionnement Menthe fraîche, Gingembre & Ananas',
    montant: 6000,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

type ExpenseChangeListener = (expenses: Expense[]) => void;
const listeners: Set<ExpenseChangeListener> = new Set();

export function subscribeExpenses(listener: ExpenseChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllExpenses();
  listeners.forEach((fn) => fn(current));
}

export function getAllExpenses(): Expense[] {
  if (typeof window === 'undefined') return INITIAL_EXPENSES;
  try {
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EXPENSES;
  }
}

function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    notifySubscribers();
  } catch (err) {
    console.error('Failed to save expenses:', err);
  }
}

export function createExpense(libelle: string, montant: number, dateIso?: string): { success: boolean; expense?: Expense; error?: string } {
  const cleanLibelle = libelle.trim();
  if (!cleanLibelle) {
    return { success: false, error: 'Le libellé de la dépense est obligatoire.' };
  }
  if (isNaN(montant) || montant <= 0) {
    return { success: false, error: 'Le montant de la dépense doit être supérieur à 0 FCFA.' };
  }

  const newExpense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    libelle: cleanLibelle,
    montant: Math.round(montant),
    createdAt: dateIso || new Date().toISOString(),
  };

  const all = getAllExpenses();
  all.unshift(newExpense);
  saveExpenses(all);

  return { success: true, expense: newExpense };
}

export function deleteExpense(id: string): { success: boolean; error?: string } {
  const all = getAllExpenses();
  const filtered = all.filter((e) => e.id !== id);
  if (filtered.length === all.length) {
    return { success: false, error: 'Dépense introuvable.' };
  }
  saveExpenses(filtered);
  return { success: true };
}

export function getTotalExpenses(period: 'today' | 'week' | 'month' | 'all' = 'all'): number {
  const all = getAllExpenses();
  const now = new Date();

  const filtered = all.filter((e) => {
    const expDate = new Date(e.createdAt);
    if (period === 'today') {
      return (
        expDate.getFullYear() === now.getFullYear() &&
        expDate.getMonth() === now.getMonth() &&
        expDate.getDate() === now.getDate()
      );
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return expDate >= oneWeekAgo;
    }
    if (period === 'month') {
      return (
        expDate.getFullYear() === now.getFullYear() &&
        expDate.getMonth() === now.getMonth()
      );
    }
    return true;
  });

  return filtered.reduce((sum, e) => sum + e.montant, 0);
}
