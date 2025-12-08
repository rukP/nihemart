import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
   | "admin"
   | "user"
   | "rider"
   | "manager"
   | "staff"
   | "stock_manager";

type AuthState = {
   user: User | null;
   session: Session | null;
   roles: Set<AppRole>;
   loading: boolean;
   isFetchingRoles?: boolean;
   lastFetchedRolesUserId?: string | null;
   setUser: (user: User | null) => void;
   setSession: (session: Session | null) => void;
   setRoles: (roles: Set<AppRole>) => void;
   setLoading: (loading: boolean) => void;
   setIsFetchingRoles?: (v: boolean) => void;
   setLastFetchedRolesUserId?: (id: string | null) => void;
   fetchRoles: (userId: string) => Promise<void>;
   signIn: (
      email: string,
      password: string
   ) => Promise<{ error: string | null }>;
   signUp: (
      fullName: string,
      email: string,
      password: string,
      phone?: string
   ) => Promise<{ error: string | null }>;
   signOut: () => Promise<void>;
   hasRole: (role: AppRole) => boolean;
   initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
   user: null,
   session: null,
   roles: new Set(),
   loading: true,
   isFetchingRoles: false,
   lastFetchedRolesUserId: null,
   setUser: (user) => set({ user }),
   setSession: (session) => set({ session }),
   setRoles: (roles) => set({ roles }),
   setLoading: (loading) => set({ loading }),
   setIsFetchingRoles: (v) => set({ isFetchingRoles: v }),
   setLastFetchedRolesUserId: (id) => set({ lastFetchedRolesUserId: id }),
   fetchRoles: async (userId: string) => {
      // Guard: no userId
      if (!userId) {
         set({ roles: new Set(), lastFetchedRolesUserId: null });
         return;
      }

      // If we've already fetched roles for this user and there's an existing set, skip
      const lastId = get().lastFetchedRolesUserId;
      const isFetching = get().isFetchingRoles;
      if (
         lastId === userId &&
         !isFetching &&
         get().roles &&
         get().roles.size > 0
      ) {
         return;
      }

      // Prevent concurrent fetches
      if (isFetching) return;

      set({ isFetchingRoles: true });
      try {
         const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

         // If query succeeded and returned roles, use them. If it returned
         // an empty array (no rows) we should still run the riders fallback
         // because some rider users are only represented in the `riders`
         // table and don't have an explicit user_roles row.
         if (!error && Array.isArray(data) && data.length > 0) {
            const r = new Set<AppRole>();
            data.forEach((row: any) => r.add(row.role as AppRole));
            set({ roles: r, lastFetchedRolesUserId: userId });
         } else {
            // No explicit user_roles found or empty result. As a fallback,
            // check if a riders row exists for this user and treat them as
            // a rider if so.
            try {
               const sb: any = supabase as any;
               const { data: riderRow } = await sb
                  .from("riders")
                  .select("id")
                  .eq("user_id", userId)
                  .maybeSingle();
               if (riderRow && (riderRow as any).id) {
                  set({
                     roles: new Set<AppRole>(["rider"]),
                     lastFetchedRolesUserId: userId,
                  });
               } else {
                  set({ roles: new Set(), lastFetchedRolesUserId: userId });
               }
            } catch (err) {
               console.error("Error checking riders fallback:", err);
               set({ roles: new Set(), lastFetchedRolesUserId: userId });
            }
         }
      } catch (error) {
         console.error("Error fetching roles:", error);
         set({ roles: new Set(), lastFetchedRolesUserId: userId });
      } finally {
         set({ isFetchingRoles: false });
      }
   },
   signIn: async (email, password) => {
      try {
         const { error, data } = await supabase.auth.signInWithPassword({
            email,
            password,
         });

         if (error) {
            return { error: error.message };
         }

         if (data.user) {
            // Fetch roles (deduped inside fetchRoles) then update state
            await get().fetchRoles(data.user.id);
            set({ user: data.user, session: data.session });
         }

         return { error: null };
      } catch (error) {
         return { error: "An unexpected error occurred" };
      }
   },
   signUp: async (fullName, email, password, phone) => {
      try {
         const redirectUrl =
            typeof window !== "undefined"
               ? `${window.location.origin}/signin`
               : "/signin";
         const { error, data } = await supabase.auth.signUp({
            email,
            password,
            options: {
               emailRedirectTo: redirectUrl,
               data: { full_name: fullName, phone },
            },
         });

         // If the SDK returns the created user (some flows may), call the
         // server API to upsert the profile by user id. This is a best-effort
         // extra step; the DB trigger should normally handle syncing metadata
         // into `profiles`, but this helps when the trigger didn't run yet.
         try {
            const userId = (data as any)?.user?.id;
            if (userId && typeof window !== "undefined") {
               fetch("/api/auth/upsert-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, full_name: fullName, phone }),
               }).catch((e) =>
                  console.warn("upsert-profile request failed:", e)
               );
            }
         } catch (e) {
            // ignore
         }

         // Send our custom signup/confirmation email via server API. This is
         // best-effort — if SMTP isn't configured the server will return a
         // warning but the account will still be created by Supabase.
         try {
            const userId = (data as any)?.user?.id;
            fetch("/api/email/send", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ email, type: "signup", userId }),
            }).catch(() => null);
         } catch (e) {
            // ignore
         }

         return { error: error?.message ?? null };
      } catch (error) {
         return { error: "An unexpected error occurred" };
      }
   },
   signOut: async () => {
      try {
         await supabase.auth.signOut();
         set({ user: null, session: null, roles: new Set() });
         // Clear any auth-related local storage
         localStorage.removeItem("sb-auth-token");
         // Redirect to home page
         window.location.href = "/";
      } catch (error) {
         console.error("Error signing out:", error);
         throw error;
      }
   },
   hasRole: (role) => get().roles.has(role),
   initialize: async () => {
      try {
         set({ loading: true });

         // Get current session
         const {
            data: { session },
         } = await supabase.auth.getSession();

         if (session?.user) {
            // Set basic session/user first
            set({ user: session.user, session });
            // Fetch roles (this is guarded and will be a no-op if another fetch is in-flight)
            await get().fetchRoles(session.user.id);
         } else {
            set({ user: null, session: null, roles: new Set() });
         }

         set({ loading: false });
      } catch (error) {
         console.error("Error initializing auth:", error);
         set({ loading: false });
      }
   },
}));
