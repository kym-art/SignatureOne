/**
 * Signature One - Products Management Service (Module 3)
 * Full CRUD, Storage, Availability Toggles, Featured Selection & Client Filtering
 */

import { Product, CreateProductInput, UpdateProductInput } from '../types';
import { isMockDataEnabled } from './config';
import { apiFetch, ApiError } from './api';

const STORAGE_PRODUCTS_KEY = 'signature_one_products_v3';

// High-definition artisanal product images
export const DEFAULT_PRODUCT_IMAGES = {
  degueNature: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  degueVanille: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  yaourtPurLait: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=800&q=80',
  yaourtMangue: 'https://images.unsplash.com/photo-1588767764782-b7e5c5443d3b?auto=format&fit=crop&w=800&q=80',
  bissapMenthe: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  gingembreAnanas: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
};

// Seed Products adhering to the brand identity (Dèguè, Yaourt, Boissons)
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_degue_nature',
    nom: 'Dèguè Onctueux Nature',
    description: 'Recette traditionnelle au yaourt artisanal crémeux, couscous de mil doré délicatement cuit à la vapeur.',
    format: 'Bouteille 500ml',
    prix: 1500,
    photoUrl: DEFAULT_PRODUCT_IMAGES.degueNature,
    disponible: true,
    quantiteRestante: 25,
    actif: true,
    misEnAvant: true,
    createdAt: '2026-08-20T08:00:00.000Z',
  },
  {
    id: 'prod_degue_vanille_coco',
    nom: 'Dèguè Gourmand Vanille & Coco',
    description: 'Infusion à la gousse de vanille bourbon, yaourt soyeux et copeaux de noix de coco grillée.',
    format: 'Pot 400g',
    prix: 1800,
    photoUrl: DEFAULT_PRODUCT_IMAGES.degueVanille,
    disponible: true,
    quantiteRestante: 18,
    actif: true,
    misEnAvant: true,
    createdAt: '2026-08-21T09:30:00.000Z',
  },
  {
    id: 'prod_yaourt_pur_lait',
    nom: 'Yaourt Brassé Pur Lait Entier',
    description: 'Yaourt velouté pur lait pasteurisé de ferme, texture douce et naturellement riche en probiotiques.',
    format: 'Bouteille 1L',
    prix: 2500,
    photoUrl: DEFAULT_PRODUCT_IMAGES.yaourtPurLait,
    disponible: true,
    quantiteRestante: 12,
    actif: true,
    misEnAvant: true,
    createdAt: '2026-08-22T10:15:00.000Z',
  },
  {
    id: 'prod_yaourt_mangue_passion',
    nom: 'Yaourt Onctueux Mangue & Passion',
    description: 'Coulis de mangues locales du Togo et fruits de la passion sur lit de yaourt crémeux.',
    format: 'Pot 350ml',
    prix: 1600,
    photoUrl: DEFAULT_PRODUCT_IMAGES.yaourtMangue,
    disponible: false, // Exemplary unavailable product for testing Module 3 badge
    quantiteRestante: 0,
    actif: true,
    misEnAvant: false,
    createdAt: '2026-08-23T14:00:00.000Z',
  },
  {
    id: 'prod_bissap_menthe',
    nom: 'Bissap Royal Menthe Fraîche',
    description: 'Infusion artisanale de fleurs d’hibiscus bio, menthe poivrée fraîche et touche subtile de cannelle.',
    format: 'Bouteille 500ml',
    prix: 1000,
    photoUrl: DEFAULT_PRODUCT_IMAGES.bissapMenthe,
    disponible: true,
    quantiteRestante: 30,
    actif: true,
    misEnAvant: false,
    createdAt: '2026-08-24T11:00:00.000Z',
  },
  {
    id: 'prod_gingembre_ananas',
    nom: 'Gnamakoudji Ananas Pur Jus',
    description: 'Élixir tonifiant au pur jus de gingembre frais pressé et ananas pain de sucre rôti.',
    format: 'Bouteille 500ml',
    prix: 1200,
    photoUrl: DEFAULT_PRODUCT_IMAGES.gingembreAnanas,
    disponible: true,
    quantiteRestante: 20,
    actif: true,
    misEnAvant: false,
    createdAt: '2026-08-25T15:30:00.000Z',
  },
];

// Product Subscribers for React reactivity
type ProductChangeListener = (products: Product[]) => void;
const listeners: Set<ProductChangeListener> = new Set();

