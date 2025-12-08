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
   if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
   }
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   const id = String(req.query.id || "").trim();
   if (!id) return res.status(400).json({ error: "Missing id" });

   try {
      const { data, error } = await supabase
         .from("orders")
         .select("*, items:order_items(*)")
         .eq("id", id)
         .maybeSingle();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.status(200).json({ order: data });
   } catch (err: any) {
      console.error("/api/orders/get error:", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
