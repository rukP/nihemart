"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "user"
  | "rider"
  | "manager"
  | "staff"
  | "stock_manager";
export type SortBy =
  | "recent"
  | "oldest"
  | "time_registered_asc"
  | "time_registered_desc"
  | "most_orders"
  | "highest_spend"
  | "lowest_spend";

export interface UserRow {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  created_at?: string;
  role?: AppRole;
  orderCount?: number;
  totalSpend?: number;
}

export interface UserFilters {
  role?: AppRole | null;
  sortBy?: SortBy;
  fromDate?: Date | null;
  toDate?: Date | null;
  minOrders?: number | null;
  maxOrders?: number | null;
  minSpend?: number | null;
  maxSpend?: number | null;
  search?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<UserFilters>({
    role: null,
    sortBy: "recent",
    fromDate: null,
    toDate: null,
    minOrders: null,
    maxOrders: null,
    minSpend: null,
    maxSpend: null,
    search: "",
  });

  // Fetch all users from API with filters and sorting applied
  const fetchUsers = useCallback(
    async (
      p: number = page,
      l: number = limit,
      appliedFilters: UserFilters = filters
    ) => {
      setLoading(true);
      setError(null);

      try {
        const q = new URLSearchParams();
        // Always pass page and limit for proper pagination
        q.set("page", String(p));
        q.set("limit", String(l));

        // Add role filter
        if (appliedFilters.role) {
          q.set("role", appliedFilters.role);
        }

        // Add filter parameters
        if (appliedFilters.sortBy) {
          q.set("sort", appliedFilters.sortBy);
        }
        if (appliedFilters.fromDate) {
          q.set("from_date", appliedFilters.fromDate.toISOString());
        }
        if (appliedFilters.toDate) {
          q.set("to_date", appliedFilters.toDate.toISOString());
        }
        if (appliedFilters.search) {
          q.set("q", String(appliedFilters.search));
        }
        if (
          appliedFilters.minOrders !== null &&
          appliedFilters.minOrders !== undefined
        ) {
          q.set("min_orders", String(appliedFilters.minOrders));
        }
        if (
          appliedFilters.maxOrders !== null &&
          appliedFilters.maxOrders !== undefined
        ) {
          q.set("max_orders", String(appliedFilters.maxOrders));
        }
        if (
          appliedFilters.minSpend !== null &&
          appliedFilters.minSpend !== undefined
        ) {
          q.set("min_spend", String(appliedFilters.minSpend));
        }
        if (
          appliedFilters.maxSpend !== null &&
          appliedFilters.maxSpend !== undefined
        ) {
          q.set("max_spend", String(appliedFilters.maxSpend));
        }

        const qs = q.toString();
        const url = `/api/admin/list-users${qs ? `?${qs}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const apiUsers = (json.users || []).map((u: any) => ({
            id: u.id,
            email: u.email || "",
            full_name: u.full_name || "",
            phone: u.phone || "",
            created_at: u.created_at,
            role: (u.role as AppRole) || "user",
            orderCount: Number(u.order_count || 0),
            totalSpend: Number(u.total_spend || 0),
          }));

          const apiCount =
            typeof json.total_count === "number" ? json.total_count : null;
          const apiFilteredCount =
            typeof json.count === "number" ? json.count : null;

          setUsers(apiUsers);
          setTotalCount(apiCount ?? apiUsers.length);
          setFilteredCount(apiFilteredCount ?? apiUsers.length);

          // Store role counts from API
          if (json.role_counts) {
            setRoleCounts(json.role_counts);
          }
          // Fallback: if API didn't provide a total_count, fetch unpaginated
          // list to obtain the real total users count. This ensures the
          // upper card shows an accurate total instead of a page-limited
          // length (e.g. 50).
          if (apiCount === null) {
            try {
              const fullRes = await fetch(`/api/admin/list-users`);
              if (fullRes.ok) {
                const fullJson = await fullRes.json();
                if (typeof fullJson.total_count === "number") {
                  setTotalCount(fullJson.total_count);
                }
              }
            } catch (e) {
              // ignore fallback errors
            }
          }
        } else {
          setError("Failed to fetch users");
          setUsers([]);
          setTotalCount(0);
          setFilteredCount(0);
        }
      } catch (e: any) {
        setError(e.message || "Failed to fetch users");
        setUsers([]);
        setTotalCount(0);
        setFilteredCount(0);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, filters]
  );

  // Auto-fetch when the hook is used in a client component so multiple
  // components don't need to call fetchUsers manually. This keeps the UX
  // simpler: components that need users will mount the hook and get data.
  useEffect(() => {
    // Fetch current page when hook mounts or page/limit/filters change
    fetchUsers(page, limit, filters);
  }, [fetchUsers]);

  // Update sort filter
  const setSortBy = useCallback((sortBy: SortBy) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Update role filter
  const setRoleFilter = useCallback((role: AppRole | null) => {
    setFilters((prev) => ({ ...prev, role }));
    setPage(1);
  }, []);

  // Update date range filter
  const setDateRange = useCallback(
    (fromDate: Date | null, toDate: Date | null) => {
      setFilters((prev) => ({ ...prev, fromDate, toDate }));
      setPage(1);
    },
    []
  );

  // Update search filter
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPage(1);
  }, []);

  // Update order count filter
  const setOrderCountFilter = useCallback(
    (minOrders: number | null, maxOrders: number | null) => {
      setFilters((prev) => ({ ...prev, minOrders, maxOrders }));
      setPage(1);
    },
    []
  );

  // Update spend filter
  const setSpendFilter = useCallback(
    (minSpend: number | null, maxSpend: number | null) => {
      setFilters((prev) => ({ ...prev, minSpend, maxSpend }));
      setPage(1);
    },
    []
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      role: null,
      sortBy: "recent",
      fromDate: null,
      toDate: null,
      minOrders: null,
      maxOrders: null,
      minSpend: null,
      maxSpend: null,
    });
    setPage(1);
  }, []);

  // Update user role
  const updateUserRole = useCallback(
    async (userId: string, role: AppRole) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/update-user-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to update role");
        }
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || "Failed to update role");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers, page, limit, filters]
  );

  // Delete user (soft delete by disabling or hard delete)
  const deleteUser = useCallback(
    async (userId: string, hardDelete = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, hardDelete }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to delete user");
        }
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || "Failed to delete user");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers, page, limit, filters]
  );

  return {
    users,
    loading,
    error,
    fetchUsers,
    page,
    limit,
    setPage,
    setLimit,
    totalCount,
    filteredCount,
    updateUserRole,
    deleteUser,
    filters,
    setSortBy,
    setRoleFilter,
    setDateRange,
    setOrderCountFilter,
    setSpendFilter,
    resetFilters,
    setSearch,
    roleCounts,
  };
}
