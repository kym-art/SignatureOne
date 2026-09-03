/**
 * Signature One - Global Cart Context (Module 4)
 * Client-side global cart state with sessionStorage / localStorage persistence
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalAmount: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'signature_one_cart_v4';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      // Prioritize sessionStorage or localStorage
      const saved = localStorage.getItem(CART_STORAGE_KEY) || sessionStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse cart storage:', e);
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sync to local/session storage on state change
  useEffect(() => {
    try {
      const serialized = JSON.stringify(items);
      localStorage.setItem(CART_STORAGE_KEY, serialized);
      sessionStorage.setItem(CART_STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('Failed to save cart to storage:', e);
    }
  }, [items]);

  const addItem = (product: Product, quantity: number = 1) => {
    if (!product.disponible || quantity <= 0) return;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantite: updated[existingIndex].quantite + quantity,
        };
        return updated;
      }
      return [...prevItems, { product, quantite: quantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantite: quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear cart storage:', e);
    }
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const totalCount = items.reduce((sum, item) => sum + item.quantite, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.product.prix * item.quantite, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        totalAmount,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
