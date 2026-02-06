import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { TransactionQueryOptions } from '@/types/transactions';

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (options: TransactionQueryOptions) =>
    [...transactionKeys.lists(), options] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  stats: () => [...transactionKeys.all, 'stats'] as const,
};

// Hook for fetching all transactions (admin only)
export function useTransactions(options: TransactionQueryOptions = {}) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: transactionKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', String(options.page));
      if (options.limit) params.append('limit', String(options.limit));
      if (options.status) params.append('status', options.status);
      if (options.payment_method)
        params.append('payment_method', options.payment_method);
      if (options.source) params.append('source', options.source);
      if (options.search) params.append('search', options.search);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await fetch(
        `/api/admin/transactions?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: !!user && hasRole('admin'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    placeholderData: previousData => previousData,
  });
}

// Hook for transaction statistics (admin only)
export function useTransactionStats(
  options: {
    startDate?: string;
    endDate?: string;
    status?: string;
    payment_method?: string;
    source?: string;
  } = {}
) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: [...transactionKeys.stats(), options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.startDate) params.append('from', options.startDate);
      if (options.endDate) params.append('to', options.endDate);
      if (options.status) params.append('status', options.status);
      if (options.payment_method)
        params.append('payment_method', options.payment_method);
      if (options.source) params.append('source', options.source);
      const qs = params.toString();
      const url = `/api/admin/transactions/stats${qs ? `?${qs}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction statistics');
      }
      return response.json();
    },
    enabled: !!user && hasRole('admin'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - stats don't change as frequently
    placeholderData: previousData => previousData,
  });
}

// Hook for transaction counts by status (admin only)
export function useTransactionCounts(
  options: {
    startDate?: string;
    endDate?: string;
    payment_method?: string;
    source?: string;
  } = {}
) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: ['transactionCounts', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.startDate) params.append('from', options.startDate);
      if (options.endDate) params.append('to', options.endDate);
      if (options.payment_method)
        params.append('payment_method', options.payment_method);
      if (options.source) params.append('source', options.source);
      const qs = params.toString();
      const url = `/api/admin/transactions/counts${qs ? `?${qs}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction counts');
      }
      return response.json();
    },
    enabled: !!user && hasRole('admin'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    placeholderData: previousData => previousData,
  });
}

// Hook for fetching single transaction
export function useTransaction(id: string) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      // For now, fetch from transactions list and filter by ID
      // Or use a dedicated endpoint if available
      const response = await fetch(
        `/api/admin/transactions?search=${id}&limit=1`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }
      const data = await response.json();
      return data.transactions?.[0] || null;
    },
    enabled: !!user && hasRole('admin') && !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    placeholderData: previousData => previousData,
  });
}

// Hook for invalidating transaction queries
export function useTransactionActions() {
  const queryClient = useQueryClient();

  const invalidateTransactions = () => {
    queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
  };

  const invalidateTransactionStats = () => {
    queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
  };

  const invalidateTransaction = (id: string) => {
    queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
  };

  return {
    invalidateTransactions,
    invalidateTransactionStats,
    invalidateTransaction,
  };
}
