import type { NextApiRequest, NextApiResponse } from "next";
import { reassignOrderToRider } from "@/integrations/supabase/riders";
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
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   const { orderId, riderId, notes } = req.body;
   if (!orderId || !riderId)
      return res.status(400).json({ error: "orderId and riderId required" });

   try {
      const assignment = await reassignOrderToRider(orderId, riderId, notes);
      return res.status(200).json({ assignment });
   } catch (err: any) {
      console.error("reassign-order failed", err);
      if (err && err.code === "ORDER_NOT_FOUND")
         return res
            .status(404)
            .json({ error: { code: err.code, message: err.message } });
      if (err && err.code === "RIDER_NOT_FOUND")
         return res
            .status(404)
            .json({ error: { code: err.code, message: err.message } });
      if (err && err.code === "RIDER_INACTIVE")
         return res
            .status(409)
            .json({ error: { code: err.code, message: err.message } });
      return res.status(500).json({
         error: {
            code: err.code || "INTERNAL_ERROR",
            message: err.message || "Failed to reassign order",
         },
      });
   }
}
