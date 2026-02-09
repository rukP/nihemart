'use client';

import { useCallback, useRef } from 'react';

// ============================================================================
// CHECKOUT STORAGE HOOK
// Handles localStorage persistence for checkout state (form data, payment method,
// cart items, etc.). Provides utilities to save, load, and clear checkout data.
// ============================================================================

const CHECKOUT_STORAGE_KEY = 'nihemart_checkout_v1';

export interface CheckoutStorageData {
  formData?: {
    email?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    phone?: string;
    delivery_notes?: string;
  };
  paymentMethod?: string;
  mobileMoneyPhones?: {
    mtn_momo?: string;
    airtel_money?: string;
  };
  cart?: any[];
  isBuyNowFlow?: boolean;
}

export interface UseCheckoutStorageReturn {
  loadCheckoutFromStorage: () => CheckoutStorageData | null;
  saveCheckoutToStorage: (payload: CheckoutStorageData) => void;
  clearCheckoutStorage: () => void;
  clearAllCheckoutClientState: () => void;
  preventPersistenceRef: React.MutableRefObject<boolean>;
}

export function useCheckoutStorage(): UseCheckoutStorageReturn {
  // Ref to track if persistence should be prevented (after successful order)
  const preventPersistenceRef = useRef(false);

  /**
   * Load checkout data from localStorage
   */
  const loadCheckoutFromStorage =
    useCallback((): CheckoutStorageData | null => {
      try {
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_err) {
        // console.warn('Failed to load checkout from storage:', _err);
        return null;
      }
    }, []);

  /**
   * Save checkout data to localStorage
   */
  const saveCheckoutToStorage = useCallback((payload: CheckoutStorageData) => {
    try {
      if (typeof window === 'undefined') return;
      if (preventPersistenceRef.current) return;
      localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch (_err) {
      // console.warn('Failed to save checkout to storage:', _err);
    }
  }, []);

  /**
   * Clear primary checkout storage
   */
  const clearCheckoutStorage = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch (_err) {
      /* ignore */
    }
  }, []);

  /**
   * Clear ALL checkout-related client state after successful order creation.
   * This includes localStorage, sessionStorage, and various checkout keys.
   */
  const clearAllCheckoutClientState = useCallback(() => {
    // Prevent future persistence
    preventPersistenceRef.current = true;
    // console.log('[clearAllCheckoutClientState] ✓ Persistence prevented');

    // Clear primary checkout storage
    try {
      // console.log(
      //   '[clearAllCheckoutClientState] Clearing primary checkout storage...'
      // );
      clearCheckoutStorage();
      // console.log(
      //   '[clearAllCheckoutClientState] ✓ Primary checkout storage cleared'
      // );
    } catch (_e) {
      // console.error(
      //   '[clearAllCheckoutClientState] Failed to clear checkout storage:',
      //   _e
      // );
    }

    // Clear additional localStorage keys
    try {
      // console.log(
      //   '[clearAllCheckoutClientState] Clearing all localStorage checkout keys...'
      // );
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('nihemart_checkout_v1');
          // console.log(
          //   '[clearAllCheckoutClientState] ✓ nihemart_checkout_v1 cleared'
          // );
        } catch (_e) {
          // console.error(
          //   '[clearAllCheckoutClientState] Failed to clear nihemart_checkout_v1:',
          //   _e
          // );
        }
        try {
          localStorage.removeItem('checkout');
          // console.log('[clearAllCheckoutClientState] ✓ checkout key cleared');
        } catch (_e) {
          // console.error(
          //   '[clearAllCheckoutClientState] Failed to clear checkout:',
          //   _e
          // );
        }
      }
    } catch (_e) {
      // console.error(
      //   '[clearAllCheckoutClientState] Failed to clear primary storage keys:',
      //   _e
      // );
    }

    // Clear sessionStorage
    try {
      // console.log('[clearAllCheckoutClientState] Clearing sessionStorage...');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kpay_reference');
        // console.log(
        //   '[clearAllCheckoutClientState] ✓ kpay_reference cleared from sessionStorage'
        // );

        // Clear any other sessionStorage checkout items
        const sessionKeys = Object.keys(sessionStorage);
        const checkoutSessionKeys = sessionKeys.filter(
          key =>
            key.toLowerCase().includes('checkout') ||
            key.toLowerCase().includes('payment') ||
            key.toLowerCase().includes('kpay')
        );
        checkoutSessionKeys.forEach(key => {
          try {
            sessionStorage.removeItem(key);
            // console.log(
            //   `[clearAllCheckoutClientState] ✓ Session key cleared: ${key}`
            // );
          } catch (_e) {
            // console.error(
            //   `[clearAllCheckoutClientState] Failed to clear session key ${key}:`,
            //   _e
            // );
          }
        });
      }
    } catch (_e) {
      // console.error(
      //   '[clearAllCheckoutClientState] Failed to clear sessionStorage:',
      //   _e
      // );
    }

    // Clear cart from localStorage
    try {
      // console.log(
      //   '[clearAllCheckoutClientState] Clearing cart from localStorage...'
      // );
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
        // console.log(
        //   '[clearAllCheckoutClientState] ✓ cart cleared from localStorage'
        // );
      }
    } catch (_e) {
      // console.error('[clearAllCheckoutClientState] Failed to clear cart:', _e);
    }

    // console.log(
    //   '[clearAllCheckoutClientState] ✓ All checkout client state cleared successfully'
    // );
  }, [clearCheckoutStorage]);

  return {
    loadCheckoutFromStorage,
    saveCheckoutToStorage,
    clearCheckoutStorage,
    clearAllCheckoutClientState,
    preventPersistenceRef,
  };
}

export default useCheckoutStorage;
