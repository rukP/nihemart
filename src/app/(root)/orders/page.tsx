"use client";

import { useState } from "react";
import {
   Package,
   Eye,
   Calendar,
   MapPin,
   Search,
   Filter,
   Loader2,
   ArrowLeft,
   ShoppingBag,
   CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
} from "@/components/ui/dialog";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/types/orders";

const Orders = () => {
   const { t } = useLanguage();
   const { isLoggedIn, user, hasRole } = useAuth();
   const router = useRouter();

   const [filters, setFilters] = useState({
      search: "",
      status: "all" as OrderStatus | "all",
      page: 1,
   });

   const {
      useUserOrders,
      updateOrderStatus,
      useRequestRefundOrder,
      useCancelRefundRequestOrder,
   } = useOrders();
   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();

   // Local map to track cancelling state per order id for better UX.
   const [cancellingMap, setCancellingMap] = useState<Record<string, boolean>>(
      {}
   );

   // Build query options similar to the admin page so that changes to
   // search/status/page trigger a refetch via the queryKey created in
   // useUserOrders (which includes options in the key).
   const queryOptions = {
      filters: {
         search: filters.search || undefined,
         status: filters.status !== "all" ? filters.status : undefined,
      },
      pagination: {
         page: filters.page,
         limit: 10,
      },
      sort: {
         column: "created_at",
         direction: "desc",
      },
   } as const;

   const {
      data: ordersData,
      isLoading,
      isError,
      error,
      refetch,
   } = useUserOrders(queryOptions);

   // Refund dialog state
   const [refundDialogOpen, setRefundDialogOpen] = useState(false);
   const [refundTargetOrder, setRefundTargetOrder] = useState<string | null>(
      null
   );
   const [refundReasonInput, setRefundReasonInput] = useState("");

   // Redirect if not logged in
   if (!isLoggedIn) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            <div className="text-center py-8 sm:py-12">
               <Package className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                  Please Log In
               </h1>
               <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-4">
                  You need to be logged in to view your orders.
               </p>
               <Button
                  onClick={() => router.push("/signin?redirect=/orders")}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
               >
                  Log In
               </Button>
            </div>
         </div>
      );
   }

   const getStatusBadge = (status?: string) => {
      if (!status) return <Badge variant="secondary">Unknown</Badge>;

      const badgeConfig = {
         pending: {
            variant: "secondary",
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
         },
         processing: {
            variant: "default",
            color: "bg-blue-100 text-blue-800 border-blue-200",
         },
         shipped: {
            variant: "secondary",
            color: "bg-purple-100 text-purple-800 border-purple-200",
         },
         delivered: {
            variant: "default",
            color: "bg-green-100 text-green-800 border-green-200",
         },
         cancelled: {
            variant: "destructive",
            color: "bg-red-100 text-red-800 border-red-200",
         },
      };

      const config = badgeConfig[status as keyof typeof badgeConfig];

      return (
         <Badge
            variant={(config?.variant as any) || "secondary"}
            className={`${
               config?.color || "bg-gray-100 text-gray-800"
            } font-medium`}
         >
            {status.charAt(0).toUpperCase() + status.slice(1)}
         </Badge>
      );
   };

   const handleSearch = (value: string) => {
      setFilters((prev) => ({ ...prev, search: value, page: 1 }));
      setTimeout(() => {
         try {
            refetch?.();
         } catch (e) {}
      }, 0);
   };

   const handleStatusFilter = (value: string) => {
      setFilters((prev) => ({
         ...prev,
         status: value as OrderStatus | "all",
         page: 1,
      }));
      setTimeout(() => {
         try {
            refetch?.();
         } catch (e) {}
      }, 0);
   };

   const handlePageChange = (page: number) => {
      setFilters((prev) => ({ ...prev, page }));
   };

   if (isError) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            <div className="text-center py-8 sm:py-12">
               <Package className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                  Error Loading Orders
               </h1>
               <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-4">
                  {error?.message ||
                     "Failed to load orders. Please try again later."}
               </p>
               <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
               <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-1 sm:p-2 hover:bg-gray-100 h-8 w-8 sm:h-10 sm:w-10"
               >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
               </Button>
               <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                     {t("nav.orders")}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                     Track and manage your orders
                  </p>
               </div>
            </div>
         </div>

         {/* Filters */}
         <Card className="mb-6 sm:mb-8 border-orange-200">
            <CardContent className="p-4 sm:p-6">
               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                        placeholder="Search orders..."
                        value={filters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm h-10"
                     />
                  </div>
                  <div className="w-full sm:w-48">
                     <Select
                        value={filters.status}
                        onValueChange={handleStatusFilter}
                     >
                        <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm h-10">
                           <Filter className="h-4 w-4 mr-2" />
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All Status</SelectItem>
                           <SelectItem value="pending">Pending</SelectItem>
                           <SelectItem value="processing">
                              Processing
                           </SelectItem>
                           <SelectItem value="shipped">Shipped</SelectItem>
                           <SelectItem value="delivered">Delivered</SelectItem>
                           <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
            </CardContent>
         </Card>

         {isLoading ? (
            <div className="flex justify-center items-center py-12">
               <Loader2 className="h-8 w-8 animate-spin" />
               <span className="ml-2 text-sm sm:text-base">
                  Loading orders...
               </span>
            </div>
         ) : !ordersData?.data || ordersData.data.length === 0 ? (
            <Card className="text-center py-8 sm:py-12">
               <CardContent className="p-4 sm:p-6">
                  <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4">
                     {filters.search || filters.status !== "all"
                        ? "No orders found"
                        : "No orders yet"}
                  </h2>
                  <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
                     {filters.search || filters.status !== "all"
                        ? "Try adjusting your search or filters"
                        : "Start shopping to see your orders here!"}
                  </p>
                  {filters.search || filters.status !== "all" ? (
                     <Button
                        onClick={() =>
                           setFilters({ search: "", status: "all", page: 1 })
                        }
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                     >
                        Clear Filters
                     </Button>
                  ) : (
                     <Button
                        onClick={() => router.push("/")}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                     >
                        Start Shopping
                     </Button>
                  )}
               </CardContent>
            </Card>
         ) : (
            <>
               <div className="space-y-4 sm:space-y-6">
                  {ordersData.data.map((order) => (
                     <Card
                        key={order.id}
                        className="hover:shadow-md transition-shadow overflow-hidden"
                     >
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                              <div className="min-w-0 flex-1">
                                 <CardTitle className="text-lg sm:text-xl font-bold text-orange-800 mb-2">
                                    Order #{order.order_number}
                                 </CardTitle>
                                 <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                    <div className="flex items-center">
                                       <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                       {new Date(
                                          order.created_at
                                       ).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center">
                                       <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                       {order.delivery_city}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-2">
                                 <div className="flex flex-wrap gap-2 justify-end">
                                    {getStatusBadge(order.status)}
                                    {/* Show refund status badge if applicable */}
                                    {order.refund_status && (
                                       <Badge
                                          variant={(() => {
                                             switch (order.refund_status) {
                                                case "approved":
                                                   return "default";
                                                case "rejected":
                                                   return "destructive";
                                                case "requested":
                                                case "cancelled":
                                                default:
                                                   return "secondary";
                                             }
                                          })()}
                                          className="text-xs"
                                       >
                                          {order.refund_status === "approved"
                                             ? "Refund Approved"
                                             : order.refund_status ===
                                               "requested"
                                             ? "Refund Requested"
                                             : order.refund_status ===
                                               "rejected"
                                             ? "Refund Rejected"
                                             : order.refund_status ===
                                               "cancelled"
                                             ? "Refund Cancelled"
                                             : typeof order.refund_status ===
                                               "string"
                                             ? order.refund_status
                                                  .charAt(0)
                                                  .toUpperCase() +
                                               order.refund_status.slice(1)
                                             : "Unknown"}
                                       </Badge>
                                    )}
                                 </div>
                                 <p className="text-lg sm:text-xl font-bold text-gray-900">
                                    {Number(order.total).toLocaleString()} RWF
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                           <div className="space-y-3">
                              {order.items && order.items.length > 0 ? (
                                 order.items.slice(0, 3).map((item, index) => (
                                    <div
                                       key={index}
                                       className="flex justify-between items-start py-2 border-b last:border-b-0"
                                    >
                                       <div className="min-w-0 flex-1 pr-4">
                                          <p className="font-medium text-sm sm:text-base break-words">
                                             {item.product_name}
                                          </p>
                                          {item.variation_name && (
                                             <p className="text-xs sm:text-sm text-muted-foreground">
                                                {item.variation_name}
                                             </p>
                                          )}
                                          <p className="text-xs sm:text-sm text-muted-foreground">
                                             Qty: {item.quantity}
                                          </p>
                                       </div>
                                       <p className="font-medium text-sm sm:text-base whitespace-nowrap">
                                          {Number(item.total).toLocaleString()}{" "}
                                          RWF
                                       </p>
                                    </div>
                                 ))
                              ) : (
                                 <div className="py-2 text-muted-foreground text-sm">
                                    No items found
                                 </div>
                              )}
                              {order.items && order.items.length > 3 && (
                                 <p className="text-xs sm:text-sm text-muted-foreground">
                                    +{order.items.length - 3} more items
                                 </p>
                              )}
                           </div>

                           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mt-4 pt-4 border-t">
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                 <div>
                                    Customer: {order.customer_first_name}{" "}
                                    {order.customer_last_name}
                                 </div>
                                 {/* Show refund information if available */}
                                 {order.refund_status === "approved" && (
                                    <div className="text-green-600 mt-1 text-xs">
                                       💰 {t("refundApprovedMessage")}
                                    </div>
                                 )}
                                 {order.refund_status === "requested" && (
                                    <div className="text-blue-600 mt-1 text-xs">
                                       🔄 Refund request under review
                                    </div>
                                 )}
                                 {order.refund_status === "rejected" && (
                                    <div className="text-red-600 mt-1 text-xs">
                                       ❌ Refund request was not approved
                                    </div>
                                 )}
                                 {/* Show refund window status for delivered orders */}
                                 {order.status === "delivered" &&
                                    order.delivered_at &&
                                    !order.refund_status &&
                                    (() => {
                                       const deliveredAt = new Date(
                                          order.delivered_at
                                       ).getTime();
                                       const within24h =
                                          Date.now() - deliveredAt <=
                                          24 * 60 * 60 * 1000;
                                       if (!within24h) {
                                          return (
                                             <div className="text-gray-500 mt-1 text-xs">
                                                ⏰ Refund window expired (24
                                                hours after delivery)
                                             </div>
                                          );
                                       }
                                       return (
                                          <div className="text-green-600 mt-1 text-xs">
                                             ✅ Refund available (within 24
                                             hours of delivery)
                                          </div>
                                       );
                                    })()}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                 <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                       router.push(`/orders/${order.id}`)
                                    }
                                    className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    View Details
                                 </Button>

                                 {/* Cancel Order (owner or admin) */}
                                 {(user?.id === order.user_id ||
                                    hasRole("admin")) &&
                                    ["pending", "processing"].includes(
                                       order.status || ""
                                    ) && (
                                       <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                             // optimistic UI: set cancelling state
                                             setCancellingMap((s) => ({
                                                ...s,
                                                [order.id]: true,
                                             }));
                                             try {
                                                await updateOrderStatus.mutateAsync(
                                                   {
                                                      id: order.id,
                                                      status: "cancelled",
                                                   }
                                                );
                                             } catch (err) {
                                                console.error(err);
                                             } finally {
                                                // clear local cancelling flag after mutation settled
                                                setCancellingMap((s) => {
                                                   const copy = { ...s };
                                                   delete copy[order.id];
                                                   return copy;
                                                });
                                             }
                                          }}
                                          className="border-red-300 text-red-600 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9"
                                          disabled={!!cancellingMap[order.id]}
                                       >
                                          {cancellingMap[order.id] ? (
                                             <span className="flex items-center gap-2">
                                                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                                Cancelling
                                             </span>
                                          ) : (
                                             "Cancel"
                                          )}
                                       </Button>
                                    )}

                                 {/* Request full refund: only within 24h after delivered and visible to owner/admin */}
                                 {order.status === "delivered" &&
                                    order.delivered_at &&
                                    (user?.id === order.user_id ||
                                       hasRole("admin")) &&
                                    (() => {
                                       const deliveredAt = new Date(
                                          order.delivered_at
                                       ).getTime();
                                       const within24h =
                                          Date.now() - deliveredAt <=
                                          24 * 60 * 60 * 1000;

                                       // Don't show anything if refund window expired
                                       if (!within24h) return null;

                                       // Show cancel refund button only when status is "requested"
                                       if (
                                          order.refund_status === "requested"
                                       ) {
                                          return (
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                   try {
                                                      await cancelOrderRefund.mutateAsync(
                                                         order.id
                                                      );
                                                   } catch (err) {
                                                      console.error(err);
                                                   }
                                                }}
                                                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-9"
                                             >
                                                Cancel Refund Request
                                             </Button>
                                          );
                                       }

                                       // Show approved status badge
                                       if (order.refund_status === "approved") {
                                          return (
                                             <Badge
                                                variant="default"
                                                className="text-xs bg-green-100 text-green-700"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refund Approved
                                             </Badge>
                                          );
                                       }

                                       // Show refunded status badge
                                       if (order.refund_status === "refunded") {
                                          return (
                                             <Badge
                                                variant="default"
                                                className="text-xs bg-green-100 text-green-700"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refunded
                                             </Badge>
                                          );
                                       }

                                       // Show rejected status badge (no action available)
                                       if (order.refund_status === "rejected") {
                                          return (
                                             <Badge
                                                variant="destructive"
                                                className="text-xs"
                                             >
                                                Refund Rejected
                                             </Badge>
                                          );
                                       }

                                       // Only show Request Refund button if:
                                       // 1. No refund status OR refund was cancelled
                                       // 2. Within 24h window
                                       const canRequestRefund =
                                          !order.refund_status ||
                                          order.refund_status === "cancelled";

                                       if (canRequestRefund) {
                                          return (
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                   setRefundTargetOrder(
                                                      order.id
                                                   );
                                                   setRefundReasonInput("");
                                                   setRefundDialogOpen(true);
                                                }}
                                                className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9"
                                             >
                                                Request Full Refund
                                             </Button>
                                          );
                                       }

                                       // Default: no action available
                                       return null;
                                    })()}
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>

               {/* Refund Dialog */}
               <Dialog
                  open={refundDialogOpen}
                  onOpenChange={setRefundDialogOpen}
               >
                  <DialogContent className="max-w-md">
                     <DialogHeader>
                        <DialogTitle>Request Full-order Refund</DialogTitle>
                        <DialogDescription>
                           Please provide a reason for requesting a full refund
                           for this order.
                        </DialogDescription>
                     </DialogHeader>
                     <div className="mt-4">
                        <textarea
                           value={refundReasonInput}
                           onChange={(e) =>
                              setRefundReasonInput(e.target.value)
                           }
                           className="w-full p-3 border border-gray-300 rounded-md focus:border-orange-500 focus:ring-orange-500 text-sm"
                           rows={4}
                           placeholder="Reason for refund"
                        />
                     </div>
                     <DialogFooter>
                        <div className="flex gap-2 w-full">
                           <Button
                              variant="outline"
                              onClick={() => setRefundDialogOpen(false)}
                              className="flex-1"
                           >
                              Cancel
                           </Button>
                           <Button
                              onClick={async () => {
                                 if (!refundTargetOrder) return;
                                 if (!refundReasonInput) return;
                                 try {
                                    await requestOrderRefund.mutateAsync({
                                       orderId: refundTargetOrder,
                                       reason: refundReasonInput,
                                    });
                                    setRefundDialogOpen(false);
                                    setRefundTargetOrder(null);
                                    setRefundReasonInput("");
                                 } catch (err) {
                                    console.error(err);
                                 }
                              }}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                           >
                              Submit Request
                           </Button>
                        </div>
                     </DialogFooter>
                  </DialogContent>
               </Dialog>

               {/* Pagination */}
               {ordersData && ordersData.count > 10 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-6 sm:mt-8">
                     <div className="flex items-center gap-2">
                        <Button
                           variant="outline"
                           onClick={() => handlePageChange(filters.page - 1)}
                           disabled={filters.page === 1}
                           className="text-sm h-9"
                        >
                           Previous
                        </Button>
                        <span className="text-xs sm:text-sm text-muted-foreground px-3">
                           Page {filters.page} of{" "}
                           {Math.ceil(ordersData.count / 10)}
                        </span>
                        <Button
                           variant="outline"
                           onClick={() => handlePageChange(filters.page + 1)}
                           disabled={
                              filters.page >= Math.ceil(ordersData.count / 10)
                           }
                           className="text-sm h-9"
                        >
                           Next
                        </Button>
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
   );
};

export default Orders;
