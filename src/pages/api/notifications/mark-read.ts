import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op
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
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { ids } = req.body;
   if (!ids || !Array.isArray(ids))
      return res.status(400).json({ error: "ids array required" });

   try {
      const { data, error } = await supabase
         .from("notifications")
         .update({ read: true })
         .in("id", ids)
         .select();
      if (error) {
         console.error("mark read error", error);
         return res.status(500).json({ error: error.message || error });
      }
      return res.status(200).json({ updated: data });
   } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || err });
   }
}
