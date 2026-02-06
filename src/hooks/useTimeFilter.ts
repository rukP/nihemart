'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { formatLocalDate, parseLocalDate } from '@/lib/format';

export type TimeFilterPreset = 'all' | 'today' | 'custom';

export interface TimeFilterState {
  preset: TimeFilterPreset;
  from: Date | null;
  to: Date | null;
}

export interface TimeFilterDateRange {
  from?: string;
  to?: string;
}

export interface UseTimeFilterOptions {
  /** Whether to persist filter state to URL (default: true) */
  persistToUrl?: boolean;
  /** Default preset if none in URL (default: "today") */
  defaultPreset?: TimeFilterPreset;
  /** Key prefix for URL params to avoid conflicts (default: none) */
  paramPrefix?: string;
}

export interface UseTimeFilterReturn {
  /** Current filter state for the TimeFilter component */
  timeFilter: TimeFilterState;
  /** Set the time filter (handles URL sync automatically) */
  setTimeFilter: (value: TimeFilterState) => void;
  /** Date range in string format for API calls */
  dateRange: TimeFilterDateRange;
  /** API-ready date range with proper ISO timestamps */
  apiDateRange: { dateFrom?: string; dateTo?: string };
  /** Reset to default (today) */
  reset: () => void;
}

/**
 * Custom hook for managing time filter state with optional URL persistence.
 * Designed to avoid infinite loops that occur with naive useEffect + router.replace patterns.
 *
 * Key design decisions:
 * 1. Uses a ref to track if we're updating from URL to prevent feedback loops
 * 2. Only updates URL on explicit user actions, not on every state change
 * 3. Reads URL params once on mount, then manages state locally
 * 4. Provides both UI state and API-ready date formats
 */
export function useTimeFilter(
  options: UseTimeFilterOptions = {}
): UseTimeFilterReturn {
  const {
    persistToUrl = true,
    defaultPreset = 'today',
    paramPrefix = '',
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track if we're currently syncing to prevent loops
  const isSyncing = useRef(false);
  // Track if initial URL read has been done
  const hasInitialized = useRef(false);

  // Helper to get param names (with optional prefix)
  const getParamName = (name: string) =>
    paramPrefix ? `${paramPrefix}_${name}` : name;

  // Create default "today" state
  const createTodayState = useCallback((): TimeFilterState => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { preset: 'today', from: today, to: tomorrow };
  }, []);

  // Create "all" state
  const createAllState = useCallback((): TimeFilterState => {
    return { preset: 'all', from: null, to: null };
  }, []);

  // Parse URL params into state (only called once on mount)
  const parseUrlToState = useCallback((): TimeFilterState => {
    if (!searchParams) {
      return defaultPreset === 'today' ? createTodayState() : createAllState();
    }

    const preset = searchParams.get(
      getParamName('preset')
    ) as TimeFilterPreset | null;
    const fromStr = searchParams.get(getParamName('from'));
    const toStr = searchParams.get(getParamName('to'));

    if (preset === 'all' || (!preset && defaultPreset === 'all')) {
      return createAllState();
    }

    if (preset === 'today' || (!preset && defaultPreset === 'today')) {
      if (fromStr) {
        const start = parseLocalDate(fromStr);
        if (start) {
          const end = new Date(start);
          end.setDate(end.getDate() + 1);
          return { preset: 'today', from: start, to: end };
        }
      }
      return createTodayState();
    }

    if (preset === 'custom' && fromStr && toStr) {
      const start = parseLocalDate(fromStr);
      const end = parseLocalDate(toStr);
      if (start && end) {
        // Add one day to end for exclusive range
        const exclusiveEnd = new Date(end);
        exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
        return { preset: 'custom', from: start, to: exclusiveEnd };
      }
    }

    return defaultPreset === 'today' ? createTodayState() : createAllState();
  }, [
    searchParams,
    defaultPreset,
    createTodayState,
    createAllState,
    getParamName,
  ]);

  // Initialize state from URL on first render only
  const [timeFilter, setTimeFilterInternal] = useState<TimeFilterState>(() => {
    return parseUrlToState();
  });

  // Compute date range strings for display/API
  const dateRange: TimeFilterDateRange = (() => {
    if (timeFilter.preset === 'all' || !timeFilter.from) {
      return {};
    }
    return {
      from: formatLocalDate(timeFilter.from),
      to: timeFilter.to
        ? formatLocalDate(new Date(timeFilter.to.getTime() - 1))
        : undefined, // Inclusive display
    };
  })();

  // Compute API-ready date range with ISO timestamps
  const apiDateRange = (() => {
    if (timeFilter.preset === 'all' || !timeFilter.from) {
      return {};
    }
    return {
      dateFrom: timeFilter.from.toISOString(),
      dateTo: timeFilter.to?.toISOString(),
    };
  })();

  // Update URL without causing re-render loops
  const updateUrl = useCallback(
    (state: TimeFilterState) => {
      if (!persistToUrl || isSyncing.current) return;

      isSyncing.current = true;

      try {
        const params = new URLSearchParams(searchParams?.toString() || '');

        if (state.preset === 'all') {
          params.delete(getParamName('preset'));
          params.delete(getParamName('from'));
          params.delete(getParamName('to'));
        } else {
          params.set(getParamName('preset'), state.preset);
          if (state.from) {
            params.set(getParamName('from'), formatLocalDate(state.from));
          }
          if (state.to) {
            // For URL, store the inclusive end date
            const inclusiveTo = new Date(state.to);
            if (state.preset === 'today') {
              // For today, from and to are the same day
              params.set(getParamName('to'), formatLocalDate(state.from!));
            } else {
              // For custom, subtract one day from exclusive to get inclusive
              inclusiveTo.setDate(inclusiveTo.getDate() - 1);
              params.set(getParamName('to'), formatLocalDate(inclusiveTo));
            }
          }
        }

        // Reset page when filter changes
        params.set('page', '1');

        const queryString = params.toString();
        const url = queryString
          ? `${pathname}?${queryString}`
          : pathname || '/';

        // Use replace to avoid adding to history
        router.replace(url, { scroll: false });
      } finally {
        // Reset syncing flag after a short delay to allow navigation to complete
        setTimeout(() => {
          isSyncing.current = false;
        }, 100);
      }
    },
    [persistToUrl, pathname, router, searchParams, getParamName]
  );

  // Public setter that handles URL sync
  const setTimeFilter = useCallback(
    (value: TimeFilterState) => {
      setTimeFilterInternal(value);
      updateUrl(value);
    },
    [updateUrl]
  );

  // Reset to default
  const reset = useCallback(() => {
    const defaultState =
      defaultPreset === 'today' ? createTodayState() : createAllState();
    setTimeFilter(defaultState);
  }, [defaultPreset, createTodayState, createAllState, setTimeFilter]);

  // Mark as initialized after first render
  useEffect(() => {
    hasInitialized.current = true;
  }, []);

  return {
    timeFilter,
    setTimeFilter,
    dateRange,
    apiDateRange,
    reset,
  };
}

/**
 * Simplified version that doesn't persist to URL.
 * Use this when you don't need URL synchronization.
 */
export function useLocalTimeFilter(
  defaultPreset: TimeFilterPreset = 'today'
): UseTimeFilterReturn {
  return useTimeFilter({ persistToUrl: false, defaultPreset });
}
