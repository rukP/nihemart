"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

// Create a default query client with optimized caching defaults
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry strategy: retry once for network errors, not for 4xx errors
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 1 time for network/server errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Caching strategy
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - cache persists for 30 minutes (formerly cacheTime)
      
      // Refetch behavior
      refetchOnWindowFocus: false, // Don't refetch on window focus (better UX)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts (if stale)
      
      // Structural sharing for better performance
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once for network errors
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Use useState to ensure QueryClient is created only once per component instance
  const [queryClient] = useState(() => defaultQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