export function subscribeProducts(listener: ProductChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers(): void {
  const current = getAllProducts();
  listeners.forEach((fn) => fn(current));
}

// Load products from localStorage with fallback
export function getAllProducts(): Product[] {
  if (typeof window === 'undefined') return isMockDataEnabled ? INITIAL_PRODUCTS : [];
  try {
    const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    if (!raw) {
      if (isMockDataEnabled) {
        localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      }
      return isMockDataEnabled ? INITIAL_PRODUCTS : [];
    }
    const parsed: Product[] = JSON.parse(raw);
    return parsed;
  } catch {
    return isMockDataEnabled ? INITIAL_PRODUCTS : [];
  }
}

// Save products to localStorage and trigger notifications
function saveProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    notifySubscribers();
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

/**
 * Get active products for client-facing store (/produits, boutique)
 * Only products where actif === true
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
 * Admin: Create a new product
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

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    nom: input.nom.trim(),
    description: input.description?.trim() || '',
    format: input.format.trim(),
    prix: Math.round(input.prix),
    photoUrl: input.photoUrl?.trim() || DEFAULT_PRODUCT_IMAGES.degueNature,
    disponible: input.disponible !== undefined ? input.disponible : true,
    quantiteRestante: input.quantiteRestante !== undefined ? input.quantiteRestante : null,
    actif: input.actif !== undefined ? input.actif : true,
    misEnAvant: input.misEnAvant !== undefined ? input.misEnAvant : false,
    createdAt: new Date().toISOString(),
  };

  // Mode mock explicite uniquement : écriture locale sans backend.
  if (isMockDataEnabled) {
    const products = getAllProducts();
    products.unshift(newProduct);
    saveProducts(products);
    return { success: true, product: newProduct };
  }

  // Sinon : le backend (rôle ADMIN vérifié côté serveur) est la source de vérité.
  try {
    const created = await apiFetch<Product>('/products', {
      method: 'POST',
      body: {
        nom: newProduct.nom,
        description: newProduct.description,
        format: newProduct.format,
        prix: newProduct.prix,
        photoUrl: newProduct.photoUrl,
        disponible: newProduct.disponible,
        quantiteRestante: newProduct.quantiteRestante,
        actif: newProduct.actif,
        misEnAvant: newProduct.misEnAvant,
      },
    });
    const products = getAllProducts();
    products.unshift(created);
    saveProducts(products);
    return { success: true, product: created };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la création du produit.';
    return { success: false, error: message };
  }
}

/**
 * Admin: Update existing product
 */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<{ success: boolean; product?: Product; error?: string }> {
  const products = getAllProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return { success: false, error: 'Produit introuvable.' };
  }

  const current = products[index];
  const patch: UpdateProductInput = {
    nom: input.nom !== undefined ? input.nom.trim() : undefined,
    description: input.description !== undefined ? input.description.trim() : undefined,
    format: input.format !== undefined ? input.format.trim() : undefined,
    prix: input.prix !== undefined ? Math.round(input.prix) : undefined,
    photoUrl: input.photoUrl,
    disponible: input.disponible,
    quantiteRestante: input.quantiteRestante,
    actif: input.actif,
    misEnAvant: input.misEnAvant,
  };

  if (isMockDataEnabled) {
    const updated: Product = {
      ...current,
      nom: patch.nom ?? current.nom,
      description: patch.description ?? current.description,
      format: patch.format ?? current.format,
      prix: patch.prix ?? current.prix,
      photoUrl: patch.photoUrl ?? current.photoUrl,
      disponible: patch.disponible ?? current.disponible,
      quantiteRestante: patch.quantiteRestante ?? current.quantiteRestante,
      actif: patch.actif ?? current.actif,
      misEnAvant: patch.misEnAvant ?? current.misEnAvant,
    };
    products[index] = updated;
    saveProducts(products);
    return { success: true, product: updated };
  }

  try {
    const updated = await apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: patch });
    products[index] = { ...current, ...updated };
    saveProducts(products);
    return { success: true, product: products[index] };
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
 * Admin: Delete product
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const products = getAllProducts();
  const filtered = products.filter((p) => p.id !== id);

  if (filtered.length === products.length) {
    return { success: false, error: 'Produit introuvable.' };
  }

  if (isMockDataEnabled) {
    saveProducts(filtered);
    return { success: true };
  }

  try {
    await apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
    saveProducts(filtered);
    return { success: true };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la suppression du produit.';
    return { success: false, error: message };
  }
}
