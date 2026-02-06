import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/hooks/useAuth';

export type AppRole =
  | 'admin'
  | 'user'
  | 'rider'
  | 'manager'
  | 'staff'
  | 'stock_manager';

interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  setAuthData: (data: AuthData) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  clearAuth: () => void;
  hasRole: (role: AppRole) => boolean;
  initialize: () => Promise<void>;
  // Computed getter for token (for API interceptor)
  token: string | null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: true,
      token: null,

      setAuthData: (data: AuthData) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          token: data.accessToken, // Alias for API interceptor
          loading: false,
        });

        // Set cookie for middleware access (if in browser)
        if (typeof window !== 'undefined') {
          document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
          // Initialize Socket.IO connection after login
          const { initializeSocket } = require('@/lib/socket');
          initializeSocket();
        }
      },

      setUser: user => set({ user }),

      setToken: token => {
        set({ accessToken: token, token });
        // Reconnect socket with new token if it changed
        if (typeof window !== 'undefined') {
          const { reconnectSocket } = require('@/lib/socket');
          reconnectSocket();
        }
      },

      setRefreshToken: refreshToken => {
        set({ refreshToken });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          token: null,
          loading: false,
        });
        // Clear localStorage and cookies
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          // Clear auth cookie
          document.cookie = 'auth-token=; path=/; max-age=0';
          // Disconnect socket on logout
          const { disconnectSocket } = require('@/lib/socket');
          disconnectSocket();
        }
      },

      hasRole: (role: AppRole) => {
        const user = get().user;
        if (!user) return false;
        if (!user.roles || !Array.isArray(user.roles)) return false;
        return user.roles.includes(role);
      },

      initialize: async () => {
        try {
          set({ loading: true });

          // Check if we have stored tokens
          const { accessToken, refreshToken, user } = get();

          if (accessToken && user) {
            // We have stored auth data, verify it's still valid
            try {
              const { authorizedAPI } = await import('@/lib/api');
              const handleApiRequest = (await import('@/lib/handleApiRequest'))
                .default;

              const response = await handleApiRequest(() =>
                authorizedAPI.get('/auth/me')
              );

              // Update user data in case roles changed
              set({
                user: response.user,
                loading: false,
              });
            } catch (_error) {
              // Token might be expired, try to refresh
              if (refreshToken) {
                try {
                  const { unauthorizedAPI } = await import('@/lib/api');
                  const handleApiRequest = (
                    await import('@/lib/handleApiRequest')
                  ).default;

                  const response = await handleApiRequest(() =>
                    unauthorizedAPI.post('/auth/refresh', {
                      refreshToken,
                    })
                  );

                  set({
                    user: response.user,
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken,
                    token: response.accessToken,
                    loading: false,
                  });

                  // Reconnect socket with new token
                  if (typeof window !== 'undefined') {
                    const { reconnectSocket } = require('@/lib/socket');
                    reconnectSocket();
                  }
                } catch (_refreshError) {
                  // Refresh failed, clear auth
                  get().clearAuth();
                }
              } else {
                // No refresh token, clear auth
                get().clearAuth();
              }
            }
          } else {
            // No stored auth data
            set({ loading: false });
          }
        } catch (_error) {
          console.error('Error initializing auth:', _error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Update token alias when accessToken changes
useAuthStore.subscribe(state => {
  if (state.accessToken !== state.token) {
    useAuthStore.setState({ token: state.accessToken });
  }
});
