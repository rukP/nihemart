"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import {
   useReactTable,
   createColumnHelper,
   getCoreRowModel,
   getPaginationRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { useRiderAssignments, useRespondToAssignment } from "@/hooks/useRiders";
import { fetchOrderById } from "@/integrations/supabase/orders";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import {
   MoreHorizontal,
   Search,
   ArrowLeft,
   Package,
   MapPin,
   Clock,
   CheckCircle,
   XCircle,
   Loader2,
   Filter,
} from "lucide-react";

const Page = () => {
   const { user, isLoggedIn } = useAuth();
   const { t } = useLanguage();
   const [riderId, setRiderId] = useState<string | null>(null);
   const [loadingRider, setLoadingRider] = useState(false);

   const respond = useRespondToAssignment();

   useEffect(() => {
      if (!user) return;
      (async () => {
         setLoadingRider(true);
         try {
            const r = await fetchRiderByUserId(user.id);
            setRiderId(r?.id || null);
         } catch (err) {
            console.error("Failed to fetch rider for user", err);
         } finally {
            setLoadingRider(false);
         }
      })();
   }, [user]);

   const { data: assignments, isLoading } = useRiderAssignments(
      riderId || undefined
   );

   // Cache for order details when assignment does not include joined order data
   const [orderMap, setOrderMap] = useState<Record<string, any>>({});
   const [viewOrder, setViewOrder] = useState<any | null>(null);
   const [search, setSearch] = useState("");

   // Handler to respond to assignments (accepted/rejected/completed)
   const handleRespond = async (
      assignmentId: string,
      status: "accepted" | "rejected" | "completed"
   ) => {
      try {
         await respond.mutateAsync({ assignmentId, status });
         // Provide a nice toast for success
         if (status === "accepted")
            toast.success("Assignment accepted successfully!");
         else if (status === "rejected") toast.success("Assignment rejected");
         else if (status === "completed")
            toast.success("Order marked as delivered!");
      } catch (err: any) {
         console.error(err);
         const msg =
            (err && err.error && (err.error.message || err.error)) ||
            err?.message ||
            (typeof err === "string" ? err : null) ||
            "Failed to respond to assignment";
         toast.error(String(msg));
      }
   };

   // Prepare table data and columns in stable hooks to avoid changing hook order
   const data = useMemo(() => {
      return (assignments || []).map((a: any) => {
         let order: any = null;
         if (a.orders) order = a.orders;
         if (!order && a.order) order = a.order;
         if (typeof order === "string") {
            try {
               order = JSON.parse(order);
            } catch (e) {}
         }
         if (Array.isArray(order)) order = order[0] || null;
         if (!order && orderMap[a.order_id]) order = orderMap[a.order_id];

         const location =
            order?.delivery_address ||
            order?.delivery_city ||
            a.location ||
            a.address ||
            "-";
         let deliveryFee: number | null = null;
         if (order) {
            // Get delivery fee from order.tax field
            if (typeof order.tax === "number") deliveryFee = order.tax;
         }
         if (deliveryFee == null) {
            // Fallback to assignment data if available
            if (typeof a.delivery_fee === "number")
               deliveryFee = a.delivery_fee;
            else if (typeof a.fee === "number") deliveryFee = a.fee;
         }

         return {
            assignment: a,
            order,
            orderNumber: order?.order_number
               ? `#${order.order_number}`
               : `#${a.order_id}`,
            location,
            deliveryFee,
            status: a.status,
            assignedAt: a.assigned_at,
         };
      });
   }, [assignments, orderMap]);

   const filteredData = useMemo(() => {
      if (!search) return data;
      return data.filter((row: any) => {
         const text =
            `${row.orderNumber} ${row.location} ${row.status}`.toLowerCase();
         return text.includes(search.toLowerCase());
      });
   }, [data, search]);

   const columns = useMemo(() => {
      const columnHelper = createColumnHelper<any>();
      return [
         // selection column
         {
            id: "select",
            header: ({ table }: any) => (
               <Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  onCheckedChange={(v: any) =>
                     table.toggleAllPageRowsSelected(!!v)
                  }
               />
            ),
            cell: ({ row }: any) => (
               <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v: any) => row.toggleSelected(!!v)}
               />
            ),
            enableSorting: false,
            size: 50,
         },
         columnHelper.accessor("orderNumber", {
            header: t("rider.orders.order"),
            cell: (info) => (
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                     <Package className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="font-semibold text-gray-900">
                     {info.getValue()}
                  </span>
               </div>
            ),
            size: 150,
         }),
         columnHelper.accessor("location", {
            header: t("rider.orders.deliveryLocation"),
            cell: (info) => (
               <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 max-w-xs truncate">
                     {info.getValue()}
                  </span>
               </div>
            ),
            size: 250,
         }),
         columnHelper.accessor("deliveryFee", {
            header: t("rider.orders.deliveryFee"),
            cell: (info) => {
               const v = info.getValue();
               return (
                  <span className="font-semibold text-gray-900">
                     {v != null ? `RWF ${Number(v).toLocaleString()}` : "-"}
                  </span>
               );
            },
            size: 120,
         }),
         columnHelper.accessor("status", {
            header: t("rider.orders.actions"),
            cell: (info) => {
               const row = info.row.original;
               const a = row.assignment;

               if (a.status === "assigned") {
                  return (
                     <div className="flex gap-2">
                        <Button
                           onClick={() => handleRespond(a.id, "accepted")}
                           size="sm"
                           className="bg-green-600 hover:bg-green-700 text-white"
                           disabled={respond.isPending}
                        >
                           <CheckCircle className="w-4 h-4 mr-1" />
                           {t("rider.orders.accept")}
                        </Button>
                        <Button
                           onClick={() => handleRespond(a.id, "rejected")}
                           size="sm"
                           variant="destructive"
                           disabled={respond.isPending}
                        >
                           <XCircle className="w-4 h-4 mr-1" />
                           {t("rider.orders.reject")}
                        </Button>
                     </div>
                  );
               }

               if (a.status === "accepted") {
                  return (
                     <Button
                        onClick={() => handleRespond(a.id, "completed")}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={respond.isPending}
                     >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t("rider.orders.markDelivered")}
                     </Button>
                  );
               }

               // Status badges for completed states
               const statusConfig = {
                  rejected: {
                     color: "bg-red-100 text-red-700",
                     label: t("rider.orders.rejected"),
                  },
                  completed: {
                     color: "bg-green-100 text-green-700",
                     label: t("rider.orders.delivered"),
                  },
               };

               const config =
                  statusConfig[a.status as keyof typeof statusConfig];

               if (config) {
                  return (
                     <Badge className={`${config.color} hover:${config.color}`}>
                        {config.label}
                     </Badge>
                  );
               }

               return (
                  <Badge
                     variant="outline"
                     className="text-gray-600"
                  >
                     {a.status}
                  </Badge>
               );
            },
            size: 200,
         }),
         columnHelper.display({
            id: "actions",
            header: () => null,
            cell: (info) => {
               const row = info.row.original;
               const a = row.assignment;
               const order = row.order;
               return (
                  <div className="flex items-center justify-end">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                           >
                              <MoreHorizontal className="h-4 w-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem
                              onClick={async () => {
                                 let o = order || orderMap[a.order_id];
                                 if (!o) {
                                    try {
                                       o = await fetchOrderById(a.order_id);
                                       if (o)
                                          setOrderMap((p) => ({
                                             ...p,
                                             [a.order_id]: o,
                                          }));
                                    } catch (e) {}
                                 }
                                 if (o) setViewOrder(o);
                              }}
                           >
                              {t("rider.orders.viewDetails")}
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onClick={() => {
                                 if (
                                    typeof navigator !== "undefined" &&
                                    navigator.clipboard
                                 )
                                    navigator.clipboard.writeText(
                                       a.order_id || ""
                                    );
                                 toast.success("Order ID copied to clipboard");
                              }}
                           >
                              {t("rider.orders.copyOrderId")}
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               );
            },
            size: 60,
         }),
      ];
   }, [handleRespond, orderMap, respond.isPending]);

   const table = useReactTable({
      data: filteredData,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
   });

   useEffect(() => {
      if (!assignments || assignments.length === 0) return;

      const missingIds = assignments
         .map((a: any) => a.order_id)
         .filter((id: any) => id && !orderMap[id]);

      if (missingIds.length === 0) return;

      let canceled = false;

      (async () => {
         try {
            const results = await Promise.all(
               missingIds.map((id: string) =>
                  fetchOrderById(id).catch(() => null)
               )
            );
            if (canceled) return;
            setOrderMap((prev) => {
               const next = { ...prev };
               missingIds.forEach((id: string, idx: number) => {
                  const res = results[idx];
                  if (res) next[id] = res;
               });
               return next;
            });
         } catch (err) {
            console.error("Failed to fetch assignment orders:", err);
         }
      })();

      return () => {
         canceled = true;
      };
   }, [assignments]);

   // Stats calculation
   const stats = useMemo(() => {
      const total = assignments?.length || 0;
      const assigned =
         assignments?.filter((a: any) => a.status === "assigned").length || 0;
      const accepted =
         assignments?.filter((a: any) => a.status === "accepted").length || 0;
      const completed =
         assignments?.filter((a: any) => a.status === "completed").length || 0;
      return { total, assigned, accepted, completed };
   }, [assignments]);

   if (!isLoggedIn) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
               <CardContent className="pt-6 text-center">
                  <h2 className="text-xl font-semibold mb-2">
                     Authentication Required
                  </h2>
                  <p className="text-gray-600">
                     Please sign in to view your assigned orders.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   if (loadingRider) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
            <div className="flex items-center gap-3">
               <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
               <span className="text-gray-600">Loading rider profile...</span>
            </div>
         </div>
      );
   }

   if (!riderId) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
               <CardContent className="pt-6 text-center">
                  <h2 className="text-xl font-semibold mb-2">
                     No Rider Profile
                  </h2>
                  <p className="text-gray-600">
                     No rider profile found for your account.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
         <ScrollArea className="h-[calc(100vh-2rem)]">
            <div className="mx-auto p-6">
               <div className="mb-6">
                  <Link
                     href="/rider"
                     className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                     <ArrowLeft className="w-4 h-4" />
                     Back to Dashboard
                  </Link>
               </div>

               {/* Stats Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <Card className="border-0 shadow-md">
                     <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-blue-600" />
                           </div>
                           <div>
                              <p className="text-2xl font-bold text-gray-900">
                                 {stats.total}
                              </p>
                              <p className="text-sm text-gray-500">
                                 Total Orders
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md">
                     <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-yellow-600" />
                           </div>
                           <div>
                              <p className="text-2xl font-bold text-gray-900">
                                 {stats.assigned}
                              </p>
                              <p className="text-sm text-gray-500">Pending</p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md">
                     <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-orange-600" />
                           </div>
                           <div>
                              <p className="text-2xl font-bold text-gray-900">
                                 {stats.accepted}
                              </p>
                              <p className="text-sm text-gray-500">
                                 In Progress
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md">
                     <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                           </div>
                           <div>
                              <p className="text-2xl font-bold text-gray-900">
                                 {stats.completed}
                              </p>
                              <p className="text-sm text-gray-500">Completed</p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>

               <Card className="border-0 shadow-lg">
                  <CardHeader>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                           <CardTitle className="text-xl text-gray-900">
                              {t("rider.orders.assignedTitle")}
                           </CardTitle>
                           <p className="text-sm text-gray-500 mt-1">
                              {t("rider.orders.assignedDesc")}
                           </p>
                        </div>
                        <div className="relative w-full sm:w-80">
                           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <Input
                              placeholder={t("rider.searchPlaceholder")}
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                           />
                        </div>
                     </div>
                  </CardHeader>

                  <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                           <div className="flex items-center gap-3">
                              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                              <span className="text-gray-600">
                                 {t("rider.orders.loading")}
                              </span>
                           </div>
                        </div>
                     ) : filteredData.length === 0 ? (
                        <div className="text-center py-16">
                           <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                           <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {search
                                 ? t("rider.orders.noMatching")
                                 : t("rider.orders.noAssigned")}
                           </h3>
                           <p className="text-gray-500">
                              {search
                                 ? t("rider.orders.trySearch")
                                 : t("rider.orders.newAssignments")}
                           </p>
                        </div>
                     ) : (
                        <>
                           {/* Mobile Card View - hidden on md and up */}
                           <div className="md:hidden space-y-3">
                              {filteredData.map((row: any, idx: number) => {
                                 const a = row.assignment;
                                 const order = row.order;

                                 return (
                                    <Card
                                       key={idx}
                                       className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                       <CardContent className="p-4 space-y-3">
                                          {/* Order Number & Status */}
                                          <div className="flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                                   <Package className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <span className="font-bold text-gray-900">
                                                   {row.orderNumber}
                                                </span>
                                             </div>
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                   <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-8 w-8 p-0"
                                                   >
                                                      <MoreHorizontal className="h-4 w-4" />
                                                   </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                   <DropdownMenuItem
                                                      onClick={async () => {
                                                         let o =
                                                            order ||
                                                            orderMap[
                                                               a.order_id
                                                            ];
                                                         if (!o) {
                                                            try {
                                                               o =
                                                                  await fetchOrderById(
                                                                     a.order_id
                                                                  );
                                                               if (o)
                                                                  setOrderMap(
                                                                     (p) => ({
                                                                        ...p,
                                                                        [a.order_id]:
                                                                           o,
                                                                     })
                                                                  );
                                                            } catch (e) {}
                                                         }
                                                         if (o) setViewOrder(o);
                                                      }}
                                                   >
                                                      {t(
                                                         "rider.orders.viewDetails"
                                                      )}
                                                   </DropdownMenuItem>
                                                   <DropdownMenuItem
                                                      onClick={() => {
                                                         if (
                                                            typeof navigator !==
                                                               "undefined" &&
                                                            navigator.clipboard
                                                         )
                                                            navigator.clipboard.writeText(
                                                               a.order_id || ""
                                                            );
                                                         toast.success(
                                                            "Order ID copied to clipboard"
                                                         );
                                                      }}
                                                   >
                                                      {t(
                                                         "rider.orders.copyOrderId"
                                                      )}
                                                   </DropdownMenuItem>
                                                </DropdownMenuContent>
                                             </DropdownMenu>
                                          </div>

                                          {/* Location */}
                                          <div className="flex items-start gap-2">
                                             <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                             <span className="text-sm text-gray-600 line-clamp-2">
                                                {row.location}
                                             </span>
                                          </div>

                                          {/* Delivery Fee */}
                                          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                             <span className="text-sm text-gray-600">
                                                {t("rider.orders.deliveryFee")}
                                             </span>
                                             <span className="font-bold text-gray-900">
                                                {row.deliveryFee != null
                                                   ? `RWF ${Number(
                                                        row.deliveryFee
                                                     ).toLocaleString()}`
                                                   : "-"}
                                             </span>
                                          </div>

                                          {/* Action Buttons or Status Badge */}
                                          <div className="pt-2">
                                             {a.status === "assigned" ? (
                                                <div className="flex gap-2">
                                                   <Button
                                                      onClick={() =>
                                                         handleRespond(
                                                            a.id,
                                                            "accepted"
                                                         )
                                                      }
                                                      size="sm"
                                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                      disabled={
                                                         respond.isPending
                                                      }
                                                   >
                                                      <CheckCircle className="w-4 h-4 mr-1" />
                                                      {t("rider.orders.accept")}
                                                   </Button>
                                                   <Button
                                                      onClick={() =>
                                                         handleRespond(
                                                            a.id,
                                                            "rejected"
                                                         )
                                                      }
                                                      size="sm"
                                                      variant="destructive"
                                                      className="flex-1"
                                                      disabled={
                                                         respond.isPending
                                                      }
                                                   >
                                                      <XCircle className="w-4 h-4 mr-1" />
                                                      {t("rider.orders.reject")}
                                                   </Button>
                                                </div>
                                             ) : a.status === "accepted" ? (
                                                <Button
                                                   onClick={() =>
                                                      handleRespond(
                                                         a.id,
                                                         "completed"
                                                      )
                                                   }
                                                   size="sm"
                                                   className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                                   disabled={respond.isPending}
                                                >
                                                   <CheckCircle className="w-4 h-4 mr-1" />
                                                   {t(
                                                      "rider.orders.markDelivered"
                                                   )}
                                                </Button>
                                             ) : (
                                                <div className="flex justify-center">
                                                   {a.status === "rejected" ? (
                                                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                         {t(
                                                            "rider.orders.rejected"
                                                         )}
                                                      </Badge>
                                                   ) : a.status ===
                                                     "completed" ? (
                                                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                         {t(
                                                            "rider.orders.delivered"
                                                         )}
                                                      </Badge>
                                                   ) : (
                                                      <Badge
                                                         variant="outline"
                                                         className="text-gray-600"
                                                      >
                                                         {a.status}
                                                      </Badge>
                                                   )}
                                                </div>
                                             )}
                                          </div>
                                       </CardContent>
                                    </Card>
                                 );
                              })}
                           </div>

                           {/* Desktop Table View - hidden on mobile */}
                           <div className="hidden md:block space-y-4">
                              <div className="overflow-x-auto">
                                 <div className="min-w-[800px]">
                                    <DataTable table={table as any} />
                                 </div>
                              </div>
                           </div>
                        </>
                     )}
                  </CardContent>
               </Card>
            </div>
         </ScrollArea>
         {/* Order details dialog — opens when viewOrder is set */}
         {viewOrder && (
            <OrderDetailsDialog
               open={!!viewOrder}
               onOpenChange={(open: boolean) => {
                  if (!open) setViewOrder(null);
               }}
               order={viewOrder}
            />
         )}
      </div>
   );
};

export default Page;
