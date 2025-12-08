import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do nothing at module init; handler will return 500
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
      return res
         .status(500)
         .json({
            error: "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured on server",
         });
   }

   const { userId, full_name, phone } = req.body || {};
   if (!userId) return res.status(400).json({ error: "userId is required" });

   try {
      const { error } = await supabase.from("profiles").upsert(
         [
            {
               id: userId,
               full_name: full_name || null,
               phone: phone || null,
            },
         ],
         { onConflict: "id" }
      );

      if (error) {
         console.error("upsert-profile failed:", error);
         return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ ok: true });
   } catch (err: any) {
      console.error("upsert-profile error:", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
