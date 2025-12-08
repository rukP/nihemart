"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/orders/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RefundsHistoryPage() {
   const [items, setItems] = useState<any[]>([]);
   const [orders, setOrders] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   const fetchHistory = async () => {
      setLoading(true);
      try {
         const [itemsRes, ordersRes] = await Promise.all([
            fetch(`/api/admin/refunds?limit=100&page=1`),
            fetch(`/api/admin/refunds?type=orders&limit=100&page=1`),
         ]);
         if (!itemsRes.ok) throw new Error("Failed to fetch item refunds");
         if (!ordersRes.ok) throw new Error("Failed to fetch order refunds");
         const itemsJson = await itemsRes.json();
         const ordersJson = await ordersRes.json();
         setItems(itemsJson.data || []);
         setOrders(ordersJson.data || []);
      } catch (err: any) {
         console.error("Failed to fetch refund history:", err);
         toast.error(err?.message || "Failed to load refund history");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchHistory();
   }, []);

   const itemColumns = useMemo(
      () => [
         { accessorKey: "id", header: "ID" },
         {
            id: "product",
            header: "PRODUCT",
            cell: ({ row }: any) =>
               row.original.product?.name || row.original.product_name || "-",
         },
         {
            id: "order",
            header: "ORDER",
            cell: ({ row }: any) =>
               row.original.order?.order_number || row.original.order_id || "-",
         },
         { accessorKey: "quantity", header: "QTY" },
         { accessorKey: "refund_status", header: "STATUS" },
         {
            id: "reason",
            header: "REASON",
            cell: ({ row }: any) => row.original.refund_reason || "-",
         },
      ],
      []
   );

   const orderColumns = useMemo(
      () => [
         { accessorKey: "id", header: "ID" },
         {
            id: "order_number",
            header: "ORDER",
            cell: ({ row }: any) =>
               row.original.order_number || row.original.id,
         },
         {
            id: "customer",
            header: "CUSTOMER",
            cell: ({ row }: any) =>
               `${row.original.customer_first_name || ""} ${
                  row.original.customer_last_name || ""
               }`,
         },
         {
            accessorKey: "total",
            header: "AMOUNT",
            cell: ({ row }: any) => `${row.getValue("total") || 0} RWF`,
         },
         { accessorKey: "refund_status", header: "STATUS" },
         {
            id: "reason",
            header: "REASON",
            cell: ({ row }: any) => row.original.refund_reason || "-",
         },
      ],
      []
   );

   return (
      <ScrollArea className="h-screen pb-20">
         <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto">
               <div className="p-5 rounded-2xl bg-white mt-6">
                  <h3 className="text-lg font-semibold mb-4">
                     Item Refund History
                  </h3>
                  <DataTable
                     columns={itemColumns as any}
                     data={items as any}
                     loading={loading}
                  />
               </div>

               <div className="p-5 rounded-2xl bg-white mt-6">
                  <h3 className="text-lg font-semibold mb-4">
                     Order Refund History
                  </h3>
                  <DataTable
                     columns={orderColumns as any}
                     data={orders as any}
                     loading={loading}
                  />
               </div>
            </div>
         </div>
      </ScrollArea>
   );
}
