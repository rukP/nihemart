import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // Handler will return error if env missing
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
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      const orderId = String(req.query.id || "").trim();
      if (!orderId)
         return res.status(400).json({ error: "order id is required" });

      // Fetch latest assignment for this order and include rider row
      const { data, error } = await supabase
         .from("order_assignments")
         .select(`*, riders:riders(*)`)
         .eq("order_id", orderId)
         .order("assigned_at", { ascending: false })
         .limit(1);

      if (error) {
         console.error("Error fetching assignment for order:", error);
         return res.status(500).json({ error: error.message || error });
      }

      const assignment = data && data.length > 0 ? data[0] : null;

      // Normalize rider payload
      const rider = assignment?.riders || null;

      return res.status(200).json({ assignment, rider });
   } catch (err: any) {
      console.error("order assignment handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
