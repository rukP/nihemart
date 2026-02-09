'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// ORDERS ENABLED HOOK
// Fetches and tracks the orders_enabled flag from the server.
// Handles schedule-based ordering restrictions and confirmation state.
// ============================================================================

export type OrdersSource = 'admin' | 'schedule' | null;

export interface UseOrdersEnabledReturn {
  // Orders enabled state
  ordersEnabled: boolean | null;
  ordersSource: OrdersSource;
  ordersDisabledMessage: string | null;

  // Schedule confirmation state (when orders disabled by schedule)
  scheduleConfirmChecked: boolean;
  setScheduleConfirmChecked: (checked: boolean) => void;
  scheduleNotes: string;
  setScheduleNotes: (notes: string) => void;
}

export function useOrdersEnabled(): UseOrdersEnabledReturn {
  const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
  const [ordersSource, setOrdersSource] = useState<OrdersSource>(null);
  const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
    string | null
  >(null);

  // Schedule confirmation state
  const [scheduleConfirmChecked, setScheduleConfirmChecked] = useState(false);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  // Fetch orders_enabled flag on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/admin/settings/orders-enabled');
        if (!res.ok) {
          if (mounted) {
            setOrdersEnabled(null);
            setOrdersSource(null);
            setOrdersDisabledMessage(null);
          }
        } else {
          const j = await res.json();
          if (mounted) {
            setOrdersEnabled(Boolean(j.enabled));
            setOrdersSource(j.source || null);
            setOrdersDisabledMessage(j.message || null);
          }
        }
      } catch (_err) {
        // console.warn('Failed to fetch orders_enabled flag:', _err);
        if (mounted) {
          setOrdersEnabled(null);
          setOrdersSource(null);
          setOrdersDisabledMessage(null);
        }
      }
    })();

    // No polling - schedule will handle updates at 9:00 and 9:30 Kigali time
    // Frontend will get updated values on page refresh or navigation
    return () => {
      mounted = false;
    };
  }, []);

  return {
    ordersEnabled,
    ordersSource,
    ordersDisabledMessage,
    scheduleConfirmChecked,
    setScheduleConfirmChecked,
    scheduleNotes,
    setScheduleNotes,
  };
}

export default useOrdersEnabled;
