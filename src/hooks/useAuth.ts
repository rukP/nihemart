import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, type AppRole } from "@/store/auth.store";
import { unauthorizedAPI, authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";

// Types
export interface AuthUser {
   id: string;
   email: string;
   fullName?: string | null;
   roles: string[];
   user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: any;
   };
   created_at?: string;
}

export interface AuthResponse {
   accessToken: string;
   refreshToken: string;
   user: AuthUser;
}

export interface RegisterRequest {
   fullName?: string;
   email: string;
   password: string;
   phone?: string;
}

export interface LoginRequest {
   email: string;
   password: string;
}

// Query keys for auth
export const authKeys = {
   all: ["auth"] as const,
   currentUser: () => [...authKeys.all, "currentUser"] as const,
};

// Internal API functions (not exported, used by hooks)
const authAPI = {
   register: async (data: RegisterRequest): Promise<AuthResponse> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/register", {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
         })
      );
   },

   login: async (data: LoginRequest): Promise<AuthResponse> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/login", {
            email: data.email,
            password: data.password,
         })
      );
   },

   refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/refresh", {
            refreshToken,
         })
      );
   },

   logout: async (refreshToken: string): Promise<void> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/logout", {
            refreshToken,
         })
      );
   },

   getCurrentUser: async (): Promise<{ user: AuthUser }> => {
      return handleApiRequest(() => authorizedAPI.get("/auth/me"));
   },

   forgotPassword: async (email: string): Promise<{ message: string }> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/forgot-password", { email })
      );
   },

   resetPassword: async (
      token: string,
      password: string
   ): Promise<{ message: string }> => {
      return handleApiRequest(() =>
         unauthorizedAPI.post("/auth/reset-password", { token, password })
      );
   },

   getGoogleAuthUrl: async (
      state?: string | undefined
   ): Promise<{ url: string }> => {
      const params = state ? `?state=${encodeURIComponent(state)}` : "";
      return handleApiRequest(() =>
         unauthorizedAPI.get(`/auth/oauth/google/url${params}`)
      );
   },

   handleGoogleCallback: async (code: string): Promise<AuthResponse> => {
      return handleApiRequest(() =>
         unauthorizedAPI.get(`/auth/oauth/google/callback?code=${code}`)
      );
   },
};

/**
 * Hook to get current authenticated user
 */
export function useCurrentUser() {
   const { token } = useAuthStore();

   return useQuery({
      queryKey: authKeys.currentUser(),
      queryFn: async () => {
         const response = await authAPI.getCurrentUser();
         return response.user;
      },
      enabled: !!token,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
   });
}

/**
 * Hook for user login
 */
export function useSignIn() {
   const queryClient = useQueryClient();
   const { setAuthData, clearAuth } = useAuthStore();

   return useMutation({
      mutationFn: async (data: LoginRequest): Promise<AuthResponse> => {
         return authAPI.login(data);
      },
      onSuccess: (response) => {
         // Store tokens and user data
         setAuthData({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
         });

         // Invalidate and refetch current user
         queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      },
      onError: () => {
         clearAuth();
      },
   });
}

/**
 * Hook for user registration
 */
export function useSignUp() {
   const queryClient = useQueryClient();
   const { setAuthData, clearAuth } = useAuthStore();

   return useMutation({
      mutationFn: async (data: RegisterRequest): Promise<AuthResponse> => {
         return authAPI.register(data);
      },
      onSuccess: (response) => {
         // Store tokens and user data
         setAuthData({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
         });

         // Invalidate and refetch current user
         queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      },
      onError: () => {
         clearAuth();
      },
   });
}

/**
 * Hook for user logout
 */
export function useSignOut() {
   const queryClient = useQueryClient();
   const { refreshToken, clearAuth } = useAuthStore();

   return useMutation({
      mutationFn: async (): Promise<void> => {
         if (refreshToken) {
            await authAPI.logout(refreshToken);
         }
      },
      onSuccess: () => {
         clearAuth();
         queryClient.clear();
      },
      onError: () => {
         // Clear auth even on error
         clearAuth();
         queryClient.clear();
      },
   });
}

/**
 * Hook for refreshing access token
 */
export function useRefreshToken() {
   const {
      refreshToken: storedRefreshToken,
      setAuthData,
      clearAuth,
   } = useAuthStore();

   return useMutation({
      mutationFn: async (): Promise<AuthResponse> => {
         if (!storedRefreshToken) {
            throw new Error("No refresh token available");
         }
         return authAPI.refreshToken(storedRefreshToken);
      },
      onSuccess: (response) => {
         setAuthData({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
         });
      },
      onError: () => {
         // If refresh fails, clear auth (user needs to login again)
         clearAuth();
      },
   });
}

/**
 * Hook for forgot password
 */
export function useForgotPassword() {
   return useMutation({
      mutationFn: async (email: string) => {
         return authAPI.forgotPassword(email);
      },
   });
}

/**
 * Hook for reset password
 */
export function useResetPassword() {
   return useMutation({
      mutationFn: async (data: { token: string; password: string }) => {
         return authAPI.resetPassword(data.token, data.password);
      },
   });
}

/**
 * Hook for Google OAuth - get auth URL
 */
export function useGoogleAuthUrl() {
   return useMutation<{ url: string }, Error, string | undefined>({
      mutationFn: async (state: string | undefined) => {
         return authAPI.getGoogleAuthUrl(state);
      },
   });
}

/**
 * Hook for Google OAuth - handle callback
 */
export function useGoogleCallback() {
   const queryClient = useQueryClient();
   const { setAuthData, clearAuth } = useAuthStore();

   return useMutation({
      mutationFn: async (code: string): Promise<AuthResponse> => {
         return authAPI.handleGoogleCallback(code);
      },
      onSuccess: (response) => {
         setAuthData({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
         });
         queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      },
      onError: () => {
         clearAuth();
      },
   });
}

/**
 * Main useAuth hook - compatibility wrapper for existing components
 * Returns user, roles, loading, signIn, signUp, and signOut functions
 */
export function useAuth() {
   const { user, loading, hasRole } = useAuthStore();
   const { mutateAsync: signOutMutation } = useSignOut();
   const { mutateAsync: signInMutation } = useSignIn();
   const { mutateAsync: signUpMutation } = useSignUp();
   const { data: currentUser } = useCurrentUser();

   // Use current user from React Query if available, otherwise use store
   const authUser = currentUser || user;

   // Convert roles array to Set for compatibility
   const roles = authUser
      ? new Set(authUser.roles as AppRole[])
      : new Set<AppRole>();

   return {
      user: authUser,
      roles,
      loading,
      isLoggedIn: !!authUser,
      session: authUser ? { user: authUser } : null,
      signIn: async (email: string, password: string) => {
         try {
            const response = await signInMutation({ email, password });
            return { error: null, user: response.user };
         } catch (error: any) {
            return { error: error?.message || "Sign in failed", user: null };
         }
      },
      signUp: async (
         fullName: string,
         email: string,
         password: string,
         phone?: string
      ) => {
         try {
            await signUpMutation({ fullName, email, password, phone });
            return { error: null };
         } catch (error: any) {
            return { error: error?.message || "Sign up failed" };
         }
      },
      signOut: async () => {
         await signOutMutation();
      },
      hasRole: (role: AppRole) => hasRole(role),
   };
}
