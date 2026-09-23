/**
 * Signature One - Expenses Service (Module 8)
 * Source de vérité : BACKEND (NestJS, table `Expense`). AUCUN localStorage.
 * - GET /expenses (staff JWT) : historique.
 * - POST /expenses (admin/vendeur) : création.
 * - DELETE /expenses/:id (admin/vendeur) : suppression.
 */
import { Expense } from '../types';
import { apiFetch, ApiError, getApiToken } from './api';

// Cache mémoire (source de vérité = backend). Plus de INITIAL_EXPENSES persisté.
let expensesCache: Expense[] | null = null;

type ExpenseChangeListener = (expenses: Expense[]) => void;
const listeners = new Set<ExpenseChangeListener>();

export function subscribeExpenses(listener: ExpenseChangeListener): () => void {
  listeners.add(listener);
  try {
    listener(getAllExpenses());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => listeners.delete(listener);
}

function notifySubscribers(): void {
  const current = getAllExpenses();
  listeners.forEach((fn) => fn(current));
}

function setCache(expenses: Expense[]): void {
  expensesCache = expenses;
  notifySubscribers();
}

export function getAllExpenses(): Expense[] {
  return expensesCache ?? [];
}

/**
 * Hydrate le cache des dépenses depuis le backend (staff authentifié).
 * Silencieux si le backend est injoignable (cache local conservé).
 */
export async function refreshExpensesFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!getApiToken()) return; // staff uniquement
  try {
    const expenses = await apiFetch<Expense[]>('/expenses');
    setCache(Array.isArray(expenses) ? expenses : []);
  } catch (e) {
    console.warn('[expenses] refreshExpensesFromBackend:', e instanceof ApiError ? e.message : e);
  }
}

export async function createExpense(libelle: string, montant: number, dateIso?: string): Promise<{ success: boolean; expense?: Expense; error?: string }> {
  const cleanLibelle = libelle.trim();
  if (!cleanLibelle) {
    return { success: false, error: 'Le libellé de la dépense est obligatoire.' };
  }
  if (isNaN(montant) || montant <= 0) {
    return { success: false, error: 'Le montant de la dépense doit être supérieur à 0 FCFA.' };
  }

  try {
    const created = await apiFetch<Expense>('/expenses', {
      method: 'POST',
      body: { libelle: cleanLibelle, montant: Math.round(montant), dateIso },
    });
    setCache([created, ...getAllExpenses()]);
    return { success: true, expense: created };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la création de la dépense.';
    return { success: false, error: message };
  }
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });
    setCache(getAllExpenses().filter((e) => e.id !== id));
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la suppression de la dépense.';
    return { success: false, error: message };
  }
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
