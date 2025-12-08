import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const { id } = req.query;

   if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Order ID is required" });
   }

   // Use service role client if available
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
   const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

   const supabase = createClient(
      SUPABASE_URL || "",
      SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || ""
   );

   try {
      // Return the full order row including related order_items so clients
      // requesting /api/orders/:id for retry purposes receive the items,
      // totals and payment metadata they expect.
      const { data: order, error } = await supabase
         .from("orders")
         .select("*, items:order_items(*)")
         .eq("id", id)
         .maybeSingle();

      if (error) {
         console.error("Error fetching order:", error);
         return res.status(500).json({ error: "Failed to fetch order" });
      }

      if (!order) {
         return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json(order);
   } catch (err: any) {
      console.error("Order API error:", err);
      res.status(500).json({ error: err?.message || "Server error" });
   }
}
