/**
 * Signature One - Products Management Service
 * Source de vérité : BACKEND (NestJS + Supabase service_role).
 * AUCUNE donnée mockée — le catalogue est chargé depuis GET /api/products
 * au démarrage (refreshProductsFromBackend) et dans un cache mémoire.
 */

import { Product, CreateProductInput, UpdateProductInput } from '../types';
import { apiFetch, ApiError, getApiToken, API_BASE } from './api';

// High-definition artisanal product images (fallback si photo absente)
export const DEFAULT_PRODUCT_IMAGES = {
  degueNature: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  degueVanille: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  yaourtPurLait: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=800&q=80',
  yaourtMangue: 'https://images.unsplash.com/photo-1588767764782-b7e5c5443d3b?auto=format&fit=crop&w=800&q=80',
  bissapMenthe: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  gingembreAnanas: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
};

// Cache mémoire (source de vérité = backend, jamais localStorage)
let productsCache: Product[] | null = null;

// Product Subscribers for React reactivity
type ProductChangeListener = (products: Product[]) => void;
const listeners: Set<ProductChangeListener> = new Set();

export function subscribeProducts(listener: ProductChangeListener): () => void {
  listeners.add(listener);
  try {
    listener(getAllProducts());
  } catch {
    // Un listener ne doit jamais casser le store.
  }
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllProducts();
  listeners.forEach((fn) => fn(current));
}

/** Le catalogue est chargé depuis le backend au démarrage. */
export function getAllProducts(): Product[] {
  return productsCache ?? [];
}

/**
 * Charge le catalogue depuis le backend (GET /api/products — public).
 * Appelée au démarrage de l'application (App.tsx) et après chaque mutation.
 */
export async function refreshProductsFromBackend(): Promise<void> {
  try {
    const products = await apiFetch<Product[]>('/products');
    productsCache = Array.isArray(products) ? products : [];
  } catch (e) {
    console.warn('[products] refreshProductsFromBackend:', e instanceof ApiError ? e.message : e);
  }
  notifySubscribers();
}

/** Met à jour le cache mémoire avec les produits donnés. */
function setCache(products: Product[]): void {
  productsCache = products;
  notifySubscribers();
}
/**
 * Get active products for client-facing store (/produits, boutique)
 */
export function getActiveProducts(): Product[] {
  return getAllProducts().filter((p) => p.actif);
}

/**
 * Get featured products for the Homepage sections (/ : Populaires & Nouveautés)
 */
export function getFeaturedProducts(): Product[] {
  return getActiveProducts().filter((p) => p.misEnAvant);
}

/**
 * Get latest products for Homepage Nouveautés
 */
export function getLatestProducts(limit: number = 4): Product[] {
  return [...getActiveProducts()]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id);
}

/**
 * Upload une image produit vers Supabase Storage.
 * Envoie le fichier en multipart — retourne l'URL publique courte.
 * (Alternative au base64 qui dépassait @MaxLength(500) du DTO backend.)
 */
export async function uploadProductImage(
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const MAX_BYTES = 1024 * 1024; // 1 Mo max
  if (file.size > MAX_BYTES) {
    return {
      success: false,
      error: `Image trop volumineuse : ${Math.round(file.size / 1024)} Ko (max 1 Mo). Compressez l'image.`,
    };
  }
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'Seules les images sont acceptées.' };
  }

  try {
    const token = getApiToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/uploads/product-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      let message = `Erreur upload (${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.message === 'string') message = data.message;
      } catch { /* ignore */ }
      return { success: false, error: message };
    }
    const data = (await res.json()) as { url: string };
    return { success: true, url: data.url };
  } catch {
    return { success: false, error: 'Upload impossible : backend injoignable.' };
  }
}

/**
 * Admin: Create a new product — via BACKEND (POST /api/products)
 */
export async function createProduct(input: CreateProductInput): Promise<{ success: boolean; product?: Product; error?: string }> {
  if (!input.nom?.trim()) {
    return { success: false, error: 'Le nom du produit est obligatoire.' };
  }
  if (!input.format?.trim()) {
    return { success: false, error: 'Le format (ex: Pot 350ml, Bouteille 500ml) est obligatoire.' };
  }
  if (typeof input.prix !== 'number' || input.prix <= 0) {
    return { success: false, error: 'Veuillez renseigner un prix valide supérieur à 0 FCFA.' };
  }

  try {
    const created = await apiFetch<Product>('/products', {
      method: 'POST',
      body: {
        nom: input.nom.trim(),
        description: input.description?.trim() || '',
        format: input.format.trim(),
        prix: Math.round(input.prix),
        photoUrl: input.photoUrl?.trim() || DEFAULT_PRODUCT_IMAGES.degueNature,
        disponible: input.disponible !== undefined ? input.disponible : true,
        actif: input.actif !== undefined ? input.actif : true,
        misEnAvant: input.misEnAvant !== undefined ? input.misEnAvant : false,
      },
    });
    setCache([created, ...getAllProducts().filter((p) => p.id !== created.id)]);
    return { success: true, product: created };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la création du produit.';
    return { success: false, error: message };
  }
}

/**
 * Admin: Update existing product — via BACKEND (PATCH /api/products/:id)
 */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<{ success: boolean; product?: Product; error?: string }> {
  const patch: UpdateProductInput = {
    nom: input.nom !== undefined ? input.nom.trim() : undefined,
    description: input.description !== undefined ? input.description.trim() : undefined,
    format: input.format !== undefined ? input.format.trim() : undefined,
    prix: input.prix !== undefined ? Math.round(input.prix) : undefined,
    photoUrl: input.photoUrl,
    disponible: input.disponible,
    actif: input.actif,
    misEnAvant: input.misEnAvant,
  };

  try {
    const updated = await apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: patch });
    setCache(getAllProducts().map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    return { success: true, product: updated };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la mise à jour du produit.';
    return { success: false, error: message };
  }
}

/**
 * Admin: Quick price update independently
 */
export async function updateProductPrice(id: string, newPrice: number): Promise<{ success: boolean; product?: Product; error?: string }> {
  if (typeof newPrice !== 'number' || newPrice <= 0) {
    return { success: false, error: 'Prix invalide (doit être supérieur à 0 FCFA).' };
  }
  return updateProduct(id, { prix: newPrice });
}

/**
 * Admin: Quick Toggle Availability (disponible: true/false)
 */
export async function toggleProductAvailability(id: string): Promise<{ success: boolean; product?: Product; error?: string }> {
  const product = getProductById(id);
  if (!product) return { success: false, error: 'Produit introuvable.' };
  return updateProduct(id, { disponible: !product.disponible });
}

/**
 * Admin: Quick Toggle Active status (actif: true/false -> hides from public site without deleting)
 */
export async function toggleProductActive(id: string): Promise<{ success: boolean; product?: Product; error?: string }> {
  const product = getProductById(id);
  if (!product) return { success: false, error: 'Produit introuvable.' };
  return updateProduct(id, { actif: !product.actif });
}

/**
 * Admin: Quick Toggle Featured status (misEnAvant: true/false -> featured on homepage)
 */
export async function toggleProductFeatured(id: string): Promise<{ success: boolean; product?: Product; error?: string }> {
  const product = getProductById(id);
  if (!product) return { success: false, error: 'Produit introuvable.' };
  return updateProduct(id, { misEnAvant: !product.misEnAvant });
}

/**
 * Admin: Delete product — via BACKEND (DELETE /api/products/:id)
 * Le backend fait un soft-delete si le produit est référencé.
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
    setCache(getAllProducts().filter((p) => p.id !== id));
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la suppression du produit.';
    return { success: false, error: message };
  }
}
