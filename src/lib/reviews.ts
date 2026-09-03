/**
 * Signature One - Customer Reviews Service (Module 8)
 * Handles customer ratings & comments after order completion,
 * admin moderation (approve, hide, delete, feature), and public display.
 */

import { isMockDataEnabled } from './config';
import { Review } from '../types';
import { apiFetch, ApiError } from './api';

const STORAGE_REVIEWS_KEY = 'signature_one_reviews_v1';

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev_01',
    orderId: 'ord_sample_0001',
    note: 5,
    commentaire: 'Le meilleur dèguè de Lomé ! Texture onctueuse et goût vanille coco sublime.',
    prenom: 'Koffi',
    valide: true,
    misEnAvant: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev_02',
    orderId: 'ord_sample_0002',
    note: 5,
    commentaire: 'Service sur place impeccable, servi frais en moins de 5 minutes. Je recommande vivement !',
    prenom: 'Abla',
    valide: true,
    misEnAvant: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev_03',
    orderId: 'ord_sample_0003',
    note: 4,
    commentaire: 'Bissap menthe très rafraîchissant. Retrait en boutique super rapide.',
    prenom: 'Foly',
    valide: false, // En attente de validation
    misEnAvant: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  }
];

type ReviewChangeListener = (reviews: Review[]) => void;
const listeners: Set<ReviewChangeListener> = new Set();

export function subscribeReviews(listener: ReviewChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllReviews();
  listeners.forEach((fn) => fn(current));
}

export function getAllReviews(): Review[] {
  if (typeof window === 'undefined') return isMockDataEnabled ? INITIAL_REVIEWS : [];
  try {
    const raw = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (!raw) {
      if (isMockDataEnabled) {
        localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
      }
      return isMockDataEnabled ? INITIAL_REVIEWS : [];
    }
    return JSON.parse(raw);
  } catch {
    return isMockDataEnabled ? INITIAL_REVIEWS : [];
  }
}

function saveReviews(reviews: Review[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
    notifySubscribers();
  } catch (err) {
    console.error('Failed to save reviews:', err);
  }
}

export function getApprovedReviews(): Review[] {
  return getAllReviews().filter((r) => r.valide);
}

export function getFeaturedReviews(): Review[] {
  return getAllReviews().filter((r) => r.valide && r.misEnAvant);
}

export function getPendingReviews(): Review[] {
  return getAllReviews().filter((r) => !r.valide);
}

export function hasOrderReview(orderId: string): boolean {
  return getAllReviews().some((r) => r.orderId === orderId);
}

export function getOrderReview(orderId: string): Review | undefined {
  return getAllReviews().find((r) => r.orderId === orderId);
}

export async function createReview(
  orderId: string,
  note: number,
  commentaire?: string,
  prenom?: string
): Promise<{ success: boolean; review?: Review; error?: string }> {
  if (note < 1 || note > 5) {
    return { success: false, error: 'La note doit être comprise entre 1 et 5 étoiles.' };
  }

  if (hasOrderReview(orderId)) {
    return { success: false, error: 'Un avis a déjà été soumis pour cette commande.' };
  }

  if (isMockDataEnabled) {
    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId,
      note,
      commentaire: commentaire?.trim() || null,
      prenom: prenom?.trim() || null,
      valide: false,
      misEnAvant: false,
      createdAt: new Date().toISOString(),
    };
    const all = getAllReviews();
    all.unshift(newReview);
    saveReviews(all);
    return { success: true, review: newReview };
  }

  // Sinon : soumission via le backend (endpoint public, modération a posteriori).
  try {
    const created = await apiFetch<Review>('/reviews', {
      method: 'POST',
      body: { orderId, note, commentaire: commentaire?.trim() || null, prenom: prenom?.trim() || null },
    });
    const all = getAllReviews();
    all.unshift(created);
    saveReviews(all);
    return { success: true, review: created };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la soumission de votre avis.';
    return { success: false, error: message };
  }
}

export async function approveReview(id: string): Promise<{ success: boolean; error?: string }> {
  const all = getAllReviews();
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, error: 'Avis introuvable.' };

  if (isMockDataEnabled) {
    all[index].valide = true;
    saveReviews(all);
    return { success: true };
  }

  try {
    await apiFetch<Review>(`/reviews/${id}/validate`, { method: 'PATCH' });
    all[index].valide = true;
    saveReviews(all);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la validation de l\'avis.';
    return { success: false, error: message };
  }
}

export async function hideReview(id: string): Promise<{ success: boolean; error?: string }> {
  const all = getAllReviews();
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, error: 'Avis introuvable.' };

  if (isMockDataEnabled) {
    all[index].valide = false;
    all[index].misEnAvant = false;
    saveReviews(all);
    return { success: true };
  }

  try {
    await apiFetch<Review>(`/reviews/${id}/feature`, { method: 'PATCH', body: { misEnAvant: false, valide: false } });
    all[index].valide = false;
    all[index].misEnAvant = false;
    saveReviews(all);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors du masquage de l\'avis.';
    return { success: false, error: message };
  }
}

export async function toggleFeatureReview(id: string): Promise<{ success: boolean; error?: string }> {
  const all = getAllReviews();
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, error: 'Avis introuvable.' };

  if (!all[index].valide) {
    return { success: false, error: "L'avis doit d'abord être validé avant d'être mis en avant." };
  }

  const target = !all[index].misEnAvant;

  if (isMockDataEnabled) {
    all[index].misEnAvant = target;
    saveReviews(all);
    return { success: true };
  }

  try {
    await apiFetch<Review>(`/reviews/${id}/feature`, { method: 'PATCH', body: { misEnAvant: target } });
    all[index].misEnAvant = target;
    saveReviews(all);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la mise en avant de l\'avis.';
    return { success: false, error: message };
  }
}

export async function deleteReview(id: string): Promise<{ success: boolean; error?: string }> {
  const all = getAllReviews();
  const filtered = all.filter((r) => r.id !== id);
  if (filtered.length === all.length) return { success: false, error: 'Avis introuvable.' };

  if (isMockDataEnabled) {
    saveReviews(filtered);
    return { success: true };
  }

  try {
    await apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' });
    saveReviews(filtered);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la suppression de l\'avis.';
    return { success: false, error: message };
  }
}
