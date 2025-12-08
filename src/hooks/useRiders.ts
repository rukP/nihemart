import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
   createRider,
   fetchRiders,
   assignOrderToRider,
   respondToAssignment,
   getAssignmentsForRider,
   fetchRiderByUserId,
   type Rider,
} from "@/integrations/supabase/riders";
import { useAuth } from "@/hooks/useAuth";

export const riderKeys = {
   all: ["riders"] as const,
   lists: () => [...riderKeys.all, "list"] as const,
   list: (activeOnly = false) =>
      [...riderKeys.lists(), { activeOnly }] as const,
   assignments: (riderId: string) =>
      [...riderKeys.all, "assignments", riderId] as const,
};

export function useRiders(activeOnly = false) {
   return useQuery({
      queryKey: riderKeys.list(activeOnly),
      queryFn: () => fetchRiders(activeOnly),
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
   });
}

export function useCreateRider() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (payload: Partial<Rider>) => {
         // Call the server-side API so the service role creates the rider and we avoid RLS issues
         const res = await fetch("/api/admin/create-rider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || "Failed to create rider");
         }
         const json = await res.json();
         qc.invalidateQueries({ queryKey: riderKeys.lists() });
         return json.rider;
      },
   });
}

export function useUpdateRider() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ riderId, updates }: any) => {
         const res = await fetch(
            `/api/rider/update?riderId=${encodeURIComponent(riderId)}`,
            {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ updates }),
            }
         );
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || "Failed to update rider");
         }
         const json = await res.json();
         // Invalidate lists and the per-user rider cache so UI updates in realtime
         qc.invalidateQueries({ queryKey: riderKeys.lists() });
         try {
            const updated = json.rider as any;
            // The shared query key uses the auth user id (user_id) not the riders row id
            if (updated && updated.user_id) {
               qc.invalidateQueries({
                  queryKey: ["rider", "byUser", updated.user_id],
               });
            }
         } catch (e) {
            // best-effort
         }
         return json.rider;
      },
   });
}

export function useRiderByUserId(userId?: string) {
   return useQuery({
      queryKey: ["rider", "byUser", userId || ""],
      queryFn: async () => {
         if (!userId) return null;
         const r = await fetchRiderByUserId(userId);
         return r;
      },
      enabled: Boolean(userId),
      staleTime: 1000 * 10,
   });
}

export function useAssignOrder() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ orderId, riderId, notes }: any) => {
         // Call server-side API so the service role validates order state
         const res = await fetch(`/api/admin/assign-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, riderId, notes }),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            // Server returns { error: { code, message } }
            const errObj = json.error;
            const message =
               (errObj && errObj.message) ||
               json.error ||
               "Failed to assign order";
            const err = new Error(message);
            // Attach server status / code for downstream handling
            (err as any).status = res.status;
            (err as any).serverError = errObj || json;
            throw err;
         }
         const json = await res.json();
         return json.assignment;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: riderKeys.all });
      },
   });
}

// Admin: reassign an order to a different rider
export function useReassignOrder() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ orderId, riderId, notes }: any) => {
         const res = await fetch(`/api/admin/reassign-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, riderId, notes }),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errObj = json.error;
            const message =
               (errObj && errObj.message) ||
               json.error ||
               "Failed to reassign order";
            const err = new Error(message);
            (err as any).status = res.status;
            (err as any).serverError = errObj || json;
            throw err;
         }
         const json = await res.json();
         return json.assignment;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: riderKeys.all }),
   });
}

export function useRespondToAssignment() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ assignmentId, status }: any) => {
         // Use server-side API route so the service role performs the update
         // (prevents RLS/permission issues when running from the browser).
         const res = await fetch(`/api/rider/respond-assignment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, status }),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errObj = json.error;
            // If server returned structured error use its message
            throw new Error(
               (errObj && (errObj.message || errObj)) ||
                  json.error ||
                  "Failed to respond to assignment"
            );
         }
         const json = await res.json();
         return json.assignment;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: riderKeys.all }),
   });
}

export function useRiderAssignments(riderId?: string) {
   const { session } = useAuth();

   return useQuery({
      queryKey: riderKeys.assignments(riderId || ""),
      // If riderId is not provided or empty, disable the query entirely to avoid
      // making requests from admin/user pages that import this hook.
      queryFn: async () => {
         if (!riderId) return [] as any[];

         // If running in the browser prefer the server-side API route which uses the
         // service role to include joined order items even when RLS would block direct joins.
         if (typeof window !== "undefined") {
            // Require an auth token to call the rider endpoint
            const token = session?.access_token;
            const headers: Record<string, string> = {
               "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(
               `/api/rider/assignments?riderId=${encodeURIComponent(riderId)}`,
               { headers }
            );
            if (!res.ok) {
               const json = await res.json().catch(() => ({}));
               throw new Error(json.error || "Failed to fetch assignments");
            }
            const json = await res.json();
            return json.assignments || [];
         }

         // On the server or when the API is not available, fall back to direct supabase call
         return getAssignmentsForRider(riderId);
      },
      // ensure the query is disabled when riderId is falsy OR when not on the
      // rider portal path (prevents admin/user pages from triggering the
      // rider assignments API accidentally). Also ensure we have an access token.
      enabled:
         Boolean(riderId) &&
         typeof window !== "undefined" &&
         (window.location.pathname || "").startsWith("/rider") &&
         !!session?.access_token,
      // Safety: don't retry on failure (prevents infinite retry loops)
      retry: false,
      // Avoid aggressive refetching when window focus or reconnects occur
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Keep data fresh for a short time in case of transient UI updates
      staleTime: 1000 * 10, // 10s
   });
}

export default useRiders;
