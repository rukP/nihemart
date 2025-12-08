import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
   const { user, session, roles, loading, signIn, signUp, signOut, hasRole } =
      useAuthStore();

   return {
      user,
      session,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      isLoggedIn: !!user,
   };
}
