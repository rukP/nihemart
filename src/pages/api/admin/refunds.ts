import type { NextApiRequest, NextApiResponse } from "next";
import { authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

   try {
      const { page = "1", limit = "20", refundStatus, type } = req.query;
      const p = Math.max(1, Number(page || 1));
      const l = Math.max(1, Math.min(100, Number(limit || 20)));

      if (type === "orders") {
         // Fetch orders with refund status from backend API
         const params = new URLSearchParams();
         params.append("page", String(p));
         params.append("limit", String(l));
         if (refundStatus) params.append("refundStatus", String(refundStatus));
         // Support optional date filters (YYYY-MM-DD)
         const { dateFrom, dateTo } = req.query as {
            dateFrom?: string;
            dateTo?: string;
         };
         if (dateFrom) params.append("dateFrom", String(dateFrom));
         if (dateTo) params.append("dateTo", String(dateTo));

         const result = await handleApiRequest(() =>
            authorizedAPI.get(`/orders/admin/all?${params.toString()}`)
         );

         // Filter orders with refund status if needed
         const orders = Array.isArray(result) ? result : result.data || [];
         const filtered =
            typeof refundStatus === "string" && refundStatus
               ? orders.filter(
                    (o: any) =>
                       (o.refund_status || o.refundStatus) === refundStatus
                 )
               : orders.filter(
                    (o: any) => (o.refund_status || o.refundStatus) != null
                 );

         return res.status(200).json({
            data: filtered.map((o: any) => ({
               ...o,
               items: o.items || [],
            })),
            count: filtered.length,
         });
      }

      // Fetch refunded items from backend API
      const params = new URLSearchParams();
      params.append("page", String(p));
      params.append("limit", String(l));
      if (refundStatus) params.append("refundStatus", String(refundStatus));
      // Support date filters for refunded items
      const { dateFrom, dateTo } = req.query as {
         dateFrom?: string;
         dateTo?: string;
      };
      if (dateFrom) params.append("dateFrom", String(dateFrom));
      if (dateTo) params.append("dateTo", String(dateTo));

      const result = await handleApiRequest(() =>
         authorizedAPI.get(`/orders/admin/refunds/items?${params.toString()}`)
      );

      res.status(200).json(result);
   } catch (err: any) {
      console.error("refunds API error", err);
      res.status(500).json({ error: err?.message || "Server error" });
   }
}
