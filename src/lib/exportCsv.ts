/**
 * Signature One - CSV Export Utility (Module 8)
 * Generates structured CSV for orders and triggers browser download
 */

import { Order } from '../types';
import { getStatusDetails, getPaymentStatusDetails, getReceptionModeDetails } from './orders';

export function exportOrdersToCsv(orders: Order[], filenamePrefix = 'commandes_signature_one'): void {
  if (typeof window === 'undefined' || !orders || orders.length === 0) {
    alert('Aucune commande à exporter.');
    return;
  }

  const headers = [
    'Numero',
    'Date_Heure',
    'Client_Nom',
    'Client_Tel',
    'Type_Commande',
    'Table_Adresse',
    'Articles',
    'Total_FCFA',
    'Statut_Commande',
    'Mode_Paiement',
    'Statut_Paiement',
    'Vendeur_Responsable'
  ];

  const escapeCsv = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = orders.map((o) => {
    const formattedDate = new Date(o.createdAt).toLocaleString('fr-FR');
    const articlesSummary = o.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Article'} (${i.prixUnitaire}F)`).join('; ');
    const tableOrAddr = o.tableId ? `Table ${o.tableId}` : (o.adresseLivraison || 'Comptoir');
    const statusLabel = getStatusDetails(o.statut).label;
    const paymentStatusLabel = getPaymentStatusDetails(o.statutPaiement).label;
    const receptionLabel = getReceptionModeDetails(o.typeCommande).label;
    const vendorLabel = o.vendeur?.nom || (o.vendeurId ? `ID: ${o.vendeurId}` : 'Non assigné');

    return [
      escapeCsv(o.numero),
      escapeCsv(formattedDate),
      escapeCsv(o.clientNom),
      escapeCsv(o.clientTel),
      escapeCsv(receptionLabel),
      escapeCsv(tableOrAddr),
      escapeCsv(articlesSummary),
      escapeCsv(o.total),
      escapeCsv(statusLabel),
      escapeCsv(o.modePaiement),
      escapeCsv(paymentStatusLabel),
      escapeCsv(vendorLabel),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
