import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }
   if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
   }
   const { userId } = req.body;
   if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
   }
   try {
      // Set email_confirmed to true for the user
      const { error } = await supabase.auth.admin.updateUserById(userId, {
         email_confirm: true,
      });
      if (error) {
         return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true });
   } catch (e: any) {
      return res
         .status(500)
         .json({ error: e.message || "Failed to confirm email" });
   }
}
