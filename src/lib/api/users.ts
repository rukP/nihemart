import { authorizedAPI } from '../api';
import handleApiRequest from '@/lib/handleApiRequest';

export type AppRole =
  | 'admin'
  | 'user'
  | 'rider'
  | 'manager'
  | 'staff'
  | 'stock_manager';

export type SortBy =
  | 'recent'
  | 'oldest'
  | 'time_registered_asc'
  | 'time_registered_desc'
  | 'most_orders'
  | 'highest_spend'
  | 'lowest_spend';

export interface UserRow {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  createdAt?: string;
  roles?: AppRole[];
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
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  users: UserRow[];
  total_count?: number;
  count?: number;
  role_counts?: Record<string, number>;
}

// Internal API functions
const userAPI = {
  // Get all users (admin only)
  getAllUsers: async (filters: UserFilters = {}): Promise<UsersResponse> => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.role) params.append('role', filters.role);

    // Always send sort parameter
    const sortValue = filters.sortBy || 'recent';
    params.append('sort', sortValue);
    // console.log(
    //   '[API] Sort parameter:',
    //   sortValue,
    //   'from filters.sortBy:',
    //   filters.sortBy
    // );

    if (filters.fromDate)
      params.append('from_date', filters.fromDate.toISOString());
    if (filters.toDate) params.append('to_date', filters.toDate.toISOString());
    if (filters.search) params.append('q', filters.search);
    if (filters.minOrders !== null && filters.minOrders !== undefined) {
      params.append('min_orders', String(filters.minOrders));
    }
    if (filters.maxOrders !== null && filters.maxOrders !== undefined) {
      params.append('max_orders', String(filters.maxOrders));
    }
    if (filters.minSpend !== null && filters.minSpend !== undefined) {
      params.append('min_spend', String(filters.minSpend));
    }
    if (filters.maxSpend !== null && filters.maxSpend !== undefined) {
      params.append('max_spend', String(filters.maxSpend));
    }

    const queryString = params.toString();
    // console.log('[API] Fetching users with filters:', {
    //   filters,
    //   queryString,
    // });
    return handleApiRequest(() =>
      authorizedAPI.get(`/users${queryString ? `?${queryString}` : ''}`)
    );
  },

  // Get user by ID (admin only)
  getUserById: async (id: string): Promise<UserRow> => {
    return handleApiRequest(() => authorizedAPI.get(`/users/${id}`));
  },

  // Create user (admin only)
  createUser: async (data: {
    email: string;
    password: string;
    fullName?: string;
    role?: string;
  }): Promise<UserRow> => {
    return handleApiRequest(() => authorizedAPI.post('/users', data));
  },

  // Update user (admin only)
  updateUser: async (
    id: string,
    updates: {
      fullName?: string;
      email?: string;
      password?: string;
    }
  ): Promise<UserRow> => {
    return handleApiRequest(() => authorizedAPI.put(`/users/${id}`, updates));
  },

  // Update user role (admin only)
  updateUserRole: async (id: string, role: AppRole): Promise<UserRow> => {
    return handleApiRequest(() =>
      authorizedAPI.put(`/users/${id}/role`, { role })
    );
  },

  // Delete user (admin only)
  deleteUser: async (id: string): Promise<{ message: string }> => {
    return handleApiRequest(() => authorizedAPI.delete(`/users/${id}`));
  },
};

export default userAPI;
