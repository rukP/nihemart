import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentUser } from "@/hooks/useAuth";
import { getTimeUntilExpiration, isTokenExpiringSoon } from "@/utils/jwt";

// The AuthProvider handles initialization and token refresh
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { initialize, setAuthData, clearAuth } = useAuthStore();
  
  // useCurrentUser will only run if token exists (enabled: !!token)
  // This should be safe as long as QueryClientProvider wraps this component
  const { data: currentUser, error } = useCurrentUser();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    // Initialize auth state from persisted storage
    const handleInitialization = async () => {
      try {
        await initialize();
      } catch (e) {
        console.warn("Auth initialization failed:", e);
      }
    };

    void handleInitialization();
  }, [initialize]);

  // Sync current user from React Query with auth store
  useEffect(() => {
    if (currentUser) {
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (accessToken && refreshToken) {
        setAuthData({
          accessToken,
          refreshToken,
          user: currentUser,
        });
      }
    } else if (error) {
      // If fetching current user fails, try to refresh token
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        const refreshAuth = async () => {
          try {
            const { unauthorizedAPI } = await import("@/lib/api");
            const handleApiRequest = (await import("@/lib/handleApiRequest"))
              .default;

            const response = await handleApiRequest(() =>
              unauthorizedAPI.post("/auth/refresh", {
                refreshToken,
              })
            );

            setAuthData({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              user: response.user,
            });
          } catch (refreshError) {
            // Refresh failed, clear auth
            clearAuth();
          }
        };
        void refreshAuth();
      } else {
        // No refresh token, clear auth
        clearAuth();
      }
    }
  }, [currentUser, error, setAuthData, clearAuth]);

  // Set up automatic token refresh based on token expiration
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastAccessToken: string | null = null;

    const scheduleRefresh = () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const { accessToken, refreshToken } = useAuthStore.getState();
      
      if (!accessToken || !refreshToken) {
        return;
      }

      // Only reschedule if token actually changed
      if (accessToken === lastAccessToken && timeoutId !== null) {
        return;
      }
      lastAccessToken = accessToken;

      const timeUntilExpiration = getTimeUntilExpiration(accessToken);
      
      if (!timeUntilExpiration) {
        // Token is already expired or invalid, refresh immediately
        refreshTokenNow();
        return;
      }

      // Refresh token 1 hour before it expires (or immediately if less than 1 hour remaining)
      const refreshTime = Math.max(timeUntilExpiration - 3600 * 1000, 60000); // At least 1 minute delay

      timeoutId = setTimeout(
        async () => {
          await refreshTokenNow();
        },
        refreshTime
      );
    };

    const refreshTokenNow = async () => {
      try {
        const { refreshToken: currentRefreshToken, accessToken: currentAccessToken } =
          useAuthStore.getState();
        
        if (!currentRefreshToken) {
          clearAuth();
          return;
        }

        // Only refresh if token is expiring soon or already expired
        if (currentAccessToken && !isTokenExpiringSoon(currentAccessToken, 3600)) {
          // Token is still valid, reschedule
          scheduleRefresh();
          return;
        }

        const { unauthorizedAPI } = await import("@/lib/api");
        const handleApiRequest = (await import("@/lib/handleApiRequest"))
          .default;

        const response = await handleApiRequest(() =>
          unauthorizedAPI.post("/auth/refresh", {
            refreshToken: currentRefreshToken,
          })
        );

        setAuthData({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        });

        // Reschedule after successful refresh (will be triggered by store update)
        lastAccessToken = null; // Reset to allow rescheduling
      } catch (error) {
        console.error("Token refresh failed:", error);
        clearAuth();
      }
    };

    // Subscribe to store changes to reschedule when tokens update
    const unsubscribe = useAuthStore.subscribe(
      (state) => {
        const { accessToken, refreshToken } = state;
        // Only reschedule if tokens changed
        if (accessToken !== lastAccessToken && accessToken && refreshToken) {
          scheduleRefresh();
        }
      }
    );

    // Initial schedule
    scheduleRefresh();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [setAuthData, clearAuth]);

  return <>{children}</>;
};
