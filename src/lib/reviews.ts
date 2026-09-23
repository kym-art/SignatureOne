/**
 * Signature One - Customer Reviews Service (Module 8)
 * Handles customer ratings & comments after order completion,
 * admin moderation (approve, hide, delete, feature), and public display.
 */

import { Review } from '../types';
import { apiFetch, ApiError } from './api';

// Cache mémoire (source de vérité = backend). Aucun localStorage, aucune donnée mockée.

// Cache mémoire (source de vérité = backend). Aucun localStorage.
let reviewsCache: Review[] | null = null;

type ReviewChangeListener = (reviews: Review[]) => void;
const listeners = new Set<ReviewChangeListener>();

export function subscribeReviews(listener: ReviewChangeListener): () => void {
  listeners.add(listener);
  try {
    listener(getAllReviews());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => listeners.delete(listener);
}

function notifySubscribers(): void {
  const current = getAllReviews();
  listeners.forEach((fn) => fn(current));
}

export function getAllReviews(): Review[] {
  // Cache mémoire rafraîchi par hydrateReviewsFromBackend (DB = source de vérité).
  if (reviewsCache) return reviewsCache;
  return [];
}

function saveReviews(reviews: Review[]): void {
  // Source de vérité = backend (GET /reviews). Le cache est un simple état
  // mémoire volatil — AUCUN localStorage. Les mutations appellent déjà le backend
  // ; ce setCache sert à rafraîchir l'UI immédiatement (optimiste).
  reviewsCache = reviews;
  notifySubscribers();
}

export function getApprovedReviews(): Review[] {
  return getAllReviews().filter((r) => r.valide);
}

export function getFeaturedReviews(): Review[] {
  // Note : Review.misEnAvant n'existe plus (schéma + DB) → tous les avis
  // publiés sont exposés ; le filtrage "en avant" n'a plus de colonne.
  return getAllReviews().filter((r) => r.valide);
}

export function getPendingReviews(): Review[] {
  return getAllReviews().filter((r) => !r.valide);
}

/**
 * Hydrate le cache des avis depuis le BACKEND (source de vérité).
 * - Public (includePending=false) : GET /reviews → avis validés uniquement,
 *   affichés sur la page d'accueil (avis d'AUTRES appareils désormais visibles).
 * - Admin (includePending=true) : + GET /reviews/pending (JWT requis) → la
 *   modération voit les avis de TOUS les appareils, pas seulement du sien.
 * Le cache est REMPLACÉ (le backend est la vérité ; chaque soumission part
 * déjà au backend). Silencieux si le backend est injoignable.
 */
export async function hydrateReviewsFromBackend(includePending = false): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const approved = await apiFetch<Review[]>('/reviews');
    if (!Array.isArray(approved)) return;
    let pending: Review[] = [];
    if (includePending) {
      try {
        const pendingRes = await apiFetch<Review[]>('/reviews/pending');
        if (Array.isArray(pendingRes)) pending = pendingRes;
      } catch {
        // non-admin ou backend indisponible : validés seuls
      }
    }
    const merged = [...pending, ...approved];
    // Toujours remplacer (même liste vide) : sinon une suppression côté
    // serveur (modération) n'est jamais propagée aux clients qui gardent
    // l'ancien cache. La DB reste la source de vérité.
    saveReviews(merged);
  } catch {
    // backend injoignable : cache local conservé
  }
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

  // Soumission via le backend (endpoint public, modération a posteriori).
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

  try {
    await apiFetch<Review>(`/reviews/${id}/feature`, { method: 'PATCH', body: { valide: false } });
    all[index].valide = false;
    saveReviews(all);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors du masquage de l\'avis.';
    return { success: false, error: message };
  }
}

export async function toggleFeatureReview(_id: string): Promise<{ success: boolean; error?: string }> {
  // La mise en avant des avis (Review.misEnAvant) a été retirée du schéma
  // Prisma et de la base : la fonctionnalité n'est plus disponible.
  return { success: false, error: 'La mise en avant des avis n\'est plus disponible.' };
}

export async function deleteReview(id: string): Promise<{ success: boolean; error?: string }> {
  const all = getAllReviews();
  const filtered = all.filter((r) => r.id !== id);
  if (filtered.length === all.length) return { success: false, error: 'Avis introuvable.' };

  try {
    await apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' });
    saveReviews(filtered);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la suppression de l\'avis.';
    return { success: false, error: message };
  }
}
