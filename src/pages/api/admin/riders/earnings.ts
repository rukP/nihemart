import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do nothing at import time
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
      // Calculate cutoff for last 7 days to match RiderDetailsDialog default
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      // Use the same logic as RiderDetailsDialog for calculating earnings
      const { data, error } = await supabase
         .from("order_assignments")
         // include assignment-level fee/delivery_fee and order tax/delivery_fee
         .select(
            "rider_id, status, fee, delivery_fee, orders:orders(id, status, tax, delivery_fee)"
         )
         .gte("assigned_at", cutoff.toISOString());

      if (error) return res.status(500).json({ error: error.message || error });

      const earnings: Record<string, number> = {};
      (data || []).forEach((row: any) => {
         const rid = row.rider_id;
         const order = row.orders;
         if (!rid) return;

         const s = (row.status || "").toString().toLowerCase();
         if (s === "accepted" || s === "completed" || s === "delivered") {
            // Calculate earnings for completed deliveries (same logic as dialog)
            const o = order || null;
            const baseFeeRaw =
               row?.fee ?? row?.delivery_fee ?? o?.delivery_fee ?? 0;
            const baseFee = Number(baseFeeRaw || 0);
            const transport = Number(o?.tax || 0);
            const feeNum = Math.max(
               0,
               (isNaN(baseFee) ? 0 : baseFee) +
                  (isNaN(transport) ? 0 : transport)
            );
            if (!isNaN(feeNum) && feeNum > 0) {
               earnings[rid] = (earnings[rid] || 0) + feeNum;
            }
         }
      });

      return res.status(200).json({ earnings });
   } catch (err: any) {
      console.error("earnings handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
