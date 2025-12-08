import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // avoid throwing during module init
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

   const { userId, role } = req.body;
   if (!supabase) {
      return res.status(500).json({
         error:
            "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.\n" +
            "For local testing add SUPABASE_SERVICE_ROLE_KEY to your .env.local (get it from Supabase Dashboard > Project Settings > API > Service Key). Do NOT commit the real key.",
      });
   }
   if (!userId || !role)
      return res.status(400).json({ error: "userId and role are required" });

   try {
      const { error } = await supabase
         .from("user_roles")
         .upsert([{ user_id: userId, role }], { onConflict: "user_id,role" });
      if (error) throw error;
      res.status(200).json({ success: true });
   } catch (err: any) {
      console.error("update-user-role failed", err);
      res.status(500).json({ error: err.message || "Failed to update role" });
   }
}
