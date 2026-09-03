/**
 * Signature One - Module 6: Tables & QR Codes Service
 * Modèle TableQR & Persistance locale / synchronisation
 */

import { TableQR } from '../types';
import { isMockDataEnabled } from './config';

const STORAGE_TABLES_KEY = 'signature_one_tables_v6';

// Default initial tables (1 to 8)
const DEFAULT_TABLES: TableQR[] = [
  { id: 'tbl_1', numero: 1 },
  { id: 'tbl_2', numero: 2 },
  { id: 'tbl_3', numero: 3 },
  { id: 'tbl_4', numero: 4 },
  { id: 'tbl_5', numero: 5 },
  { id: 'tbl_6', numero: 6 },
  { id: 'tbl_7', numero: 7 },
  { id: 'tbl_8', numero: 8 },
];

export function getAllTables(): TableQR[] {
  if (typeof window === 'undefined') return isMockDataEnabled ? DEFAULT_TABLES : [];
  try {
    const raw = localStorage.getItem(STORAGE_TABLES_KEY);
    if (!raw) {
      if (isMockDataEnabled) {
        localStorage.setItem(STORAGE_TABLES_KEY, JSON.stringify(DEFAULT_TABLES));
      }
      return isMockDataEnabled ? DEFAULT_TABLES : [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (isMockDataEnabled ? DEFAULT_TABLES : []);
  } catch (err) {
    console.error('Error loading tables:', err);
    return isMockDataEnabled ? DEFAULT_TABLES : [];
  }
}

function saveTables(tables: TableQR[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_TABLES_KEY, JSON.stringify(tables));
    notifyTableListeners();
  } catch (err) {
    console.error('Error saving tables:', err);
  }
}

export function createTable(numero: number): { success: boolean; table?: TableQR; error?: string } {
  if (!numero || numero <= 0) {
    return { success: false, error: 'Numéro de table invalide.' };
  }

  const tables = getAllTables();
  if (tables.some((t) => t.numero === numero)) {
    return { success: false, error: `La table #${numero} existe déjà.` };
  }

  const newTable: TableQR = {
    id: `tbl_${numero}`,
    numero,
  };

  // Keep sorted by numero
  const updated = [...tables, newTable].sort((a, b) => a.numero - b.numero);
  saveTables(updated);

  return { success: true, table: newTable };
}

export function deleteTable(id: string): { success: boolean; error?: string } {
  const tables = getAllTables();
  const filtered = tables.filter((t) => t.id !== id);
  if (filtered.length === tables.length) {
    return { success: false, error: 'Table introuvable.' };
  }

  saveTables(filtered);
  return { success: true };
}

export function getTableByNumero(numero: number): TableQR | undefined {
  const tables = getAllTables();
  return tables.find((t) => t.numero === numero);
}

export function getTableById(id: string): TableQR | undefined {
  const tables = getAllTables();
  return tables.find((t) => t.id === id || t.id === `tbl_${id}`);
}

type TableListener = (tables: TableQR[]) => void;
const tableListeners: Set<TableListener> = new Set();

export function subscribeTables(listener: TableListener): () => void {
  tableListeners.add(listener);
  return () => tableListeners.delete(listener);
}

function notifyTableListeners(): void {
  const tables = getAllTables();
  tableListeners.forEach((fn) => {
    try {
      fn(tables);
    } catch (err) {
      console.error('Error in table subscriber:', err);
    }
  });
}
