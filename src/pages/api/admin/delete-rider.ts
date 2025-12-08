import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { deleteRider } from "@/integrations/supabase/riders";

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
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   const { riderId } = req.body || {};
   if (!riderId) return res.status(400).json({ error: "riderId required" });
   try {
      const data = await deleteRider(riderId);
      return res.status(200).json({ deleted: data ? true : false });
   } catch (err: any) {
      console.error("delete-rider failed", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
