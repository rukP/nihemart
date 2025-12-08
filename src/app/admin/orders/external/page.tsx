"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/types/orders";
// Note: avoid importing server-only modules on the client. Use API fetch instead.
import { format } from "date-fns";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Dot } from "lucide-react";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import { DataTable } from "@/components/orders/data-table";
import { ManageRefundDialog } from "@/components/orders/ManageRefundDialog";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { AssignRiderDialog } from "@/components/orders/AssignRiderDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
   Pagination,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
} from "@/components/ui/pagination";

interface ExternalOrderItem {
   product_name: string;
   quantity: number;
   price: number;
   variation_name?: string;
}

interface ExternalOrder {
   id: string;
   order_number?: string;
   customer_name: string;
   customer_email?: string;
   customer_phone: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
   order_date: string;
   status: OrderStatus;
   total: number;
   source: "whatsapp" | "phone" | "other";
   items: ExternalOrderItem[];
}
import type { OrderStatus } from "@/types/orders";

export default function ExternalOrdersPage() {
   const { useAllOrders } = useOrders();
   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(50);

   const { data: ordersResponse, isLoading } = useAllOrders({
      filters: { isExternal: true, search: search || undefined },
      pagination: { page, limit },
      sort: { column: "created_at", direction: "desc" },
   });

   const totalCount = ordersResponse?.count || 0;
   const totalPages = Math.max(1, Math.ceil(totalCount / limit));
   const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
   const rangeEnd = Math.min(totalCount, page * limit);

   // Map backend Order -> ExternalOrder shape used by this table
   const ordersData: ExternalOrder[] = (ordersResponse?.data || [])
      .map((o: Order) => ({
         id: o.id,
         order_number: o.order_number || undefined,
         customer_name:
            `${o.customer_first_name} ${o.customer_last_name}`.trim(),
         customer_email: o.customer_email || undefined,
         customer_phone: o.customer_phone || "",
         delivery_address: o.delivery_address,
         delivery_city: o.delivery_city,
         delivery_notes: o.delivery_notes || undefined,
         order_date: o.created_at,
         status: o.status,
         total: o.total,
         source: (o.source as "whatsapp" | "phone" | "other") || "other",
         items:
            o.items?.map((it) => ({
               product_name: it.product_name,
               quantity: it.quantity,
               price: it.price,
               variation_name: it.variation_name || undefined,
            })) || [],
      }))
      .filter(Boolean);

   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(1);
   };

   const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
   };

   const getPageNumbers = () => {
      const pages: number[] = [];
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
   };

   // Admin refund helpers / state
   const { useRequestRefundOrder } = useOrders();
   const requestRefundOrder = useRequestRefundOrder();
   const [showManageRefund, setShowManageRefund] = useState(false);
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(
      null
   );
   const [showAssignDialog, setShowAssignDialog] = useState(false);
   const [assignOrderId, setAssignOrderId] = useState<string | null>(null);

   // Table columns (defined inside component so we can access local state)
   const columns: ColumnDef<ExternalOrder>[] = [
      {
         accessorKey: "order_number",
         header: "ORDER",
         cell: ({ row }) => (
            <span className="text-text-primary">
               #{row.getValue("order_number") || row.original.id}
            </span>
         ),
      },
      {
         accessorKey: "order_date",
         header: "DATE",
         cell: ({ row }) =>
            format(new Date(row.getValue("order_date")), "MMM d, yyyy"),
      },
      {
         accessorKey: "customer_name",
         header: "CUSTOMER",
         cell: ({ row }) => (
            <UserAvatarProfile
               user={{
                  fullName: row.original.customer_name,
                  subTitle: row.original.customer_phone,
               }}
               showInfo
            />
         ),
      },
      {
         accessorKey: "source",
         header: "SOURCE",
         cell: ({ row }) => (
            <Badge
               variant="secondary"
               className="capitalize"
            >
               {row.getValue("source")}
            </Badge>
         ),
      },
      {
         accessorKey: "status",
         header: "STATUS",
         cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
               <Badge
                  className={cn("capitalize font-semibold", {
                     "bg-green-500/10 text-green-500": status === "delivered",
                     "bg-yellow-500/10 text-yellow-500":
                        status === "pending" || status === "processing",
                     "bg-red-500/10 text-red-500": status === "cancelled",
                  })}
               >
                  {status}
               </Badge>
            );
         },
      },
      {
         accessorKey: "total",
         header: "TOTAL",
         cell: ({ row }) => (
            <div className="font-medium">
               {row.getValue<number>("total").toLocaleString()} RWF
            </div>
         ),
      },
      {
         id: "actions",
         cell: ({ row }) => {
            const order = row.original;
            // Admin-only page; keep action available to admins
            return (
               <>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="ghost"
                           className="h-8 w-8 p-0"
                        >
                           <span className="sr-only">Open menu</span>
                           <MoreHorizontal className="h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                           onClick={() =>
                              navigator.clipboard.writeText(order.id)
                           }
                        >
                           Copy order ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                           onClick={async () => {
                              try {
                                 // Try to find the full order from the fetched page
                                 const full = ordersResponse?.data?.find(
                                    (o: Order) => o.id === order.id
                                 );
                                 if (full) {
                                    if (full.refund_status !== "requested") {
                                       // create admin-initiated refund request then open dialog
                                       const updated =
                                          await requestRefundOrder.mutateAsync({
                                             orderId: full.id,
                                             reason: "Admin initiated refund",
                                             adminInitiated: true,
                                          } as any);
                                       setSelectedOrder(updated as Order);
                                    } else {
                                       setSelectedOrder(full as Order);
                                    }
                                    setShowManageRefund(true);
                                 } else {
                                    const resp = await fetch(
                                       `/api/orders/get?id=${encodeURIComponent(
                                          order.id
                                       )}`
                                    );
                                    const json = await resp.json();
                                    const fetched = json?.order || null;
                                    if (!fetched)
                                       throw new Error("Order not found");
                                    if (fetched.refund_status !== "requested") {
                                       const updated =
                                          await requestRefundOrder.mutateAsync({
                                             orderId: fetched.id,
                                             reason: "Admin initiated refund",
                                             adminInitiated: true,
                                          } as any);
                                       setSelectedOrder(updated as Order);
                                    } else {
                                       setSelectedOrder(fetched as Order);
                                    }
                                    setShowManageRefund(true);
                                 }
                              } catch (err) {
                                 console.error("Manage refund failed:", err);
                              }
                           }}
                        >
                           Manage refund
                        </DropdownMenuItem>
                        {order.status === "pending" && (
                           <DropdownMenuItem
                              onClick={() => {
                                 setAssignOrderId(order.id);
                                 setShowAssignDialog(true);
                              }}
                           >
                              Assign to rider
                           </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                           onClick={async () => {
                              try {
                                 const full = ordersResponse?.data?.find(
                                    (o: Order) => o.id === order.id
                                 );
                                 if (full) {
                                    setSelectedOrderDetail(full as Order);
                                 } else {
                                    const resp = await fetch(
                                       `/api/orders/get?id=${encodeURIComponent(
                                          order.id
                                       )}`
                                    );
                                    const json = await resp.json();
                                    const fetched = json?.order || null;
                                    if (!fetched)
                                       throw new Error("Order not found");
                                    setSelectedOrderDetail(fetched as Order);
                                 }
                              } catch (e) {
                                 console.error(
                                    "Failed to fetch order details:",
                                    e
                                 );
                              }
                           }}
                        >
                           View order details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Update status</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </>
            );
         },
      },
   ];

   return (
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
         <div className="px-5 sm:px-10 py-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
               <div>
                  <h1 className="text-2xl font-bold text-[#023337]">
                     External Orders
                  </h1>
                  <p className="text-gray-600">
                     Manage orders from WhatsApp and other external sources
                  </p>
               </div>
               <Link href="/admin/orders/external/add">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white mt-4 sm:mt-0">
                     <PlusCircle className="h-4 w-4 mr-2" />
                     Add External Order
                  </Button>
               </Link>
            </div>

            {/* External orders metrics (improved) */}
            <div className="mb-6">
               {/* Build metrics from fetched orders */}
               {(() => {
                  const list = (ordersResponse?.data || []) as Order[];
                  const total = list.length;
                  const pending = list.filter(
                     (o) => o.status === "pending"
                  ).length;
                  const processing = list.filter(
                     (o) => o.status === "processing"
                  ).length;
                  const delivered = list.filter(
                     (o) => o.status === "delivered"
                  ).length;
                  const shipped = list.filter(
                     (o) => o.status === "shipped"
                  ).length;
                  const cancelled = list.filter(
                     (o) => o.status === "cancelled"
                  ).length;

                  const newOrders = pending + processing;
                  const completed = delivered + shipped;

                  const metrics = [
                     {
                        title: "Total External Orders",
                        value: total.toLocaleString(),
                        period: "All external orders",
                     },
                     {
                        title: "New",
                        value: newOrders.toLocaleString(),
                        period: "Pending / Processing",
                     },
                     {
                        title: "Completed",
                        value: completed.toLocaleString(),
                        period: "Delivered / Shipped",
                     },
                     {
                        title: "Cancelled",
                        value: cancelled.toLocaleString(),
                        period: "Cancelled orders",
                     },
                  ];

                  return (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {isLoading
                           ? // loading skeletons
                             Array.from({ length: 4 }).map((_, i) => (
                                <Card
                                   key={i}
                                   className="relative"
                                >
                                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                      <div className="h-5 bg-gray-200 rounded w-28 animate-pulse"></div>
                                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                                   </CardHeader>
                                   <CardContent>
                                      <div className="space-y-2">
                                         <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                                         <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                                      </div>
                                   </CardContent>
                                </Card>
                             ))
                           : metrics.map((m) => (
                                <Card
                                   key={m.title}
                                   className="relative"
                                >
                                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                      <h3 className="text-lg text-[#23272E] font-semibold">
                                         {m.title}
                                      </h3>
                                   </CardHeader>
                                   <CardContent>
                                      <div className="space-y-2 flex items-end gap-2">
                                         <div className="text-3xl font-bold text-[#023337]">
                                            {m.value}
                                         </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-2">
                                         {m.period}
                                      </div>
                                   </CardContent>
                                </Card>
                             ))}
                     </div>
                  );
               })()}
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg mb-6">
               <div className="flex gap-4 items-center">
                  <div className="flex-1">
                     <Input
                        placeholder="Search orders..."
                        value={search}
                        onChange={handleSearchChange}
                        className="max-w-xs"
                     />
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-sm text-muted-foreground">
                        Showing {rangeStart}-{rangeEnd} of {totalCount}
                     </div>
                     <select
                        value={limit}
                        onChange={(e) => {
                           const v = Number(e.target.value) || 50;
                           setLimit(v);
                           setPage(1);
                        }}
                        className="rounded border px-2 py-1 text-sm"
                        aria-label="Rows per page"
                     >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                     </select>
                     <Button variant="outline">Export</Button>
                  </div>
               </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg">
               <DataTable
                  columns={columns}
                  data={ordersData}
               />
            </div>
            {selectedOrder && (
               <ManageRefundDialog
                  open={showManageRefund}
                  onOpenChange={(v: boolean) => {
                     setShowManageRefund(v);
                     if (!v) setSelectedOrder(null);
                  }}
                  order={selectedOrder}
               />
            )}
            {selectedOrderDetail && (
               <OrderDetailsDialog
                  open={Boolean(selectedOrderDetail)}
                  onOpenChange={(v: boolean) => {
                     if (!v) setSelectedOrderDetail(null);
                  }}
                  order={selectedOrderDetail}
               />
            )}
            <AssignRiderDialog
               open={showAssignDialog}
               onOpenChange={(v: boolean) => {
                  setShowAssignDialog(v);
                  if (!v) setAssignOrderId(null);
               }}
               orderId={assignOrderId ?? ""}
            />
            <div className="mt-4">
               <Pagination>
                  <PaginationContent>
                     <PaginationItem>
                        <PaginationPrevious
                           href="#"
                           onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page - 1);
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
                                 handlePageChange(p);
                              }}
                           >
                              {p}
                           </PaginationLink>
                        </PaginationItem>
                     ))}
                     {page + 2 < totalPages && (
                        <PaginationItem>
                           <PaginationEllipsis />
                        </PaginationItem>
                     )}
                     <PaginationItem>
                        <PaginationNext
                           href="#"
                           onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page + 1);
                           }}
                           className={
                              page === totalPages
                                 ? "pointer-events-none opacity-50"
                                 : ""
                           }
                        />
                     </PaginationItem>
                  </PaginationContent>
               </Pagination>
            </div>
         </div>
      </ScrollArea>
   );
}
