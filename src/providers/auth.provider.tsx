import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { supabase } from "@/integrations/supabase/client";

// The AuthProvider now only handles initialization and state sync
// OAuth callback handling is delegated to the dedicated callback page
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
   const { initialize, setUser, setSession, fetchRoles, setRoles } =
      useAuthStore();

   useEffect(() => {
      const handleInitialization = async () => {
         try {
            // Initialize auth state from persisted session
            await initialize();
         } catch (e) {
            console.warn("Auth initialization failed:", e);
         }
      };

      // Perform initialization
      void handleInitialization();

      // Listen to auth state changes
      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
         // Update session and user immediately
         setSession(session);
         setUser(session?.user ?? null);

         // Only fetch roles when we have a user
         if (session?.user) {
            try {
               await fetchRoles(session.user.id);
            } catch (e) {
               console.warn("Role fetch failed:", e);
            }

            // Ensure profile row is present via server API
            try {
               const um: any = session.user.user_metadata || {};
               fetch("/api/auth/upsert-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                     userId: session.user.id,
                     full_name: um.full_name || null,
                     phone: um.phone || null,
                  }),
               }).catch((e) => console.warn("upsert-profile failed:", e));
            } catch (e) {
               console.warn("Profile sync error:", e);
            }
         } else {
            setRoles(new Set());
         }
      });

      return () => {
         try {
            subscription?.unsubscribe();
         } catch (e) {
            console.warn("Subscription cleanup error:", e);
         }
      };
   }, [initialize, setUser, setSession, fetchRoles, setRoles]);

   return <>{children}</>;
};
