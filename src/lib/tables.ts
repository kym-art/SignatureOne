/**
 * Signature One - Module 6: Tables & QR Codes Service
 * Source de vérité : BACKEND (NestJS + Supabase service_role, table `TableQR`).
 * AUCUN stockage : la liste est chargée depuis GET /api/tables (public, read-only)
 * et conservée dans un cache mémoire volatil.
 */
import { TableQR } from '../types';
import { apiFetch, ApiError } from './api';

// Cache mémoire (source de vérité = backend, jamais localStorage)
let tablesCache: TableQR[] | null = null;

// Table Subscribers for React reactivity
type TableListener = (tables: TableQR[]) => void;
const listeners = new Set<TableListener>();

export function subscribeTables(listener: TableListener): () => void {
  listeners.add(listener);
  try {
    listener(getAllTables());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => listeners.delete(listener);
}

function notifySubscribers(): void {
  const current = getAllTables();
  listeners.forEach((fn) => fn(current));
}

/** Le catalogue est chargé depuis le backend au démarrage. */
export function getAllTables(): TableQR[] {
  return tablesCache ?? [];
}

/**
 * Charge les tables depuis le backend (GET /api/tables — public, read-only).
 * Appelée au démarrage (App.tsx) et après chaque mutation admin.
 */
export async function refreshTablesFromBackend(): Promise<void> {
  try {
    const tables = await apiFetch<TableQR[]>('/tables');
    tablesCache = Array.isArray(tables) ? tables : [];
  } catch (e) {
    console.warn('[tables] refreshTablesFromBackend:', e instanceof ApiError ? e.message : e);
    // Backend injoignable : conserve le cache existant (liste vide sinon).
    tablesCache = tablesCache ?? [];
  }
  notifySubscribers();
}

function setCache(tables: TableQR[]): void {
  tablesCache = tables;
  notifySubscribers();
}

export function getTableByNumero(numero: number): TableQR | undefined {
  return getAllTables().find((t) => t.numero === numero);
}

export function getTableById(id: string): TableQR | undefined {
  return getAllTables().find((t) => t.id === id || t.id === `tbl_${id}`);
}

export async function createTable(numero: number): Promise<{ success: boolean; table?: TableQR; error?: string }> {
  if (!numero || numero <= 0) {
    return { success: false, error: 'Numéro de table invalide.' };
  }
  try {
    const created = await apiFetch<TableQR>('/tables', { method: 'POST', body: { numero } });
    setCache([...getAllTables(), created].sort((a, b) => a.numero - b.numero));
    return { success: true, table: created };
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Erreur lors de la création de la table.';
    return { success: false, error: msg };
  }
}

export async function deleteTable(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch<void>(`/tables/${id}`, { method: 'DELETE' });
    setCache(getAllTables().filter((t) => t.id !== id));
    return { success: true };
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Erreur lors de la suppression de la table.';
    return { success: false, error: msg };
  }
}
