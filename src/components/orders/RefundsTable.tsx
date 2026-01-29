"use client";

import React, { useState, useMemo, useEffect } from "react";
import { formatLocalDate } from "@/lib/format";
import { DataTable } from "./data-table";
import { Button } from "@/components/ui/button";
import TimeFilter from "@/components/ui/time-filter";
import { useTimeFilter } from "@/hooks/useTimeFilter";
import {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
   Pagination,
   PaginationContent,
   PaginationItem,
   PaginationLink,
   PaginationPrevious,
   PaginationNext,
} from "@/components/ui/pagination";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { ItemDetailsDialog } from "./ItemDetailsDialog";
import { toast } from "sonner";
import refundsAPI from "@/lib/api/refunds";

interface RefundsTableProps {}

export const RefundsTable: React.FC<RefundsTableProps> = () => {
   const [page, setPage] = useState(1);
   const limit = 10;
   const [statusFilter, setStatusFilter] = useState<string | undefined>(
      undefined
   );

   // Use the custom hook for time filter - handles URL sync without infinite loops
   const { timeFilter, setTimeFilter, dateRange } = useTimeFilter({
      persistToUrl: true,
      defaultPreset: "today",
   });

   const [items, setItems] = useState<any[]>([]);
   const [count, setCount] = useState(0);
   const [loading, setLoading] = useState(false);

   const [selectedItem, setSelectedItem] = useState<any | null>(null);
   const [parentOrder, setParentOrder] = useState<any | null>(null);
   const [selectedAction, setSelectedAction] = useState<
      "manage" | "details" | "item-details" | null
   >(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const fetchRefunded = async () => {
      setLoading(true);
      try {
         const payload: any = {
            type: "items",
            status: statusFilter as any,
            page,
            limit,
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
         };

         console.debug("[RefundsTable] fetching refunded items with", payload);
         const response = await refundsAPI.getRefundedItems(payload);
         console.debug("[RefundsTable] refunded items response", response);

         setItems(response.data || []);
         setCount(response.count || 0);
      } catch (err: any) {
         console.error("Failed to fetch refunded items:", err);
         toast.error(
            err?.response?.data?.message ||
               err.message ||
               "Failed to load refunds"
         );
         setItems([]);
         setCount(0);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchRefunded();
   }, [page, statusFilter, dateRange.from, dateRange.to]);

   const totalPages = Math.max(1, Math.ceil(count / limit));
   const getPageNumbers = () => {
      const pages: number[] = [];
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
   };

   const columns = useMemo(() => {
      return [
         {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }: any) => row.getValue("id"),
         },
         {
            id: "product",
            accessorFn: (row: any) =>
               row.product?.name || row.product_name || "",
            header: "PRODUCT",
            cell: ({ row }: any) => {
               const r = row.original;
               return r.product?.name || r.product_name || "Unknown";
            },
         },
         {
            id: "order",
            accessorFn: (row: any) =>
               row.order?.order_number || row.order_id || "",
            header: "ORDER",
            cell: ({ row }: any) => {
               const r = row.original;
               return r.order?.order_number || r.order_id;
            },
         },
         {
            accessorKey: "quantity",
            header: "QTY",
         },
         {
            accessorKey: "refund_status",
            header: "STATUS",
            cell: ({ row }: any) => row.getValue("refund_status") || "-",
         },
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
               const r = row.original;
               const refundItem = r; // single item row
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
                                 setSelectedItem(refundItem);
                                 setParentOrder(null);
                                 setSelectedAction("item-details");
                                 setDialogOpen(true);
                              }}
                           >
                              View item details
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem
                              onClick={() => {
                                 setSelectedItem(refundItem);
                                 setParentOrder(r.order || null);
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
      ];
   }, []);

   return (
      <div className="p-5 rounded-2xl bg-white mt-10">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Refund Requests</h3>
            <div className="flex items-center gap-2">
               <TimeFilter
                  value={timeFilter}
                  onChange={(v) => {
                     setTimeFilter(v);
                     setPage(1);
                  }}
               />
               <select
                  aria-label="Refund status filter"
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

         {/* Reuse Orders DataTable for consistent UI but feed server-fetched data */}
         <DataTable
            columns={columns}
            data={items}
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
               order={parentOrder || { id: selectedItem?.order_id }}
            />
         ) : selectedAction === "item-details" ? (
            <ItemDetailsDialog
               open={dialogOpen}
               onOpenChange={(v) => setDialogOpen(v)}
               item={selectedItem}
            />
         ) : (
            <ManageRefundDialog
               open={dialogOpen}
               onOpenChange={(v) => setDialogOpen(v)}
               order={parentOrder || { id: selectedItem?.order_id }}
               item={selectedItem}
            />
         )}
      </div>
   );
};

export default RefundsTable;
