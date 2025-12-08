"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import { DataTable } from "../orders/data-table";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/types/orders";
import { columns } from "../orders/columns";

const OrdersListMini: React.FC = () => {
   const { useAllOrders } = useOrders();
   const {
      data: ordersData,
      isLoading,
      isError,
      error,
   } = useAllOrders({
      pagination: { page: 1, limit: 5 },
      sort: { column: "created_at", direction: "desc" },
   });

   const orders = ordersData?.data || [];

   if (isError) {
      return <div>Error loading recent orders: {error?.message}</div>;
   }

   return (
      <div className="bg-white rounded-lg border shadow-sm">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 md:p-6 border-b">
            <div className="mb-3 sm:mb-0">
               <h3 className="text-lg font-bold text-gray-900">Order List</h3>
               <p className="text-sm text-gray-600">
                  Track orders list across your store.
               </p>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
               <Download className="h-4 w-4 mr-2" />
               Export
            </Button>
         </div>
         <div className="p-4">
            {isLoading ? (
               <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
               </div>
            ) : (
               <DataTable
                  columns={columns}
                  data={orders}
               />
            )}
         </div>
         <div className="p-4 border-t bg-gray-50">
            <Link
               href="/admin/orders"
               className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
               All orders →
            </Link>
         </div>
      </div>
   );
};

export default OrdersListMini;
