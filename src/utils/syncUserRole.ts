import { supabase as browserSupabase } from "@/integrations/supabase/client";
import { createClient as createServerClient } from "@supabase/supabase-js";

export async function syncUserRole(userId: string) {
   try {
      // Prefer using service-role client on the server when available
      const serverClient =
         typeof window === "undefined" &&
         process.env.NEXT_PUBLIC_SUPABASE_URL &&
         process.env.SUPABASE_SERVICE_ROLE_KEY
            ? createServerClient(
                 process.env.NEXT_PUBLIC_SUPABASE_URL,
                 process.env.SUPABASE_SERVICE_ROLE_KEY
              )
            : null;

      const sb: any = serverClient || browserSupabase;

      // Get role from user_roles table
      const { data, error } = await sb
         .from("user_roles")
         .select("role")
         .eq("user_id", userId)
         .maybeSingle();

      if (error || !data?.role) return;

      // Update user_metadata.role if possible. On the server we can use the
      // admin client to directly update auth users; in the browser we use the
      // client-side auth API.
      if (serverClient) {
         try {
            await serverClient.auth.admin.updateUserById(userId, {
               user_metadata: { role: data.role },
            });
         } catch (updateError) {
            console.error(
               "Error updating user metadata (server):",
               updateError
            );
         }
      } else {
         try {
            const { error: updateError } =
               await browserSupabase.auth.updateUser({
                  data: { role: data.role },
               });
            if (updateError) {
               console.error(
                  "Error updating user metadata (client):",
                  updateError
               );
            }
         } catch (updateError) {
            console.error(
               "Error updating user metadata (client):",
               updateError
            );
         }
      }
   } catch (error) {
      console.error("Error syncing user role:", error);
   }
}
