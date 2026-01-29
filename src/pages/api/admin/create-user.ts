import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // Avoid throwing during module initialization; APIs will return an error if env is missing
}
const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase) {
      return res.status(500).json({
         error:
            "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.\n" +
            "For local testing add SUPABASE_SERVICE_ROLE_KEY to your .env.local (get it from Supabase Dashboard > Project Settings > API > Service Key). Do NOT commit the real key.",
      });
   }
   const { email, password, fullName, phone, role } = req.body;
   if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
   // Create user in auth.users (service role)
   const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      // Mark the user as confirmed so they can sign in immediately when created by an admin
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role },
   });
   if (error) return res.status(400).json({ error: error.message });

   const userId = data.user?.id;

   try {
      // Insert a profiles row so profiles has the full_name/phone and created_at
      if (userId) {
         const { error: profileError } = await supabase.from("profiles").upsert(
            [
               {
                  id: userId,
                  full_name: fullName || null,
                  phone: phone || null,
               },
            ],
            { onConflict: "id" }
         );
         if (profileError) {
            console.error(
               "Failed to upsert profile for new user:",
               profileError
            );
            // not fatal: continue but log
         }
      }

      // Optionally, insert into user_roles
      if (role && userId) {
         const { error: roleErr } = await supabase
            .from("user_roles")
            .upsert([{ user_id: userId, role }], {
               onConflict: "user_id,role",
            });
         if (roleErr) {
            console.error("Failed to upsert role for new user:", roleErr);
         }
      }

      res.status(200).json({ user: data.user });
   } catch (err: any) {
      console.error("create-user post-create steps failed", err);
      res.status(200).json({
         user: data.user,
         warning: "created user but failed to persist profile/role",
      });
   }
}
