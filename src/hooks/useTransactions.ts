import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAllTransactions,
  getTransactionStats,
  fetchTransactionById,
  type TransactionQueryOptions,
  type Transaction,
  type TransactionStats,
} from "@/integrations/supabase/transactions";

// Query Keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (options: TransactionQueryOptions) =>
    [...transactionKeys.lists(), options] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  stats: () => [...transactionKeys.all, "stats"] as const,
};

// Hook for fetching all transactions (admin only)
export function useTransactions(options: TransactionQueryOptions = {}) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: transactionKeys.list(options),
    queryFn: () => {
      console.log("Executing fetchAllTransactions with options:", options);
      return fetchAllTransactions(options);
    },
    enabled: !!user && hasRole("admin"),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for transaction statistics (admin only)
export function useTransactionStats() {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: getTransactionStats,
    enabled: !!user && hasRole("admin"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for transaction counts by status (admin only)
export function useTransactionCounts() {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: ['transactionCounts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/transactions/counts');
      if (!response.ok) {
        throw new Error('Failed to fetch transaction counts');
      }
      return response.json();
    },
    enabled: !!user && hasRole("admin"),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for fetching single transaction
export function useTransaction(id: string) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => fetchTransactionById(id),
    enabled: !!user && hasRole("admin") && !!id,
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