"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DataTable } from "./data-table";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
   Pagination,
   PaginationContent,
   PaginationItem,
   PaginationLink,
   PaginationPrevious,
   PaginationNext,
} from "@/components/ui/pagination";

export default function OrderRefundsTable() {
   const [page, setPage] = useState(1);
   const limit = 10; // fixed page size to match admin/orders
   const [statusFilter, setStatusFilter] = useState<string | undefined>(
      undefined
   );
   const [orders, setOrders] = useState<any[]>([]);
   const [count, setCount] = useState(0);
   const [loading, setLoading] = useState(false);

   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [selectedAction, setSelectedAction] = useState<
      "manage" | "details" | null
   >(null);

   const fetchOrders = async () => {
      setLoading(true);
      try {
         // Build query and include refundStatus only when a specific status is selected.
         const q = new URLSearchParams();
         q.set("page", String(page));
         q.set("limit", String(limit));
         q.set("type", "orders");
         if (statusFilter) q.set("refundStatus", statusFilter);

         const res = await fetch(`/api/admin/refunds?${q.toString()}`);
         if (!res.ok) throw new Error("Failed to load order refunds");
         const json = await res.json();
         let payload: any = [];
         let countVal: any = 0;

         const top = json;
         const d = top.data;

         if (Array.isArray(d)) payload = d;
         else if (d && typeof d === "object") {
            payload = d.orders ?? d.items ?? d.rows ?? d.data ?? [];
            countVal = d.count ?? d.total ?? d.total_count ?? countVal;
         }

         payload = payload.length
            ? payload
            : top.data ?? top.orders ?? top.items ?? top.rows ?? [];
         countVal =
            countVal ||
            (top.count ?? top.total ?? top.meta?.count ?? top.total_count ?? 0);

         const rows = Array.isArray(payload) ? payload : [];
         setOrders(rows);
         setCount(Number(countVal) || rows.length || 0);
      } catch (err: any) {
         console.error("Failed to fetch order refunds:", err);
         toast.error(err?.message || "Failed to load order refunds");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchOrders();
   }, [page, statusFilter]);

   const totalPages = Math.max(1, Math.ceil(count / limit));
   const getPageNumbers = () => {
      const pages: number[] = [];
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
   };

   const columns = useMemo(
      () => [
         { accessorKey: "id", header: "ID" },
         {
            id: "order_number",
            accessorFn: (row: any) => row.order_number || row.id || "",
            header: "ORDER",
            cell: ({ row }: any) =>
               row.original.order_number || row.original.id,
         },
         {
            id: "customer",
            accessorFn: (row: any) =>
               `${row.customer_first_name || ""} ${
                  row.customer_last_name || ""
               }`.trim(),
            header: "CUSTOMER",
            cell: ({ row }: any) =>
               `${row.original.customer_first_name || ""} ${
                  row.original.customer_last_name || ""
               }`,
         },
         {
            accessorKey: "total",
            header: "AMOUNT",
            cell: ({ row }: any) =>
               `${
                  row.getValue("total")?.toLocaleString?.() ||
                  row.getValue("total") ||
                  0
               } RWF`,
         },
         { accessorKey: "refund_status", header: "STATUS" },
         {
            id: "reason",
            accessorKey: "refund_reason",
            header: "REASON",
            cell: ({ row }: any) => row.original.refund_reason || "-",
         },
         {
            id: "actions",
            header: "ACTIONS",
            cell: ({ row }: any) => {
               const order = row.original;
               return (
                  <div className="flex gap-2">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                           >
                              <span className="sr-only">Open actions</span>
                              <svg
                                 xmlns="http://www.w3.org/2000/svg"
                                 viewBox="0 0 24 24"
                                 fill="currentColor"
                                 className="h-4 w-4"
                              >
                                 <path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem
                              onClick={() => {
                                 const fullOrder = {
                                    ...order,
                                    subtotal: Number(order.subtotal || 0),
                                    tax: Number(order.tax || 0),
                                    total:
                                       order.total !== undefined
                                          ? Number(order.total)
                                          : Number(order.subtotal || 0),
                                    items: Array.isArray(order.items)
                                       ? order.items
                                       : [],
                                 };
                                 setSelectedOrder(fullOrder as any);
                                 setSelectedAction("details");
                                 setDialogOpen(true);
                              }}
                           >
                              View order details
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem
                              onClick={() => {
                                 setSelectedOrder(order);
                                 setSelectedAction("manage");
                                 setDialogOpen(true);
                              }}
                           >
                              Manage refund
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               );
            },
         },
      ],
      []
   );

   return (
      <div className="p-5 rounded-2xl bg-white mt-10">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Refund Requests</h3>
            <div className="flex items-center gap-2">
               <select
                  value={statusFilter || ""}
                  onChange={(e) => setStatusFilter(e.target.value || undefined)}
                  className="border rounded px-2 py-1"
               >
                  <option value="">All</option>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
               </select>
            </div>
         </div>

         <DataTable
            columns={columns as any}
            data={orders as any}
            loading={loading}
         />

         <div className="flex items-center justify-between mt-4">
            <div />

            <Pagination className="mt-2">
               <PaginationContent>
                  <PaginationItem>
                     <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                           e.preventDefault();
                           setPage(Math.max(1, page - 1));
                        }}
                        className={
                           page === 1 ? "pointer-events-none opacity-50" : ""
                        }
                     />
                  </PaginationItem>

                  {getPageNumbers().map((p) => (
                     <PaginationItem key={p}>
                        <PaginationLink
                           href="#"
                           isActive={p === page}
                           onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                           }}
                        >
                           {p}
                        </PaginationLink>
                     </PaginationItem>
                  ))}

                  <PaginationItem>
                     <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                     />
                  </PaginationItem>
               </PaginationContent>
            </Pagination>
         </div>

         {selectedAction === "details" ? (
            <OrderDetailsDialog
               open={dialogOpen}
               onOpenChange={(v) => setDialogOpen(v)}
               order={selectedOrder || { id: null }}
            />
         ) : (
            <ManageRefundDialog
               open={dialogOpen}
               onOpenChange={(v) => setDialogOpen(v)}
               order={selectedOrder || { id: null }}
               item={null}
            />
         )}
      </div>
   );
}
