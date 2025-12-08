import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do nothing
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
   // Simple in-memory cache to avoid repeated expensive DB aggregation when the
   // endpoint is hammered. TTL is short because values change as orders are
   // delivered, but caching for a few seconds protects the DB from request
   // storms while preserving near-real-time metrics.
   // Note: this uses module-level memory; in a multi-instance production
   // deployment you'd prefer an external cache (Redis) but this is a low-risk
   // mitigation for dev and single-instance deployments.
   const TTL_MS = 15 * 1000; // 15 seconds
   // @ts-ignore module level cache
   if (!(global as any).__topAmountCache) {
      // @ts-ignore
      (global as any).__topAmountCache = { ts: 0, data: null };
   }
   // @ts-ignore
   const cache = (global as any).__topAmountCache;
   if (Date.now() - cache.ts < TTL_MS && cache.data) {
      return res.status(200).json(cache.data);
   }
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      // Query completed assignments to count successful deliveries per rider
      const { data: assignments, error } = await supabase
         .from("order_assignments")
         .select("rider_id, status, orders:orders(id, status)")
         .eq("status", "completed");

      if (error) throw error;

      // Count successful deliveries per rider
      const deliveryCounts: Record<string, number> = {};
      console.debug(
         `top-amount: fetched ${
            Array.isArray(assignments) ? assignments.length : 0
         } completed assignments`
      );

      for (const assignment of (assignments || []) as any[]) {
         const riderId = assignment.rider_id;
         const order = assignment.orders;

         if (!riderId || !order) continue;

         // Only count if the order is also delivered
         if (order.status === "delivered") {
            deliveryCounts[riderId] = (deliveryCounts[riderId] || 0) + 1;
         }
      }

      // Find top rider by delivery count
      let topRiderId: string | null = null;
      let topDeliveryCount = 0;
      for (const [riderId, count] of Object.entries(deliveryCounts)) {
         if (count > topDeliveryCount) {
            topDeliveryCount = count;
            topRiderId = riderId;
         }
      }

      // If we couldn't compute a top rider, return a sensible fallback
      const result =
         !topRiderId && topDeliveryCount === 0
            ? { topRiderId: null, topAmount: 0, deliveryCount: 0 }
            : {
                 topRiderId,
                 topAmount: topDeliveryCount,
                 deliveryCount: topDeliveryCount,
              };

      // Update cache before returning
      cache.ts = Date.now();
      cache.data = result;

      return res.status(200).json(result);
   } catch (err: any) {
      console.error("top-amount failed", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
