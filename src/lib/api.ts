import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import { isTokenExpiringSoon } from "@/utils/jwt";

// Base URL for Next.js environment
export const API_BASE =
   process.env.NEXT_PUBLIC_API_BASE ||
   process.env.NEXT_PUBLIC_API_URL ||
   "https://api.nihemart.rw/api";

const commonHeaders = {
   "Content-Type": "application/json",
};

// Unauthorized instance for public endpoints
export const unauthorizedAPI: AxiosInstance = axios.create({
   baseURL: API_BASE,
   headers: commonHeaders,
});

// Authorized instance that attaches token from auth store
export const authorizedAPI: AxiosInstance = axios.create({
   baseURL: API_BASE,
   headers: commonHeaders,
});

authorizedAPI.interceptors.request.use((config) => {
   try {
      const token = useAuthStore.getState().token;
      if (token) {
         if (!config.headers) config.headers = {} as any;
         (config.headers as any).Authorization = `Bearer ${token}`;
      }
   } catch (e) {
      // ignore
   }
   return config;
});

// Also attach token to unauthorizedAPI if available (for optionalAuth endpoints)
unauthorizedAPI.interceptors.request.use((config) => {
   try {
      const token = useAuthStore.getState().token;
      if (token) {
         if (!config.headers) config.headers = {} as any;
         (config.headers as any).Authorization = `Bearer ${token}`;
      }
   } catch (e) {
      // ignore
   }
   return config;
});

// Response interceptor to handle 401 errors and auto-refresh tokens
let isRefreshing = false;
let failedQueue: Array<{
   resolve: (value?: any) => void;
   reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
   failedQueue.forEach((prom) => {
      if (error) {
         prom.reject(error);
      } else {
         prom.resolve(token);
      }
   });
   failedQueue = [];
};

authorizedAPI.interceptors.response.use(
   (response) => response,
   async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
         _retry?: boolean;
      };

      // If error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
         if (isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
               failedQueue.push({ resolve, reject });
            })
               .then((token) => {
                  if (originalRequest.headers) {
                     originalRequest.headers.Authorization = `Bearer ${token}`;
                  }
                  return authorizedAPI(originalRequest);
               })
               .catch((err) => {
                  return Promise.reject(err);
               });
         }

         originalRequest._retry = true;
         isRefreshing = true;

         const { refreshToken } = useAuthStore.getState();
         if (!refreshToken) {
            isRefreshing = false;
            useAuthStore.getState().clearAuth();
            processQueue(new Error("No refresh token"), null);
            return Promise.reject(error);
         }

         try {
            const { unauthorizedAPI } = await import("@/lib/api");
            const handleApiRequest = (await import("@/lib/handleApiRequest"))
               .default;

            const response = await handleApiRequest(() =>
               unauthorizedAPI.post("/auth/refresh", {
                  refreshToken,
               })
            );

            const { setAuthData } = useAuthStore.getState();
            setAuthData({
               accessToken: response.accessToken,
               refreshToken: response.refreshToken,
               user: response.user,
            });

            if (originalRequest.headers) {
               originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
            }

            processQueue(null, response.accessToken);
            isRefreshing = false;

            return authorizedAPI(originalRequest);
         } catch (refreshError) {
            isRefreshing = false;
            useAuthStore.getState().clearAuth();
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
         }
      }

      return Promise.reject(error);
   }
);

// Check token expiration before making requests and refresh if needed
let isRefreshingInInterceptor = false;
const refreshTokenIfNeeded = async () => {
   // Prevent concurrent refresh attempts
   if (isRefreshingInInterceptor) {
      return;
   }

   const { accessToken, refreshToken } = useAuthStore.getState();

   if (!accessToken || !refreshToken) return;

   // Check if token is expiring soon (within 1 hour)
   if (isTokenExpiringSoon(accessToken, 3600)) {
      isRefreshingInInterceptor = true;
      try {
         const { unauthorizedAPI } = await import("@/lib/api");
         const handleApiRequest = (await import("@/lib/handleApiRequest"))
            .default;

         const response = await handleApiRequest(() =>
            unauthorizedAPI.post("/auth/refresh", {
               refreshToken,
            })
         );

         const { setAuthData } = useAuthStore.getState();
         setAuthData({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
         });
      } catch (error) {
         console.error("Failed to refresh token:", error);
         useAuthStore.getState().clearAuth();
      } finally {
         isRefreshingInInterceptor = false;
      }
   }
};

// Add pre-request interceptor to check and refresh token if needed
// Only check periodically to avoid too many checks
let lastTokenCheck = 0;
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

authorizedAPI.interceptors.request.use(
   async (config) => {
      const now = Date.now();
      // Only check token expiration every 5 minutes to avoid excessive checks
      if (now - lastTokenCheck > TOKEN_CHECK_INTERVAL) {
         lastTokenCheck = now;
         await refreshTokenIfNeeded();
      }
      return config;
   },
   (error) => {
      return Promise.reject(error);
   }
);

// Export default small helper for backward compatibility (not used by new files)
export default authorizedAPI;
