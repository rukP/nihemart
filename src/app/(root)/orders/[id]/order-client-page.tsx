"use client";

import { useState, useOptimistic, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogFooter,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrders, useOrderAssignment } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import {
   Loader2,
   Package,
   Truck,
   CheckCircle,
   Clock,
   X,
   ArrowLeft,
   MapPin,
   Mail,
   Phone,
   User as UserIcon,
   Calendar,
   MessageCircle,
   RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { type Order } from "@/types/orders";
// User type is now from auth store
import PaymentInfoCard from "@/components/payments/PaymentInfoCard";
import Image from "next/image";
import { fetchStoreProductById } from "@/lib/api/store";
import { optimizeImageUrl } from "@/lib/utils";

interface OrderClientPageProps {
   initialData?: Order;
   user?: any; // User from auth store
   isAdmin?: boolean;
   orderId?: string;
}

const OrderClientPage = ({
   initialData,
   user: propUser,
   isAdmin: propIsAdmin,
   orderId,
}: OrderClientPageProps) => {
   const { t } = useLanguage();
   const { user: authUser, hasRole } = useAuth();
   const queryClient = useQueryClient();
   const {
      useOrder,
      cancelOrder,
      updateOrderStatus,
      markTransportOnly,
      useRequestRefundItem,
      useCancelRefundRequestItem,
      useRespondRefundRequest,
      useRequestRefundOrder,
      useCancelRefundRequestOrder,
   } = useOrders();
   const router = useRouter();

   // Fetch order if orderId is provided, otherwise use initialData
   const { data: fetchedOrder, isLoading: isLoadingOrder } = useOrder(
      orderId || "",
   );
   const orderData = fetchedOrder || initialData;
   const user = authUser || propUser;
   const isAdmin =
      propIsAdmin !== undefined
         ? propIsAdmin
         : hasRole
           ? hasRole("admin")
           : false;

   // Use optimistic updates for better UX
   const [optimisticOrder, setOptimisticOrder] = useOptimistic(
      orderData || ({} as Order),
   );

   // Sync optimisticOrder with orderData when data refetches
   useEffect(() => {
      if (orderData) {
         setOptimisticOrder(orderData);
      }
   }, [orderData, setOptimisticOrder]);

   // Declare order before using it in dependencies
   const order = optimisticOrder || orderData;

   // Listen for realtime order updates via notifications
   useEffect(() => {
      if (!orderId && !order?.id) return;

      const handleStorageChange = (e: StorageEvent) => {
         // Listen for notification events that might affect this order
         if (e.key === "notification_event") {
            try {
               const data = JSON.parse(e.newValue || "{}");
               const notificationOrderId =
                  data?.meta?.order_id || data?.meta?.orderId;

               // If notification is about this order, refetch
               if (notificationOrderId === (orderId || order?.id)) {
                  console.log(
                     "[OrderPage] Notification received for this order, refetching...",
                  );
                  // Refetch order data
                  if (orderId) {
                     queryClient.invalidateQueries({
                        queryKey: ["order", orderId],
                     });
                  }
               }
            } catch (e) {
               // Ignore parse errors
            }
         }
      };

      window.addEventListener("storage", handleStorageChange);

      return () => {
         window.removeEventListener("storage", handleStorageChange);
      };
   }, [orderId, order?.id]);

   const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
   const [showCancelConfirm, setShowCancelConfirm] = useState(false);
   const [redirectAfterCancel, setRedirectAfterCancel] = useState(true);
   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
   const [rejectReason, setRejectReason] = useState("");
   const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
   const [isRejecting, setIsRejecting] = useState(false);
   const [fullRefundDialogOpen, setFullRefundDialogOpen] = useState(false);
   const [fullRefundReason, setFullRefundReason] = useState("");
   const [isRequestingFullRefund, setIsRequestingFullRefund] = useState(false);

   const requestRefund = useRequestRefundItem();
   const cancelRefund = useCancelRefundRequestItem();
   const respondRefund = useRespondRefundRequest();
   const [unrejectingItemId, setUnrejectingItemId] = useState<string | null>(
      null,
   );

   // Load canonical product images for items (prefer main_image_url)
   // IMPORTANT: All hooks must be called before any conditional returns
   const [productImages, setProductImages] = useState<
      Record<string, string | null>
   >({});

   // All hooks must be called before conditional returns
   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();

   const isOwner = user?.id === order?.user_id;

   // Fetch assigned rider for this order (after order is defined)
   const { data: assignedRider, isLoading: isLoadingRider } =
      useOrderAssignment(order?.id || orderId, Boolean(order?.id || orderId));

   // Helper function to format payment method name
   const getPaymentMethodName = (method?: string | null) => {
      if (!method) return "Not specified";
      const names: Record<string, string> = {
         mtn_momo: "MTN Mobile Money",
         airtel_money: "Airtel Money",
         visa_card: "Visa Card",
         mastercard: "MasterCard",
         spenn: "SPENN",
         cash_on_delivery: "Cash on Delivery",
      };
      return (
         names[method] ||
         method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );
   };

   // CRITICAL: All hooks must be called BEFORE any conditional returns
   // Use order ID as stable dependency to prevent infinite re-renders
   // Memoize product IDs to prevent infinite re-renders
   const stableOrderId = order?.id || "";
   const productIds = useMemo(() => {
      const items = order?.items;
      if (!Array.isArray(items) || items.length === 0) return [];
      return Array.from(
         new Set(
            items.map((it: any) => it?.product_id).filter(Boolean) as string[],
         ),
      );
   }, [order?.items]);

   useEffect(() => {
      let mounted = true;
      const load = async () => {
         try {
            if (productIds.length === 0) {
               if (mounted) setProductImages({});
               return;
            }
            const map: Record<string, string | null> = {};
            await Promise.all(
               productIds.map(async (id) => {
                  try {
                     const data = await fetchStoreProductById(id);
                     map[id] =
                        data?.product?.main_image_url ||
                        data?.product?.mainImageUrl ||
                        null;
                  } catch (e) {
                     map[id] = null;
                  }
               }),
            );
            if (mounted) setProductImages(map);
         } catch (e) {
            // ignore
         }
      };
      if (stableOrderId && productIds.length > 0) {
         load();
      } else {
         if (mounted) setProductImages({});
      }
      return () => {
         mounted = false;
      };
   }, [stableOrderId, productIds]);

   // Show loading state while fetching
   if (orderId && isLoadingOrder) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
               <Loader2 className="h-8 w-8 animate-spin" />
               <span className="ml-2">Loading order...</span>
            </div>
         </div>
      );
   }

   // Show error if order not found
   // Early return if order is not available
   if (!order || typeof order !== "object" || !order.id) {
      if (isLoadingOrder) {
         return (
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
               <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <span className="ml-2 text-sm sm:text-base">
                     Loading order details...
                  </span>
               </div>
            </div>
         );
      }
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center">
               <h1 className="text-2xl font-bold mb-4">Order not found</h1>
               <Button onClick={() => router.push("/orders")}>
                  Back to Orders
               </Button>
            </div>
         </div>
      );
   }

   // Derive a normalized order state used for action visibility
   // Ensure order exists and has a status before computing
   // This must be computed after the order check, so we use a safe default
   const orderStateForActions: string = (() => {
      try {
         if (!order || typeof order !== "object") return "";
         const orderStatus = order.status || "";
         if (String(orderStatus) === "refunded") return "refunded";
         const status = (order as any).refund_status || orderStatus;
         return status ? String(status) : "";
      } catch (e) {
         console.error("Error computing orderStateForActions:", e);
         return "";
      }
   })();

   // Determine if there are any actionable items for the Order Actions card
   const hasOrderActions = (() => {
      if (!order) return false;

      // Admin actions: allow status updates
      if (isAdmin) {
         if (
            orderStateForActions === "pending" ||
            orderStateForActions === "processing" ||
            orderStateForActions === "shipped"
         )
            return true;
      }

      // Owner actions: show unless refunded or refund window expired
      if (isOwner) {
         // Hide actions if order is refunded
         if (orderStateForActions === "refunded") return false;

         // If delivered, check refund window (24h)
         if (orderStateForActions === "delivered") {
            if (order.delivered_at) {
               const deliveredAt = new Date(order.delivered_at).getTime();
               const now = Date.now();
               const within24h = now - deliveredAt <= 24 * 60 * 60 * 1000;

               // Show actions if still within 24h or there is an active refund status
               if (within24h) return true;
               if (
                  order.refund_status &&
                  String(order.refund_status) !== "refunded"
               )
                  return true;

               // delivered and refund window expired with no refund -> hide
               return false;
            }

            // delivered but no delivered_at timestamp -> show actions conservatively
            return true;
         }

         // For non-delivered statuses (pending, processing, shipped, etc.) show actions
         return true;
      }

      return false;
   })();

   const getStatusColor = (status?: string) => {
      if (!status) return "bg-gray-500";
      switch (status) {
         case "pending":
            return "bg-yellow-500";
         case "processing":
            return "bg-blue-500";
         case "shipped":
            return "bg-purple-500";
         case "delivered":
            return "bg-green-500";
         case "cancelled":
            return "bg-red-500";
         default:
            return "bg-gray-500";
      }
   };

   const getStatusIcon = (status?: string) => {
      if (!status) return <Clock className="h-4 w-4" />;
      switch (status) {
         case "pending":
            return <Clock className="h-4 w-4" />;
         case "processing":
            return <Package className="h-4 w-4" />;
         case "shipped":
            return <Truck className="h-4 w-4" />;
         case "delivered":
            return <CheckCircle className="h-4 w-4" />;
         case "cancelled":
            return <X className="h-4 w-4" />;
         default:
            return <Clock className="h-4 w-4" />;
      }
   };

   const buildTimeline = () => {
      if (!order || typeof order !== "object") return [];

      const entries: {
         key: string;
         title: string;
         date?: string | null;
         color?: string;
         icon?: any;
      }[] = [];

      entries.push({
         key: "placed",
         title: "Order Placed",
         date: order.created_at,
         color: "bg-gray-400",
         icon: <Calendar className="h-4 w-4 text-white" />,
      });

      const orderStatus = order.status || "";
      if (
         orderStatus === "processing" ||
         orderStatus === "shipped" ||
         orderStatus === "delivered"
      ) {
         entries.push({
            key: "processing",
            title: "Order Processing",
            date: (order as any).processed_at || order.updated_at,
            color: "bg-blue-500",
            icon: <Package className="h-4 w-4 text-white" />,
         });
      }

      if (orderStatus === "shipped" || orderStatus === "delivered") {
         entries.push({
            key: "shipped",
            title: "Order Shipped",
            date: order.shipped_at,
            color: "bg-purple-500",
            icon: <Truck className="h-4 w-4 text-white" />,
         });
      }

      if (orderStatus === "delivered") {
         entries.push({
            key: "delivered",
            title: "Order Delivered",
            date: order.delivered_at,
            color: "bg-green-500",
            icon: <CheckCircle className="h-4 w-4 text-white" />,
         });
      }

      if (orderStatus === "cancelled") {
         entries.push({
            key: "cancelled",
            title: "Order Cancelled",
            date: (order as any).cancelled_at || order.updated_at,
            color: "bg-red-500",
            icon: <X className="h-4 w-4 text-white" />,
         });
      }

      return entries.filter((e) => (e.date ? true : e.key === "placed"));
   };

   const handleStatusUpdate = async (newStatus: string) => {
      if (isUpdatingStatus) return;

      setIsUpdatingStatus(true);

      // Optimistically update the UI
      setOptimisticOrder({ ...order, status: newStatus as any });

      try {
         await updateOrderStatus.mutateAsync({
            id: order.id,
            status: newStatus as any,
         });
         toast.success(`Order status updated to ${newStatus}`);

         // Refresh the page to get updated data
         router.refresh();
      } catch (error) {
         console.error("Failed to update order status:", error);
         toast.error("Failed to update order status");

         // Revert optimistic update on error
         setOptimisticOrder(order);
      } finally {
         setIsUpdatingStatus(false);
      }
   };

   const handleContactSupport = () => {
      router.push("/contact");
   };

   const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return "Date not available";
      try {
         const date = new Date(dateString);
         if (isNaN(date.getTime())) return "Invalid date";
         return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
         });
      } catch (e) {
         return "Invalid date";
      }
   };

   // This check is now handled above, so we can remove this duplicate

   // Ensure order.items is always an array
   const safeOrderItems = Array.isArray(order.items) ? order.items : [];

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
               <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-1 sm:p-2 hover:bg-gray-100 h-8 w-8 sm:h-10 sm:w-10"
               >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
               </Button>
               <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent">
                     Order #{order.order_number || order.id}
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                     {order.created_at
                        ? `Placed on ${formatDate(order.created_at)}`
                        : "Order details"}
                  </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:w-auto">
               <Badge
                  className={`${getStatusColor(
                     order.status || "pending",
                  )} text-white font-medium px-3 py-1`}
                  variant="secondary"
               >
                  {getStatusIcon(order.status || "pending")}
                  <span className="ml-2 capitalize">
                     {order.status || "unknown"}
                  </span>
               </Badge>

               <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactSupport}
                  className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 whitespace-nowrap"
               >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Contact Support
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Main Content - Takes full width on mobile, 1 of 2 on lg, 2 of 3 on xl */}
            <div className="lg:col-span-1 xl:col-span-2 order-1 lg:order-1 space-y-6">
               {/* Order Items Card */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="flex items-center text-orange-800 text-lg sm:text-xl">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Order Items
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     {safeOrderItems.length > 0 ? (
                        <div className="space-y-4">
                           {safeOrderItems.map((item) => (
                              <div
                                 key={item.id}
                                 className="flex flex-col lg:flex-row justify-between items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                 <div className="flex items-start gap-3 flex-1 w-full lg:w-auto mb-3 lg:mb-0">
                                    {/* Product Image */}
                                    {(() => {
                                       const imageUrl =
                                          productImages[
                                             item.product_id || ""
                                          ] || item.product_image_url;
                                       const hasImage =
                                          imageUrl &&
                                          imageUrl.trim() &&
                                          imageUrl !== "/placeholder.svg";

                                       return hasImage ? (
                                          <div className="flex-shrink-0">
                                             <Image
                                                src={optimizeImageUrl(
                                                   imageUrl,
                                                   {
                                                      width: 128,
                                                      quality: 80,
                                                   },
                                                )}
                                                alt={
                                                   item.product_name ||
                                                   "Product"
                                                }
                                                width={64}
                                                height={64}
                                                className="w-16 h-16 object-cover rounded-md"
                                                onError={(e) => {
                                                   (
                                                      e.target as HTMLImageElement
                                                   ).style.display = "none";
                                                }}
                                             />
                                          </div>
                                       ) : (
                                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-md flex-shrink-0 flex items-center justify-center">
                                             <Package className="h-6 w-6 text-orange-600" />
                                          </div>
                                       );
                                    })()}
                                    <div className="flex-1 min-w-0">
                                       <h4 className="font-semibold text-sm sm:text-base break-words">
                                          {item.product_name}
                                       </h4>
                                       {/* Only show variant information when it exists */}
                                       {(item.variation_name ||
                                          (item as any).variationName ||
                                          item.product_variation_id ||
                                          (item as any).productVariationId) && (
                                          <div className="mt-1">
                                             {item.variation_name ||
                                             (item as any).variationName ? (
                                                <Badge
                                                   variant="outline"
                                                   className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                                                >
                                                   Variant:{" "}
                                                   {item.variation_name ||
                                                      (item as any)
                                                         .variationName}
                                                </Badge>
                                             ) : item.product_variation_id ||
                                               (item as any)
                                                  .productVariationId ? (
                                                <Badge
                                                   variant="outline"
                                                   className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs font-medium"
                                                >
                                                   Variant ID:{" "}
                                                   {(
                                                      item.product_variation_id ||
                                                      (item as any)
                                                         .productVariationId
                                                   )?.slice(0, 8)}
                                                   ... (name not available)
                                                </Badge>
                                             ) : null}
                                          </div>
                                       )}
                                       {item.product_sku && (
                                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                             SKU: {item.product_sku}
                                          </p>
                                       )}
                                       <div className="flex flex-wrap items-center gap-4 mt-2 text-xs sm:text-sm">
                                          <span className="bg-gray-100 px-2 py-1 rounded">
                                             Qty: {item.quantity}
                                          </span>
                                          <span className="bg-gray-100 px-2 py-1 rounded">
                                             Unit:{" "}
                                             {(
                                                item.price || 0
                                             ).toLocaleString()}{" "}
                                             RWF
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
                                    <p className="font-semibold text-sm sm:text-base">
                                       {(item.total || 0).toLocaleString()} RWF
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                       {/* Hide all actions if order or item is refunded, cancelled, or rejected (allow delivered to show item-level actions within window) */}
                                       {(() => {
                                          try {
                                             const isItemRejected =
                                                item.rejected === true ||
                                                item.refund_status ===
                                                   "rejected";
                                             if (
                                                !orderStateForActions ||
                                                typeof orderStateForActions !==
                                                   "string" ||
                                                orderStateForActions.length ===
                                                   0
                                             ) {
                                                return isItemRejected;
                                             }
                                             const restrictedStatuses = [
                                                "refunded",
                                                "cancelled",
                                                "rejected",
                                             ];
                                             return (
                                                (Array.isArray(
                                                   restrictedStatuses,
                                                ) &&
                                                   restrictedStatuses?.includes(
                                                      orderStateForActions,
                                                   )) ||
                                                isItemRejected
                                             );
                                          } catch (e) {
                                             console.error(
                                                "Error checking restricted statuses:",
                                                e,
                                             );
                                             return (
                                                item.rejected === true ||
                                                item.refund_status ===
                                                   "rejected"
                                             );
                                          }
                                       })() ? (
                                          // Only show status badge - check both rejected boolean and refund_status
                                          item.rejected === true ||
                                          item.refund_status === "rejected" ? (
                                             <Badge
                                                variant="destructive"
                                                className="text-xs"
                                             >
                                                <X className="h-3 w-3 mr-1" />
                                                Rejected
                                             </Badge>
                                          ) : item.refund_status ===
                                            "refunded" ? (
                                             <Badge
                                                variant="default"
                                                className="text-xs bg-green-100 text-green-700"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refunded
                                             </Badge>
                                          ) : item.refund_status ===
                                            "approved" ? (
                                             <Badge
                                                variant="default"
                                                className="text-xs"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refund Approved
                                             </Badge>
                                          ) : item.refund_status ===
                                            "requested" ? (
                                             <Badge
                                                variant="secondary"
                                                className="text-xs"
                                             >
                                                Requested
                                             </Badge>
                                          ) : item.refund_status ===
                                            "cancelled" ? (
                                             <Badge
                                                variant="secondary"
                                                className="text-xs"
                                             >
                                                Cancelled
                                             </Badge>
                                          ) : null
                                       ) : !isAdmin && isOwner ? (
                                          item.rejected === true ||
                                          item.refund_status ? (
                                             <>
                                                <Badge
                                                   variant={(() => {
                                                      // Check rejected boolean first
                                                      if (
                                                         item.rejected === true
                                                      ) {
                                                         return "destructive";
                                                      }
                                                      const status =
                                                         item.refund_status as import("@/types/orders").RefundStatus;
                                                      switch (status) {
                                                         case "approved":
                                                            return "default";
                                                         case "rejected":
                                                            return "destructive";
                                                         case "requested":
                                                         case "cancelled":
                                                            return "secondary";
                                                         case "refunded":
                                                            return "default";
                                                         default:
                                                            return "secondary";
                                                      }
                                                   })()}
                                                   className="text-xs"
                                                >
                                                   {item.rejected === true ? (
                                                      <>
                                                         <X className="h-3 w-3 mr-1" />
                                                         Rejected
                                                      </>
                                                   ) : item.refund_status ===
                                                     "approved" ? (
                                                      <>
                                                         <CheckCircle className="h-3 w-3 mr-1" />
                                                         Refund Approved
                                                      </>
                                                   ) : typeof item.refund_status ===
                                                     "string" ? (
                                                      item.refund_status
                                                         .charAt(0)
                                                         .toUpperCase() +
                                                      item.refund_status.slice(
                                                         1,
                                                      )
                                                   ) : (
                                                      "Unknown"
                                                   )}
                                                </Badge>
                                                {/* Only show Cancel button for requested status */}
                                                {item.refund_status ===
                                                   "requested" && (
                                                   <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={async () => {
                                                         setUnrejectingItemId(
                                                            item.id,
                                                         );
                                                         try {
                                                            await cancelRefund.mutateAsync(
                                                               item.id,
                                                            );
                                                            // update optimistic state: clear refund_status for item
                                                            setOptimisticOrder(
                                                               (prev: any) => {
                                                                  try {
                                                                     return {
                                                                        ...prev,
                                                                        items: (
                                                                           prev.items ||
                                                                           []
                                                                        ).map(
                                                                           (
                                                                              it: any,
                                                                           ) =>
                                                                              it.id ===
                                                                              item.id
                                                                                 ? {
                                                                                      ...it,
                                                                                      refund_status:
                                                                                         null,
                                                                                      refund_reason:
                                                                                         null,
                                                                                   }
                                                                                 : it,
                                                                        ),
                                                                     };
                                                                  } catch (e) {
                                                                     return prev;
                                                                  }
                                                               },
                                                            );
                                                         } catch (e) {
                                                            // handled by mutation
                                                         } finally {
                                                            setUnrejectingItemId(
                                                               null,
                                                            );
                                                         }
                                                      }}
                                                      disabled={
                                                         unrejectingItemId ===
                                                         item.id
                                                      }
                                                      className="text-xs h-7"
                                                   >
                                                      {unrejectingItemId ===
                                                      item.id ? (
                                                         <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                         "Cancel Request"
                                                      )}
                                                   </Button>
                                                )}
                                             </>
                                          ) : (
                                             /* Only show Request Refund button if:
                                                1. Item is NOT rejected AND
                                                2. No existing refund status OR previous refund was cancelled */
                                             !item.rejected &&
                                             (!item.refund_status ||
                                                item.refund_status ===
                                                   "cancelled") && (
                                                <Button
                                                   size="sm"
                                                   variant="outline"
                                                   onClick={() => {
                                                      setRejectingItemId(
                                                         item.id,
                                                      );
                                                      setRejectDialogOpen(true);
                                                   }}
                                                   className={`text-xs h-7 ${
                                                      order.status ===
                                                      "delivered"
                                                         ? "border-green-300 text-green-600 hover:bg-green-50"
                                                         : "border-red-300 text-red-600 hover:bg-red-50"
                                                   }`}
                                                >
                                                   {order.status === "delivered"
                                                      ? "Request Refund"
                                                      : "Reject Item"}
                                                </Button>
                                             )
                                          )
                                       ) : null}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                           <p className="text-muted-foreground">
                              No items found for this order.
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Delivery Information */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Delivery Information
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex items-start space-x-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                           <p className="text-sm break-words">
                              {order.delivery_address}
                           </p>
                           <p className="text-muted-foreground text-sm break-words">
                              {order.delivery_city}
                           </p>
                        </div>
                     </div>
                     {order.delivery_notes && (
                        <div className="pt-2 border-t">
                           <p className="text-sm font-semibold mb-1">
                              Delivery Notes:
                           </p>
                           <p className="text-sm text-muted-foreground break-words">
                              {order.delivery_notes}
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Scheduled Delivery (for orders placed outside working hours) */}
               {order.delivery_time && (
                  <Card className="border-orange-200">
                     <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Scheduled Delivery
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 sm:p-6 space-y-3">
                        <div className="flex items-start space-x-3">
                           <Calendar className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                           <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                 Requested delivery time
                              </p>
                              <p className="text-muted-foreground text-sm">
                                 {(() => {
                                    try {
                                       const dt = new Date(
                                          order.delivery_time as string,
                                       );
                                       return dt.toLocaleString(undefined, {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          timeZone: "Africa/Kigali",
                                          hour12: false,
                                       });
                                    } catch (e) {
                                       return order.delivery_time;
                                    }
                                 })()}
                              </p>
                           </div>
                        </div>

                        {order.schedule_notes && (
                           <div className="pt-2 border-t">
                              <p className="text-sm font-semibold mb-1">
                                 Additional schedule notes
                              </p>
                              <p className="text-sm text-muted-foreground break-words">
                                 {order.schedule_notes}
                              </p>
                           </div>
                        )}
                     </CardContent>
                  </Card>
               )}

               {/* Order Timeline */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="flex items-center text-orange-800 text-lg sm:text-xl">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Order Timeline
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     {buildTimeline().length > 0 ? (
                        <div className="space-y-4">
                           {buildTimeline().map((entry, index) => (
                              <div
                                 key={entry.key}
                                 className="flex items-start space-x-4"
                              >
                                 <div className="flex-shrink-0 relative">
                                    <div
                                       className={`w-8 h-8 ${
                                          entry.color || "bg-gray-400"
                                       } rounded-full flex items-center justify-center shadow-sm`}
                                    >
                                       {entry.icon}
                                    </div>
                                    {index < buildTimeline().length - 1 && (
                                       <div className="absolute top-8 left-4 w-px h-6 bg-gray-300" />
                                    )}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm sm:text-base">
                                       {entry.title}
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                       {entry.date
                                          ? formatDate(entry.date)
                                          : "Date not available"}
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                           <p className="text-muted-foreground">
                              No timeline data available for this order.
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Customer Information */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Customer Information
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex items-center space-x-3">
                        <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm break-words">
                           {(() => {
                              // Check for various name field formats (similar to profile page)
                              // First check order customer fields
                              const firstName =
                                 order.customer_first_name ||
                                 (order as any).customerFirstName ||
                                 "";
                              const lastName =
                                 order.customer_last_name ||
                                 (order as any).customerLastName ||
                                 "";
                              const fullName =
                                 (order as any).customer_name ||
                                 (order as any).customerName ||
                                 (order as any).fullName ||
                                 "";

                              // If we have a full name from order, use it
                              if (fullName) return fullName;

                              // If we have first/last name, combine them
                              if (firstName || lastName) {
                                 const combined =
                                    `${firstName} ${lastName}`.trim();
                                 if (combined) return combined;
                              }

                              // Fallback to user's fullName if order belongs to a user (like profile page)
                              if (order.user_id && user) {
                                 return (
                                    user.fullName || user.email || "Customer"
                                 );
                              }

                              // Final fallback
                              return order.customer_email || "Customer";
                           })()}
                        </span>
                     </div>
                     <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm break-words">
                           {order.customer_email}
                        </span>
                     </div>
                     {order.customer_phone && (
                        <div className="flex items-center space-x-3">
                           <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                           <span className="text-sm break-words">
                              {order.customer_phone}
                           </span>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </div>

            {/* Sidebar - Takes full width on mobile, 1 of 2 on lg, 1 of 3 on xl */}
            <div className="lg:col-span-1 xl:col-span-1 order-2 lg:order-2 space-y-6">
               {/* Order Summary */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Order Summary
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>
                           {(order.subtotal || 0).toLocaleString()} RWF
                        </span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span>Tax/Transport</span>
                        <span>{(order.tax || 0).toLocaleString()} RWF</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between font-bold text-base sm:text-lg">
                        <span>Total</span>
                        <span>{(order.total || 0).toLocaleString()} RWF</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground">
                           Payment Method
                        </span>
                        <span className="font-medium text-orange-600">
                           {getPaymentMethodName(order.payment_method)}
                        </span>
                     </div>
                  </CardContent>
               </Card>

               {/* Assigned Rider Section - Show when rider is assigned */}
               {assignedRider && (
                  <Card className="border-blue-200">
                     <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-25 py-4 sm:py-5">
                        <CardTitle className="text-blue-800 text-lg sm:text-xl flex items-center gap-2">
                           <Truck className="h-5 w-5" />
                           Assigned Rider
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-4">
                           <UserAvatarProfile
                              user={{
                                 fullName:
                                    assignedRider.full_name ||
                                    (assignedRider as any).fullName ||
                                    (assignedRider as any).name ||
                                    "Rider",
                                 subTitle: assignedRider.phone || undefined,
                                 imageUrl:
                                    assignedRider.imageUrl ||
                                    (assignedRider as any).image_url ||
                                    undefined,
                              }}
                              showInfo={false}
                           />
                           <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                 <h4 className="font-semibold text-sm text-gray-900">
                                    {assignedRider.full_name ||
                                       (assignedRider as any).fullName ||
                                       (assignedRider as any).name ||
                                       "Rider"}
                                 </h4>
                                 {assignedRider.phone && (
                                    <div className="flex items-center gap-2 mt-1">
                                       <Phone className="h-3 w-3 text-muted-foreground" />
                                       <span className="text-sm text-muted-foreground">
                                          {assignedRider.phone}
                                       </span>
                                    </div>
                                 )}
                                 {assignedRider.vehicle && (
                                    <div className="flex items-center gap-2 mt-1">
                                       <Truck className="h-3 w-3 text-muted-foreground" />
                                       <span className="text-sm text-muted-foreground">
                                          {assignedRider.vehicle}
                                       </span>
                                    </div>
                                 )}
                                 {assignedRider.location && (
                                    <div className="flex items-center gap-2 mt-1">
                                       <MapPin className="h-3 w-3 text-muted-foreground" />
                                       <span className="text-sm text-muted-foreground">
                                          {assignedRider.location}
                                       </span>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               )}

               {/* Payment Information */}
               <PaymentInfoCard
                  orderId={order.id}
                  orderPaymentMethod={
                     order.payment_method || (order as any).paymentMethod
                  }
               />

               {/* Refund Status Section - Show only if there are refund activities */}
               {(order.refund_status ||
                  order.items?.some((item) => item.refund_status)) && (
                  <Card className="border-orange-200">
                     <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Refund Status
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 sm:p-6 space-y-4">
                        {/* Full Order Refund Status */}
                        {order.refund_status && (
                           <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-25">
                              <div className="flex items-center space-x-3 mb-2">
                                 <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                 <h4 className="font-semibold text-blue-800">
                                    Full Order Refund
                                 </h4>
                              </div>
                              {order.refund_status === "requested" && (
                                 <div className="space-y-2">
                                    <p className="text-sm text-blue-700">
                                       Your refund request is being reviewed by
                                       our team.
                                    </p>
                                    <p className="text-xs text-blue-600">
                                       We typically respond within 24 hours.
                                    </p>
                                 </div>
                              )}
                              {order.refund_status === "approved" && (
                                 <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                       <CheckCircle className="h-4 w-4 text-green-600" />
                                       <p className="text-sm font-semibold text-green-700">
                                          Refund Approved!
                                       </p>
                                    </div>
                                    <p className="text-sm text-green-600">
                                       Your refund has been approved and is
                                       being processed.
                                    </p>
                                    <div className="bg-green-100 border border-green-200 rounded p-3 mt-3">
                                       <p className="text-sm text-green-800 font-medium">
                                          💰 {t("refundApprovedMessage")}
                                       </p>
                                    </div>
                                 </div>
                              )}
                              {order.refund_status === "rejected" && (
                                 <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                       <X className="h-4 w-4 text-red-600" />
                                       <p className="text-sm font-semibold text-red-700">
                                          Refund Request Rejected
                                       </p>
                                    </div>
                                    <p className="text-sm text-red-600">
                                       Your refund request could not be approved
                                       at this time.
                                    </p>
                                    <p className="text-xs text-red-500 mt-1">
                                       If you have questions, please contact our
                                       support team.
                                    </p>
                                 </div>
                              )}
                              {order.refund_reason && (
                                 <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-xs text-blue-600">
                                       <strong>Reason:</strong>{" "}
                                       {order.refund_reason}
                                    </p>
                                 </div>
                              )}
                           </div>
                        )}

                        {/* Individual Item Refund/Rejection Statuses */}
                        {safeOrderItems.some(
                           (item) => item.rejected || item.refund_status,
                        ) && (
                           <div className="space-y-3">
                              <h4 className="font-semibold text-gray-800">
                                 Item Refund/Rejection Status
                              </h4>
                              {safeOrderItems
                                 .filter(
                                    (item) =>
                                       item.rejected || item.refund_status,
                                 )
                                 .map((item) => (
                                    <div
                                       key={item.id}
                                       className="border rounded-lg p-3 bg-gray-50"
                                    >
                                       <div className="flex justify-between items-start mb-2">
                                          <h5 className="font-medium text-sm">
                                             {item.product_name}
                                          </h5>
                                          <Badge
                                             variant={(() => {
                                                // Check rejected boolean first
                                                if (item.rejected === true) {
                                                   return "destructive";
                                                }
                                                switch (item.refund_status) {
                                                   case "approved":
                                                   case "refunded":
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
                                             {item.rejected === true
                                                ? "Rejected"
                                                : item.refund_status ===
                                                    "approved"
                                                  ? "Refund Approved"
                                                  : typeof item.refund_status ===
                                                      "string"
                                                    ? item.refund_status
                                                         .charAt(0)
                                                         .toUpperCase() +
                                                      item.refund_status.slice(
                                                         1,
                                                      )
                                                    : "Unknown"}
                                          </Badge>
                                       </div>

                                       {item.rejected === true &&
                                          item.rejection_reason && (
                                             <div className="bg-red-100 border border-red-200 rounded p-2 mt-2">
                                                <p className="text-xs text-red-800">
                                                   <strong>Reason:</strong>{" "}
                                                   {item.rejection_reason}
                                                </p>
                                             </div>
                                          )}

                                       {item.refund_status === "approved" && (
                                          <div className="bg-green-100 border border-green-200 rounded p-2 mt-2">
                                             <p className="text-xs text-green-800">
                                                💰 Refund for this item will be
                                                processed within 24 hours
                                             </p>
                                          </div>
                                       )}

                                       {item.refund_status === "requested" && (
                                          <p className="text-xs text-blue-600 mt-1">
                                             Your refund request is being
                                             reviewed.
                                          </p>
                                       )}

                                       {item.refund_status === "rejected" && (
                                          <div>
                                             <p className="text-xs text-red-600 mt-1">
                                                {order?.status === "delivered"
                                                   ? "This refund request was not approved."
                                                   : "This item has been rejected."}
                                             </p>
                                          </div>
                                       )}

                                       {item.refund_reason && (
                                          <p className="text-xs text-gray-600 mt-2">
                                             <strong>Reason:</strong>{" "}
                                             {item.refund_reason}
                                          </p>
                                       )}
                                    </div>
                                 ))}
                           </div>
                        )}
                     </CardContent>
                  </Card>
               )}

               {(isAdmin || isOwner) && hasOrderActions && (
                  <Card className="border-orange-200">
                     <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Order Actions
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                           <div className="grid grid-cols-1 gap-2">
                              {isAdmin && order.status === "pending" && (
                                 <Button
                                    size="sm"
                                    onClick={() =>
                                       handleStatusUpdate("processing")
                                    }
                                    disabled={isUpdatingStatus}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                    ) : (
                                       <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    )}
                                    Mark Processing
                                 </Button>
                              )}

                              {isAdmin && order.status === "processing" && (
                                 <Button
                                    size="sm"
                                    onClick={() =>
                                       handleStatusUpdate("shipped")
                                    }
                                    disabled={isUpdatingStatus}
                                    className="bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                    ) : (
                                       <Truck className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    )}
                                    Mark Shipped
                                 </Button>
                              )}

                              {isAdmin && order.status === "shipped" && (
                                 <>
                                    <Button
                                       size="sm"
                                       onClick={() =>
                                          handleStatusUpdate("delivered")
                                       }
                                       disabled={isUpdatingStatus}
                                       className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                    >
                                       {isUpdatingStatus ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                       ) : (
                                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                       )}
                                       Mark Delivered
                                    </Button>
                                    <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             disabled={isUpdatingStatus}
                                             className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9"
                                          >
                                             <Truck className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Transport Only
                                          </Button>
                                       </AlertDialogTrigger>
                                       <AlertDialogContent className="max-w-md">
                                          <AlertDialogHeader>
                                             <AlertDialogTitle>
                                                Confirm Transport Only
                                             </AlertDialogTitle>
                                             <AlertDialogDescription>
                                                This will cancel the order but
                                                keep the transport fee.
                                                <br />
                                                <br />
                                                <strong>What happens:</strong>
                                                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                                   <li>
                                                      Order status → CANCELLED
                                                   </li>
                                                   <li>
                                                      Product total → Zeroed
                                                   </li>
                                                   <li>
                                                      Transport fee → Kept and
                                                      added to rider earnings
                                                   </li>
                                                   <li>
                                                      Stock → NOT restored
                                                      (products not considered
                                                      sold)
                                                   </li>
                                                </ul>
                                                <br />
                                                This action is final and cannot
                                                be undone.
                                             </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                             <AlertDialogCancel>
                                                Cancel
                                             </AlertDialogCancel>
                                             <AlertDialogAction
                                                onClick={async () => {
                                                   if (isUpdatingStatus) return;
                                                   setIsUpdatingStatus(true);
                                                   try {
                                                      await markTransportOnly.mutateAsync(
                                                         order.id,
                                                      );
                                                      router.refresh();
                                                   } catch (err) {
                                                      console.error(err);
                                                   } finally {
                                                      setIsUpdatingStatus(
                                                         false,
                                                      );
                                                   }
                                                }}
                                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                             >
                                                Confirm Transport Only
                                             </AlertDialogAction>
                                          </AlertDialogFooter>
                                       </AlertDialogContent>
                                    </AlertDialog>
                                 </>
                              )}

                              {(() => {
                                 try {
                                    if (
                                       !order ||
                                       !order.status ||
                                       typeof order.status !== "string"
                                    )
                                       return false;
                                    const cancellableStatuses = [
                                       "pending",
                                       "processing",
                                    ];
                                    return (
                                       Array.isArray(cancellableStatuses) &&
                                       cancellableStatuses?.includes(
                                          order.status,
                                       )
                                    );
                                 } catch (e) {
                                    console.error(
                                       "Error checking cancellable statuses:",
                                       e,
                                    );
                                    return false;
                                 }
                              })() && (
                                 <AlertDialog
                                    open={showCancelConfirm}
                                    onOpenChange={setShowCancelConfirm}
                                 >
                                    <AlertDialogTrigger asChild>
                                       <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-red-300 text-red-600 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9"
                                          disabled={isUpdatingStatus}
                                       >
                                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                          Cancel Order
                                       </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="max-w-md">
                                       <AlertDialogHeader>
                                          <AlertDialogTitle>
                                             Confirm Cancel Order
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                             Cancelling this order will set its
                                             status to &quot;cancelled&quot;.
                                             This action cannot be undone. Are
                                             you sure you want to proceed?
                                          </AlertDialogDescription>
                                       </AlertDialogHeader>

                                       <div className="mt-2 px-1">
                                          <label className="flex items-center gap-2 text-sm">
                                             <Checkbox
                                                checked={redirectAfterCancel}
                                                onCheckedChange={(v) =>
                                                   setRedirectAfterCancel(!!v)
                                                }
                                             />
                                             Redirect to home after cancelling
                                          </label>
                                       </div>

                                       <AlertDialogFooter>
                                          <AlertDialogCancel>
                                             Close
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                             onClick={async () => {
                                                setShowCancelConfirm(false);
                                                if (isUpdatingStatus) return;
                                                setIsUpdatingStatus(true);
                                                try {
                                                   await cancelOrder.mutateAsync(
                                                      order.id,
                                                   );
                                                   if (redirectAfterCancel) {
                                                      router.push("/");
                                                   }
                                                } catch (err) {
                                                   console.error(err);
                                                   // Error toast is handled by the hook
                                                } finally {
                                                   setIsUpdatingStatus(false);
                                                }
                                             }}
                                             className="bg-red-600 hover:bg-red-700 text-white"
                                          >
                                             Confirm Cancel
                                          </AlertDialogAction>
                                       </AlertDialogFooter>
                                    </AlertDialogContent>
                                 </AlertDialog>
                              )}
                           </div>

                           {order.status === "delivered" &&
                              (() => {
                                 // Support both snake_case and camelCase delivered timestamps
                                 const deliveredTimestamp =
                                    order.delivered_at ||
                                    (order as any).deliveredAt ||
                                    null;
                                 let within24h = false;
                                 if (deliveredTimestamp) {
                                    const deliveredAt = new Date(
                                       deliveredTimestamp,
                                    ).getTime();
                                    const now = Date.now();
                                    within24h =
                                       now - deliveredAt <= 24 * 60 * 60 * 1000;
                                 } else {
                                    // If delivered timestamp is missing but status is "delivered",
                                    // show actions conservatively.
                                    within24h = true;
                                 }

                                 // Determine if any item would allow an item-level refund (mirrors item logic)
                                 const anyRefundableItem = (
                                    order.items || []
                                 ).some(
                                    (it: any) =>
                                       !it.refund_status ||
                                       it.refund_status === "cancelled",
                                 );

                                 // Only allow full-order refund button when:
                                 // - order is delivered
                                 // - within 24h (or delivered_at missing)
                                 // - at least one item is refundable
                                 // - and there is no existing non-cancelled order refund
                                 const canRequestFullRefund =
                                    order.status === "delivered" &&
                                    within24h &&
                                    anyRefundableItem &&
                                    (!order.refund_status ||
                                       order.refund_status === "cancelled");

                                 if (canRequestFullRefund) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() =>
                                                setFullRefundDialogOpen(true)
                                             }
                                             className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 w-full"
                                          >
                                             <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Request Full Refund
                                          </Button>
                                       </div>
                                    );
                                 }

                                 // Show approved message if refund is approved
                                 if (
                                    order.refund_status === "approved" &&
                                    isOwner
                                 ) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                             <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                             <span className="text-green-700 font-medium text-sm">
                                                Refund Approved -{" "}
                                                {t("refundApprovedMessage")}
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 }

                                 // Show rejected message if refund is rejected
                                 if (
                                    order.refund_status === "rejected" &&
                                    isOwner
                                 ) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <div className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-lg">
                                             <X className="h-4 w-4 text-red-600 mr-2" />
                                             <span className="text-red-700 font-medium text-sm">
                                                Refund Request Rejected
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 }

                                 // Show cancel button only if refund is currently requested
                                 if (
                                    order.refund_status === "requested" &&
                                    isOwner
                                 ) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={async () => {
                                                try {
                                                   await cancelOrderRefund.mutateAsync(
                                                      order.id,
                                                   );
                                                   toast.success(
                                                      "Refund request cancelled",
                                                   );
                                                } catch (e) {
                                                   // handled by mutation
                                                }
                                             }}
                                             className="border-yellow-300 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-9 w-full"
                                          >
                                             <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Cancel Refund Request
                                          </Button>
                                       </div>
                                    );
                                 }

                                 return null;
                              })()}
                        </div>
                     </CardContent>
                  </Card>
               )}
            </div>
         </div>

         {/* Full Order Refund Dialog */}
         <Dialog
            open={fullRefundDialogOpen}
            onOpenChange={(v: boolean) => setFullRefundDialogOpen(v)}
         >
            <DialogContent className="max-w-md">
               <DialogHeader>
                  <DialogTitle>Request Full Order Refund</DialogTitle>
                  <DialogDescription>
                     Provide a reason for requesting a refund for this entire
                     order. The admin will review your request.
                  </DialogDescription>
               </DialogHeader>

               <div className="mt-2">
                  <Textarea
                     value={fullRefundReason}
                     onChange={(e) => setFullRefundReason(e.target.value)}
                     placeholder="Enter refund reason"
                     className="w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  />
               </div>

               <DialogFooter>
                  <div className="flex justify-end space-x-2 w-full">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setFullRefundDialogOpen(false);
                           setFullRefundReason("");
                        }}
                        disabled={isRequestingFullRefund}
                        className="flex-1"
                     >
                        Cancel
                     </Button>
                     <Button
                        onClick={async () => {
                           if (!fullRefundReason.trim()) return;
                           setIsRequestingFullRefund(true);
                           try {
                              // Optimistic update: mark order refund requested immediately
                              setOptimisticOrder((prev: any) => ({
                                 ...prev,
                                 refund_status: "requested",
                                 refund_reason: fullRefundReason,
                              }));
                              await requestOrderRefund.mutateAsync({
                                 orderId: order.id,
                                 reason: fullRefundReason,
                              });
                              toast.success("Full order refund requested");
                              setFullRefundDialogOpen(false);
                              setFullRefundReason("");
                           } catch (err) {
                              // revert optimistic update on error
                              setOptimisticOrder((prev: any) => prev);
                              // mutation handles toast on error
                           } finally {
                              setIsRequestingFullRefund(false);
                           }
                        }}
                        disabled={
                           isRequestingFullRefund || !fullRefundReason.trim()
                        }
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                     >
                        {isRequestingFullRefund ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isRequestingFullRefund
                           ? "Requesting..."
                           : "Request Refund"}
                     </Button>
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog
            open={rejectDialogOpen}
            onOpenChange={(v: boolean) => setRejectDialogOpen(v)}
         >
            <DialogContent className="max-w-md">
               <DialogHeader>
                  <DialogTitle>
                     {order?.status === "delivered"
                        ? "Request Refund"
                        : "Reject Item"}
                  </DialogTitle>
                  <DialogDescription>
                     {order?.status === "delivered"
                        ? "Provide a reason for requesting a refund for this item. The admin will review your request."
                        : "You are about to reject this item. This action is final and will immediately mark the item as rejected."}
                  </DialogDescription>
               </DialogHeader>

               <div className="mt-2">
                  <Textarea
                     value={rejectReason}
                     onChange={(e) => setRejectReason(e.target.value)}
                     placeholder={
                        order?.status === "delivered"
                           ? "Enter refund reason"
                           : "Enter rejection reason"
                     }
                     className="w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  />
               </div>

               <DialogFooter>
                  <div className="flex justify-end space-x-2 w-full">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setRejectDialogOpen(false);
                           setRejectReason("");
                           setRejectingItemId(null);
                        }}
                        disabled={isRejecting}
                        className="flex-1"
                     >
                        Cancel
                     </Button>
                     <Button
                        onClick={async () => {
                           if (!rejectingItemId) return;
                           setIsRejecting(true);

                           try {
                              // Check if order is delivered to determine which endpoint to call
                              const isDelivered =
                                 !!order?.delivered_at ||
                                 order?.status === "delivered";

                              console.log("[REJECT/REFUND] Order status:", {
                                 status: order?.status,
                                 delivered_at: order?.delivered_at,
                                 isDelivered,
                                 itemId: rejectingItemId,
                              });

                              const res = await requestRefund.mutateAsync({
                                 orderItemId: rejectingItemId,
                                 reason: rejectReason,
                                 isDelivered, // Pass delivery status to hook
                              });

                              // Show appropriate success message based on order status
                              if (isDelivered) {
                                 toast.success("Refund requested successfully");
                              } else {
                                 toast.success("Item rejected successfully");
                              }

                              setRejectDialogOpen(false);
                              setRejectReason("");
                              setRejectingItemId(null);
                           } catch (e: any) {
                              // Show error message
                              const errorMsg =
                                 e?.message || "Failed to process request";
                              toast.error(errorMsg);

                              console.error("Refund/reject error:", e);
                           } finally {
                              setIsRejecting(false);
                           }
                        }}
                        disabled={isRejecting || !rejectReason}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                     >
                        {isRejecting ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isRejecting
                           ? "Requesting..."
                           : order?.status === "delivered"
                             ? "Request Refund"
                             : "Reject Item"}
                     </Button>
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
};

export default OrderClientPage;
