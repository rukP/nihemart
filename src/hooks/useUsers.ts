'use client';

import { useState, useCallback, useEffect } from 'react';
import userAPI, {
  AppRole,
  SortBy,
  UserRow,
  UserFilters,
} from '@/lib/api/users';

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
    sortBy: 'recent',
    fromDate: null,
    toDate: null,
    minOrders: null,
    maxOrders: null,
    minSpend: null,
    maxSpend: null,
    search: '',
  });

  // Fetch all users from backend API with filters and sorting applied
  const fetchUsers = useCallback(
    async (
      p: number = page,
      l: number = limit,
      appliedFilters: UserFilters = filters
    ) => {
      setLoading(true);
      setError(null);
      console.log('[fetchUsers] Called with:', { p, l, appliedFilters });

      try {
        const response = await userAPI.getAllUsers({
          ...appliedFilters,
          page: p,
          limit: l,
        });
        console.log('[fetchUsers] Got response:', response);

        // Backend returns { users: [...], count: X, total_count: Y, role_counts: {...} }
        const usersArray = response.users || [];

        // Map users to consistent format
        const apiUsers = usersArray.map((u: any) => {
          // Users from /api/admin/list-users have snake_case fields
          const roles = u.roles || (u.role ? [u.role] : []);
          const primaryRole = u.role || roles[0] || 'user';

          return {
            id: u.id,
            email: u.email || '',
            full_name: u.full_name || u.fullName || '',
            phone: u.phone || '',
            created_at: u.created_at || u.createdAt,
            role: primaryRole as AppRole,
            roles: roles, // Keep roles array for filtering
            orderCount: Number(u.order_count || 0),
            totalSpend: Number(u.total_spend || 0),
          };
        });

        setUsers(apiUsers);
        setTotalCount(response.total_count ?? usersArray.length);
        setFilteredCount(response.count ?? usersArray.length);

        // Store role counts from API
        if (response.role_counts) {
          setRoleCounts(response.role_counts);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to fetch users');
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
    console.log(
      '[useUsers] useEffect triggered. Current filters:',
      filters,
      'Page:',
      page,
      'Limit:',
      limit
    );
    fetchUsers(page, limit, filters);
  }, [page, limit, filters, fetchUsers]);

  // Update sort filter
  const setSortBy = useCallback((sortBy: SortBy) => {
    console.log('[useUsers] setSortBy called with:', sortBy);
    setFilters(prev => ({ ...prev, sortBy }));
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Update role filter
  const setRoleFilter = useCallback((role: AppRole | null) => {
    setFilters(prev => ({ ...prev, role }));
    setPage(1);
  }, []);

  // Update date range filter
  const setDateRange = useCallback(
    (fromDate: Date | null, toDate: Date | null) => {
      setFilters(prev => ({ ...prev, fromDate, toDate }));
      setPage(1);
    },
    []
  );

  // Update search filter
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  }, []);

  // Update order count filter
  const setOrderCountFilter = useCallback(
    (minOrders: number | null, maxOrders: number | null) => {
      setFilters(prev => ({ ...prev, minOrders, maxOrders }));
      setPage(1);
    },
    []
  );

  // Update spend filter
  const setSpendFilter = useCallback(
    (minSpend: number | null, maxSpend: number | null) => {
      setFilters(prev => ({ ...prev, minSpend, maxSpend }));
      setPage(1);
    },
    []
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      role: null,
      sortBy: 'recent',
      fromDate: null,
      toDate: null,
      minOrders: null,
      maxOrders: null,
      minSpend: null,
      maxSpend: null,
      search: '',
    });
    setPage(1);
  }, []);

  // Update user role
  const updateUserRole = useCallback(
    async (userId: string, role: AppRole) => {
      setLoading(true);
      setError(null);
      try {
        await userAPI.updateUserRole(userId, role);
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || 'Failed to update role');
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers, page, limit, filters]
  );

  // Delete user (hard delete - backend doesn't support soft delete)
  const deleteUser = useCallback(
    async (userId: string, _hardDelete = false) => {
      setLoading(true);
      setError(null);
      try {
        await userAPI.deleteUser(userId);
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || 'Failed to delete user');
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
