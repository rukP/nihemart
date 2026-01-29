"use client";

import { format, isValid } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Order, OrderItem, Rider } from "@/types/orders";
import { Button } from "@/components/ui/button";
import {
   Loader2,
   Copy,
   Check,
   Package,
   User,
   BadgeCheck,
   ShoppingCart,
   ReceiptText,
   Calendar as CalendarIcon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { UserAvatarProfile } from "../user-avatar-profile";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn, optimizeImageUrl } from "@/lib/utils";
import Image from "next/image";
import { fetchStoreProductById } from "@/lib/api/store";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { unauthorizedAPI, authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";
import { addFeeAdjustment } from "@/lib/api/riders";
import { toast } from "sonner";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";

interface OrderDetailsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   order: Order;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
   const [copied, setCopied] = useState(false);

   const handleCopy = async () => {
      try {
         await navigator.clipboard.writeText(text);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      } catch (err) {
         console.error("Failed to copy:", err);
      }
   };

   return (
      <Button
         variant="ghost"
         size="sm"
         onClick={handleCopy}
         className="h-7 px-2"
         title={label || "Copy to clipboard"}
      >
         {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
         ) : (
            <Copy className="h-3.5 w-3.5" />
         )}
      </Button>
   );
}

export function OrderDetailsDialog({
   open,
   onOpenChange,
   order,
}: OrderDetailsDialogProps) {
   // Normalize order object to handle both camelCase and snake_case, and ensure required fields
   const normalizedOrder = useMemo(() => {
      if (!order) return null;

      // Helper to validate and normalize date strings
      const normalizeDate = (dateValue: any): string | null => {
         if (!dateValue) return null;
         const dateStr = String(dateValue);
         const date = new Date(dateStr);
         return isValid(date) ? dateStr : null;
      };

      // Get date values from both formats
      const createdAtRaw = order.created_at || (order as any).createdAt;
      const updatedAtRaw = order.updated_at || (order as any).updatedAt;

      // Normalize dates - use current date as fallback only if we have no date at all
      const createdAt =
         normalizeDate(createdAtRaw) ||
         (createdAtRaw ? String(createdAtRaw) : new Date().toISOString());
      const updatedAt =
         normalizeDate(updatedAtRaw) ||
         (updatedAtRaw ? String(updatedAtRaw) : new Date().toISOString());

      // Normalize items - ensure it's always an array
      const items = Array.isArray(order.items)
         ? order.items
         : (order as any).orderItems || [];

      return {
         ...order,
         // Normalize date fields - handle both formats
         created_at: createdAt,
         updated_at: updatedAt,
         // Ensure other required fields have defaults
         order_number:
            order.order_number ||
            (order as any).orderNumber ||
            order.id ||
            "N/A",
         customer_first_name:
            order.customer_first_name || (order as any).customerFirstName || "",
         customer_last_name:
            order.customer_last_name || (order as any).customerLastName || "",
         customer_email:
            order.customer_email || (order as any).customerEmail || "",
         // Normalize customer phone across possible naming conventions
         customer_phone:
            order.customer_phone || (order as any).customerPhone || "",
         delivery_address:
            order.delivery_address || (order as any).deliveryAddress || "",
         delivery_city:
            order.delivery_city || (order as any).deliveryCity || "",
         items: items,
         status: order.status || "pending",
         subtotal: order.subtotal ?? 0,
         tax: order.tax ?? 0,
         total: order.total ?? 0,
         // FIXED: Normalize payment method field (handle both camelCase and snake_case)
         payment_method:
            order.payment_method ||
            (order as any).paymentMethod ||
            "cash_on_delivery",
      };
   }, [order]);

   if (!normalizedOrder) {
      return null;
   }

   const { useCancelRefundRequestItem, useRequestRefundItem } = useOrders();
   const cancelRefund = useCancelRefundRequestItem();
   const requestRefund = useRequestRefundItem();
   const { useRequestRefundOrder, useCancelRefundRequestOrder } = useOrders();
   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();
   const { user, hasRole } = useAuth();
   const isOwner = user?.id === normalizedOrder.user_id;
   const isAdmin = typeof hasRole === "function" ? hasRole("admin") : false;
   const statusLower = (normalizedOrder.status || "").toLowerCase();
   const orderRefundStatus = (
      normalizedOrder.refund_status || ""
   ).toLowerCase();
   const nonRefundableOrder =
      statusLower === "cancelled" ||
      statusLower === "refunded" ||
      orderRefundStatus === "approved" ||
      orderRefundStatus === "refunded";
   const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
   const [manageDialogOpen, setManageDialogOpen] = useState(false);
   const [manageItem, setManageItem] = useState<OrderItem | null>(null);
   // FIXED: Handle Google auth users who may not have first/last names split
   const customerName = (() => {
      const firstName = normalizedOrder.customer_first_name || "";
      const lastName = normalizedOrder.customer_last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();

      // If we have a valid name, use it
      if (fullName && fullName !== "") {
         return fullName;
      }

      // Fall back to email username (before @)
      const email = normalizedOrder.customer_email || "";
      if (email) {
         const username = email.split("@")[0];
         return username || "Customer";
      }

      return "Customer";
   })();
   const [showOrderRefundDialog, setShowOrderRefundDialog] = useState(false);
   const [orderRefundReason, setOrderRefundReason] = useState("");
   const [orderLoading, setOrderLoading] = useState(false);

   // FIXED: Add Fee button state (admin only, when rider is assigned)
   const [addFeeOpen, setAddFeeOpen] = useState(false);
   const [feeAmount, setFeeAmount] = useState("");
   const [feeReason, setFeeReason] = useState("");
   const [feeTransactionDate, setFeeTransactionDate] = useState<Date>(
      new Date(),
   );
   const [feeCalendarOpen, setFeeCalendarOpen] = useState(false);
   const [isSubmittingFee, setIsSubmittingFee] = useState(false);

   // Helper function to submit fee adjustment
   const submitFeeAdjustment = async (riderId: string) => {
      setIsSubmittingFee(true);
      try {
         await addFeeAdjustment(riderId, {
            amount: parseFloat(feeAmount),
            reason: `${feeReason.trim()} (Order: ${normalizedOrder.order_number})`,
            transactionDate: feeTransactionDate.toISOString(),
         });
         toast.success("Fee adjustment added successfully");
         setAddFeeOpen(false);
         setFeeAmount("");
         setFeeReason("");
         setFeeTransactionDate(new Date());
      } catch (error: any) {
         toast.error(error?.message || "Failed to add fee adjustment");
      } finally {
         setIsSubmittingFee(false);
      }
   };

   // Rider fetching - try multiple sources
   const [rider, setRider] = useState<Rider | null | undefined>(null);
   const [riderLoading, setRiderLoading] = useState(false);

   // Try to get rider from order object first (from assignments or direct)
   useEffect(() => {
      if (!open || !normalizedOrder?.id) return;

      const extractRiderFromOrder = (order: any): Rider | null => {
         // Try assignments array first
         if (Array.isArray(order.assignments) && order.assignments.length > 0) {
            // Get the latest assignment (should be sorted by assignedAt desc)
            const latestAssignment = order.assignments[0];
            if (latestAssignment?.rider) {
               return latestAssignment.rider;
            }
         }

         // Try direct rider property
         if (order.rider) {
            return order.rider;
         }

         // Try nested in assignment object
         if (order.assignment?.rider) {
            return order.assignment.rider;
         }

         return null;
      };

      // First, try to extract from the order object itself
      const riderFromOrder = extractRiderFromOrder(normalizedOrder);
      if (riderFromOrder) {
         setRider(riderFromOrder);
         return;
      }

      // If not found, fetch from batch assignments API
      const fetchRiderFromBatch = async () => {
         setRiderLoading(true);
         try {
            const response = await handleApiRequest(() =>
               unauthorizedAPI.get(
                  `/orders/assignments/batch?ids=${normalizedOrder.id}`,
               ),
            );

            if (
               response?.assignments &&
               response.assignments[normalizedOrder.id]
            ) {
               const assignmentData = response.assignments[normalizedOrder.id];
               if (assignmentData?.rider) {
                  setRider(assignmentData.rider);
                  setRiderLoading(false);
                  return;
               }
            }

            // If still not found, try fetching order again with full details
            const fullOrder = await handleApiRequest(() =>
               unauthorizedAPI.get(`/orders/${normalizedOrder.id}`),
            );

            const riderFromFullOrder = extractRiderFromOrder(fullOrder);
            if (riderFromFullOrder) {
               setRider(riderFromFullOrder);
            } else {
               setRider(null);
            }
         } catch (error) {
            console.error("Failed to fetch rider:", error);
            setRider(null);
         } finally {
            setRiderLoading(false);
         }
      };

      fetchRiderFromBatch();
   }, [open, normalizedOrder?.id]);

   const [productImages, setProductImages] = useState<
      Record<string, string | null>
   >({});
   const [productVariationNames, setProductVariationNames] = useState<
      Record<string, string>
   >({});

   // FIXED: Helper to render variation information for an order item - only show when variant exists
   const renderVariationLabel = (item: OrderItem) => {
      // Prefer explicit variation_name saved on the order item (handle both snake_case and camelCase)
      const explicit = item.variation_name || (item as any).variationName;
      const variationId =
         item.product_variation_id || (item as any).productVariationId;

      if (
         explicit &&
         explicit !== null &&
         explicit !== undefined &&
         String(explicit).trim() !== ""
      ) {
         // Sometimes variation_name may be a JSON string of attributes
         try {
            const parsed = JSON.parse(explicit);
            if (
               parsed &&
               typeof parsed === "object" &&
               Object.keys(parsed).length > 0
            ) {
               const pairs = Object.entries(parsed)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
               return (
                  <div className="mt-1">
                     <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                     >
                        Variant: {pairs}
                     </Badge>
                  </div>
               );
            }
         } catch (e) {
            // not JSON, fall back to plain string
         }
         return (
            <div className="mt-1">
               <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
               >
                  Variant: {explicit}
               </Badge>
            </div>
         );
      }

      // Fall back to variation lookup fetched from product details
      if (variationId) {
         const lookup = productVariationNames[variationId];
         if (lookup) {
            return (
               <div className="mt-1">
                  <Badge
                     variant="outline"
                     className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                  >
                     Variant: {lookup}
                  </Badge>
               </div>
            );
         }
         // If we have a variation ID but no name, show the ID
         return (
            <div className="mt-1">
               <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs font-medium"
               >
                  Variant ID: {variationId.slice(0, 8)}... (name not found)
               </Badge>
            </div>
         );
      }

      // Don't display anything if there's no variant information
      return null;
   };

   useEffect(() => {
      let mounted = true;
      // Fetch product images when dialog opens
      const load = async () => {
         try {
            const items = normalizedOrder?.items || [];
            if (!items || items.length === 0) {
               if (mounted) {
                  setProductImages({});
                  setProductVariationNames({});
               }
               return;
            }

            const ids = Array.from(
               new Set(
                  items
                     .map(
                        (it: OrderItem) =>
                           it?.product_id || (it as any)?.productId,
                     )
                     .filter(Boolean) as string[],
               ),
            );
            if (ids.length === 0) {
               if (mounted) {
                  setProductImages({});
                  setProductVariationNames({});
               }
               return;
            }

            const map: Record<string, string | null> = {};
            const variationMap: Record<string, string> = {};

            await Promise.all(
               ids.map(async (id) => {
                  try {
                     const result = await fetchStoreProductById(id);
                     if (!result) {
                        map[id] = null;
                        return;
                     }

                     // fetchStoreProductById from store.ts returns StoreProduct directly
                     // But it might also return { product: {...}, images: [...], variations: [...] }
                     const product = (result as any)?.product || result;

                     // Try multiple ways to get the image URL
                     let imageUrl: string | null = null;

                     // Check product main image
                     imageUrl =
                        product?.main_image_url ||
                        product?.mainImageUrl ||
                        null;

                     // If no main image, try images array
                     if (
                        !imageUrl &&
                        Array.isArray((result as any)?.images) &&
                        (result as any).images.length > 0
                     ) {
                        const firstImage = (result as any).images[0];
                        imageUrl =
                           typeof firstImage === "string"
                              ? firstImage
                              : firstImage?.url || firstImage?.imageUrl || null;
                     }

                     // If still no image, try product.images array
                     if (
                        !imageUrl &&
                        Array.isArray(product?.images) &&
                        product.images.length > 0
                     ) {
                        const firstImage = product.images[0];
                        imageUrl =
                           typeof firstImage === "string"
                              ? firstImage
                              : firstImage?.url || firstImage?.imageUrl || null;
                     }

                     map[id] =
                        imageUrl &&
                        imageUrl.trim() &&
                        imageUrl !== "/placeholder.svg"
                           ? imageUrl
                           : null;

                     // collect variations mapping for this product
                     const variations =
                        (result as any)?.variations ||
                        product?.variations ||
                        [];
                     if (Array.isArray(variations)) {
                        for (const v of variations) {
                           if (v && v.id && (v.name || v.attributes)) {
                              const variationName =
                                 v.name ||
                                 (v.attributes &&
                                 typeof v.attributes === "object"
                                    ? Object.entries(v.attributes)
                                         .map(([k, val]) => `${k}: ${val}`)
                                         .join(", ")
                                    : null);
                              if (variationName) {
                                 variationMap[v.id] = variationName;
                              }
                           }
                        }
                     }
                  } catch (e) {
                     console.error(`Failed to fetch product ${id}:`, e);
                     map[id] = null;
                  }
               }),
            );

            if (mounted) {
               setProductImages(map);
               setProductVariationNames((prev) => ({
                  ...prev,
                  ...variationMap,
               }));
            }
         } catch (e) {
            console.error("Failed to load product images:", e);
            if (mounted) {
               setProductImages({});
               setProductVariationNames({});
            }
         }
      };

      if (open) {
         load();
      }

      return () => {
         mounted = false;
      };
   }, [normalizedOrder?.items, open]);

   const getPaymentMethodName = (method?: string | null) => {
      if (!method) return "Not specified";
      const methodMap: Record<string, string> = {
         cash_on_delivery: "Cash on Delivery",
         card: "Card",
         mobile_money: "Mobile Money",
         bank_transfer: "Bank Transfer",
      };
      return methodMap[method] || method;
   };

   return (
      <>
         <Dialog
            open={open}
            onOpenChange={onOpenChange}
         >
            <DialogContent className="max-w-3xl px-1 sm:px-4">
               <DialogHeader>
                  <DialogTitle>Order Details</DialogTitle>
               </DialogHeader>
               <ScrollArea className="max-h-[80vh] bg-gray-50 rounded-lg px-1 sm:px-0">
                  <div className="space-y-6 p-2 sm:p-4">
                     {/* Order Header */}
                     <Card className="p-4 mb-2 border-0 bg-gradient-to-br from-white to-gray-50 shadow-none">
                        <div className="flex justify-between items-start gap-4">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <ReceiptText className="h-5 w-5 text-blue-500" />
                                 <h3 className="text-lg font-semibold">
                                    Order #{normalizedOrder.order_number}
                                 </h3>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                 {(() => {
                                    const createdAt =
                                       normalizedOrder.created_at;
                                    if (!createdAt) return "Date not available";
                                    const date = new Date(createdAt);
                                    return isValid(date)
                                       ? format(date, "MMMM d, yyyy 'at' HH:mm")
                                       : String(createdAt);
                                 })()}
                              </p>
                              {normalizedOrder.is_labeled &&
                                 normalizedOrder.label_number &&
                                 normalizedOrder.location_code && (
                                    <p className="text-xs font-semibold text-orange-600 mt-2">
                                       L-{normalizedOrder.label_number} |{" "}
                                       {normalizedOrder.location_code}
                                       {normalizedOrder.order_count &&
                                          ` | #${normalizedOrder.order_count}`}
                                    </p>
                                 )}
                              {/* Rider section moved below — kept header concise */}
                           </div>
                           <Badge
                              className={cn(
                                 "capitalize font-semibold text-base px-3 py-1 rounded-lg",
                                 {
                                    "bg-green-500/10 text-green-500":
                                       normalizedOrder.status === "delivered",
                                    "bg-yellow-500/10 text-yellow-500":
                                       normalizedOrder.status &&
                                       [
                                          "pending",
                                          "processing",
                                          "shipped",
                                       ].includes(normalizedOrder.status),
                                    "bg-red-500/10 text-red-500":
                                       normalizedOrder.status === "cancelled",
                                 },
                              )}
                           >
                              {normalizedOrder.status || "pending"}
                           </Badge>
                        </div>
                     </Card>

                     {/* Customer Info */}
                     <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <User className="h-5 w-5 text-purple-500" />
                           <h4 className="font-semibold text-base">Customer</h4>
                        </div>
                        <div className="flex items-start gap-4">
                           <UserAvatarProfile
                              user={{
                                 fullName: customerName,
                                 subTitle: normalizedOrder.customer_email,
                              }}
                              showInfo={false}
                           />
                           <div className="flex-1">
                              <h5 className="font-medium">{customerName}</h5>
                              <div className="flex items-center gap-2">
                                 <p className="text-sm text-muted-foreground">
                                    {normalizedOrder.customer_email}
                                 </p>
                                 <CopyButton
                                    text={normalizedOrder.customer_email}
                                    label="Copy email"
                                 />
                              </div>
                              {normalizedOrder.customer_phone && (
                                 <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                       {normalizedOrder.customer_phone}
                                    </p>
                                    <CopyButton
                                       text={normalizedOrder.customer_phone}
                                       label="Copy phone number"
                                    />
                                 </div>
                              )}
                           </div>
                        </div>
                        <div className="space-y-2 border-t pt-2">
                           <h4 className="font-medium">Delivery Address</h4>
                           <p className="text-sm text-muted-foreground">
                              {normalizedOrder.delivery_address}
                           </p>
                           <p className="text-sm text-muted-foreground">
                              {normalizedOrder.delivery_city}
                           </p>
                           {normalizedOrder.delivery_notes && (
                              <p className="text-sm text-muted-foreground italic">
                                 Note: {normalizedOrder.delivery_notes}
                              </p>
                           )}
                           {normalizedOrder.schedule_notes && (
                              <p className="text-sm text-muted-foreground italic mt-1">
                                 Schedule notes:{" "}
                                 {normalizedOrder.schedule_notes}
                              </p>
                           )}
                           {normalizedOrder.delivery_time && (
                              <p className="text-sm text-muted-foreground mt-2">
                                 <strong>Requested delivery time: </strong>
                                 {(() => {
                                    const deliveryTime =
                                       normalizedOrder.delivery_time;
                                    if (!deliveryTime) return null;
                                    const date = new Date(deliveryTime);
                                    return isValid(date)
                                       ? format(date, "MMMM d, yyyy 'at' HH:mm")
                                       : String(deliveryTime);
                                 })()}
                              </p>
                           )}
                        </div>
                     </Card>

                     {/* Order Items */}
                     <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <ShoppingCart className="h-5 w-5 text-orange-500" />
                           <h4 className="font-semibold text-base">
                              Order Items
                           </h4>
                        </div>
                        <div className="space-y-4">
                           {normalizedOrder.items &&
                           Array.isArray(normalizedOrder.items) &&
                           normalizedOrder.items.length > 0 ? (
                              normalizedOrder.items.map((item, index) => {
                                 const productId =
                                    item.product_id ||
                                    (item as any).productId ||
                                    "";
                                 const imageUrl =
                                    productImages[productId] ||
                                    item.product_image_url ||
                                    (item as any).productImageUrl ||
                                    null;
                                 const hasImage =
                                    imageUrl &&
                                    typeof imageUrl === "string" &&
                                    imageUrl.trim() &&
                                    imageUrl !== "/placeholder.svg";

                                 // FIXED: Check for rejected items - handle both rejected boolean and refund_status
                                 const isRejectedBoolean =
                                    item.rejected ||
                                    (item as any).rejected === true;
                                 const refundStatus =
                                    item.refund_status ||
                                    (item as any).refundStatus;
                                 const isRejected =
                                    isRejectedBoolean ||
                                    refundStatus === "rejected";
                                 const isApprovedRefund =
                                    refundStatus === "approved";
                                 const isRequestedRefund =
                                    refundStatus === "requested";

                                 return (
                                    <div
                                       key={item?.id || `item-${index}`}
                                       className={cn(
                                          "flex gap-4 rounded-lg hover:bg-gray-100 transition-colors p-2",
                                          index !== 0 && "border-t pt-4",
                                          // FIXED: Visually distinguish rejected items with background color
                                          isRejected &&
                                             "bg-red-50 border-red-200",
                                          isApprovedRefund &&
                                             "bg-yellow-50 border-yellow-200",
                                       )}
                                    >
                                       {/* Product Image */}
                                       {hasImage && imageUrl ? (
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
                                                   (item as any).productName ||
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
                                       )}
                                       <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                             <p
                                                className={cn(
                                                   "font-medium",
                                                   isRejected && "text-red-700",
                                                   isApprovedRefund &&
                                                      "text-yellow-700",
                                                )}
                                             >
                                                {item.product_name ||
                                                   (item as any).productName ||
                                                   "Unknown Product"}
                                             </p>
                                             {/* FIXED: Always show refund/rejection status if present - clearly visible */}
                                             {refundStatus &&
                                             typeof refundStatus ===
                                                "string" ? (
                                                <>
                                                   <Badge
                                                      variant={
                                                         isApprovedRefund
                                                            ? "default"
                                                            : isRejected
                                                              ? "destructive"
                                                              : "secondary"
                                                      }
                                                      className="font-semibold"
                                                   >
                                                      {isRejected
                                                         ? "❌ Rejected"
                                                         : isApprovedRefund
                                                           ? "✅ Refunded"
                                                           : "⏳ Refund Requested"}
                                                   </Badge>
                                                   {isRequestedRefund &&
                                                      (isOwner || isAdmin) && (
                                                         <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={async () => {
                                                               setLoadingItemId(
                                                                  item.id,
                                                               );
                                                               try {
                                                                  await cancelRefund.mutateAsync(
                                                                     item.id,
                                                                  );
                                                               } catch (e) {
                                                                  console.error(
                                                                     e,
                                                                  );
                                                               } finally {
                                                                  setLoadingItemId(
                                                                     null,
                                                                  );
                                                               }
                                                            }}
                                                            disabled={
                                                               loadingItemId ===
                                                               item.id
                                                            }
                                                         >
                                                            {loadingItemId ===
                                                            item.id ? (
                                                               <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                               "Cancel refund request"
                                                            )}
                                                         </Button>
                                                      )}
                                                </>
                                             ) : null}
                                             {/* Show 'Rejected' badge for rejected items */}
                                             {isRejected && (
                                                <Badge
                                                   variant="destructive"
                                                   className="font-semibold"
                                                >
                                                   ❌ Rejected
                                                </Badge>
                                             )}
                                             {/* Only show Initiate refund button if item is NOT rejected */}
                                             {isAdmin &&
                                                !refundStatus &&
                                                !isRejected &&
                                                normalizedOrder.status ===
                                                   "delivered" && (
                                                   <>
                                                      <Button
                                                         size="sm"
                                                         variant="ghost"
                                                         onClick={() => {
                                                            setManageItem(item);
                                                            setManageDialogOpen(
                                                               true,
                                                            );
                                                         }}
                                                      >
                                                         {item.refund_requested ||
                                                         (item as any)
                                                            .refundRequested
                                                            ? "Manage refund"
                                                            : "Initiate refund"}
                                                      </Button>
                                                   </>
                                                )}
                                          </div>
                                          {/* Prefer explicit variation_name saved on the order item, but
                                     fall back to a product variation lookup (fetched above)
                                     when available. This ensures admins see which variation
                                     the user selected even if the order row did not include
                                     the variation_name field. */}
                                          {renderVariationLabel(item)}
                                          <div className="flex justify-between items-center mt-2">
                                             <p className="text-sm text-muted-foreground">
                                                Quantity: {item.quantity || 0} ×{" "}
                                                {Number(
                                                   item.price || 0,
                                                ).toLocaleString()}{" "}
                                                RWF
                                             </p>
                                             <p className="font-medium">
                                                {Number(
                                                   item.total || 0,
                                                ).toLocaleString()}{" "}
                                                RWF
                                             </p>
                                          </div>
                                          {item.refund_reason && (
                                             <p className="text-xs text-muted-foreground mt-1 italic">
                                                Reason: {item.refund_reason}
                                             </p>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })
                           ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                 No items found
                              </p>
                           )}
                        </div>
                     </Card>

                     {/* Order Summary */}
                     <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <Package className="h-5 w-5 text-green-500" />
                           <h4 className="font-semibold text-base">
                              Order Summary
                           </h4>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between">
                              <p className="text-muted-foreground">Subtotal</p>
                              <p>
                                 {Number(
                                    normalizedOrder.subtotal || 0,
                                 ).toLocaleString()}{" "}
                                 RWF
                              </p>
                           </div>
                           <div className="flex justify-between">
                              <p className="text-muted-foreground">
                                 Transport fee
                              </p>
                              <p>
                                 {Number(
                                    normalizedOrder.tax || 0,
                                 ).toLocaleString()}{" "}
                                 RWF
                              </p>
                           </div>
                           <div className="flex justify-between font-semibold border-t pt-2">
                              <p>Total</p>
                              <p>
                                 {Number(
                                    normalizedOrder.total || 0,
                                 ).toLocaleString()}{" "}
                                 RWF
                              </p>
                           </div>
                           <div className="flex justify-between items-center border-t pt-2 mt-2">
                              <p className="text-muted-foreground">
                                 Payment Method
                              </p>
                              <p className="font-medium text-orange-600">
                                 {getPaymentMethodName(
                                    normalizedOrder.payment_method,
                                 )}
                              </p>
                           </div>
                        </div>
                     </Card>

                     {/* Rider Section (full-width, below other sections) */}
                     <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <BadgeCheck className="h-5 w-5 text-blue-500" />
                              <h4 className="font-semibold text-base">Rider</h4>
                           </div>
                           {/* FIXED: Add Fee button - visible to admins when rider is assigned and has ID */}
                           {isAdmin && rider && !riderLoading && rider.id && (
                              <Button
                                 onClick={() => setAddFeeOpen(true)}
                                 size="sm"
                                 className="gap-2"
                                 variant="outline"
                              >
                                 <Plus className="w-4 h-4" />
                                 Add Fee
                              </Button>
                           )}
                        </div>

                        <div>
                           {riderLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                 <Loader2 className="h-4 w-4 animate-spin" />
                                 <span>Loading rider...</span>
                              </div>
                           ) : rider ? (
                              <div className="flex items-start gap-4">
                                 <UserAvatarProfile
                                    user={{
                                       fullName:
                                          rider.full_name ||
                                          (rider as any).fullName ||
                                          (rider as any).name ||
                                          "Unknown Rider",
                                       subTitle:
                                          rider.phone || rider.email || "",
                                       imageUrl:
                                          rider.imageUrl ||
                                          (rider as any).image_url ||
                                          undefined,
                                    }}
                                    showInfo={false}
                                 />
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                       {rider.full_name ||
                                          (rider as any).fullName ||
                                          (rider as any).name ||
                                          rider.email ||
                                          "Unknown Rider"}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                       {rider.email && (
                                          <div className="flex items-center gap-2">
                                             <p className="text-sm text-muted-foreground truncate">
                                                {rider.email}
                                             </p>
                                             <CopyButton
                                                text={rider.email}
                                                label="Copy email"
                                             />
                                          </div>
                                       )}
                                       {rider.phone && (
                                          <div className="flex items-center gap-2">
                                             <p className="text-sm text-muted-foreground">
                                                {rider.phone}
                                             </p>
                                             <CopyButton
                                                text={rider.phone}
                                                label="Copy phone"
                                             />
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <p className="text-sm text-muted-foreground">
                                 No rider assigned yet
                              </p>
                           )}
                        </div>
                     </Card>
                  </div>
               </ScrollArea>
            </DialogContent>
         </Dialog>

         {/* Manage Refund Dialog */}
         {manageDialogOpen && manageItem && (
            <ManageRefundDialog
               open={manageDialogOpen}
               onOpenChange={setManageDialogOpen}
               order={normalizedOrder}
               item={manageItem}
            />
         )}

         {/* FIXED: Add Fee Dialog - visible to admins when rider is assigned */}
         {isAdmin && rider && (
            <AlertDialog
               open={addFeeOpen}
               onOpenChange={setAddFeeOpen}
            >
               <AlertDialogContent>
                  <AlertDialogHeader>
                     <AlertDialogTitle>Add Fee Adjustment</AlertDialogTitle>
                     <AlertDialogDescription>
                        Add a manual fee adjustment for this rider related to
                        order {normalizedOrder.order_number}. This can be a
                        positive amount (bonus/additional fee) or negative
                        amount (deduction).
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="fee-amount">Amount (RWF)</Label>
                        <Input
                           id="fee-amount"
                           type="number"
                           step="0.01"
                           placeholder="Enter amount (positive or negative)"
                           value={feeAmount}
                           onChange={(e) => setFeeAmount(e.target.value)}
                           disabled={isSubmittingFee}
                        />
                        <p className="text-xs text-muted-foreground">
                           Use positive values for additions, negative values
                           for deductions
                        </p>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="fee-reason">Reason</Label>
                        <Textarea
                           id="fee-reason"
                           placeholder="Enter reason for this fee adjustment (e.g., 'Additional delivery fee for order #123')"
                           value={feeReason}
                           onChange={(e) => setFeeReason(e.target.value)}
                           disabled={isSubmittingFee}
                           rows={3}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="fee-transaction-date">
                           Transaction Date
                        </Label>
                        <Popover
                           open={feeCalendarOpen}
                           onOpenChange={setFeeCalendarOpen}
                        >
                           <PopoverTrigger asChild>
                              <Button
                                 id="fee-transaction-date"
                                 variant="outline"
                                 className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !feeTransactionDate &&
                                       "text-muted-foreground",
                                 )}
                                 disabled={isSubmittingFee}
                              >
                                 <CalendarIcon className="mr-2 h-4 w-4" />
                                 {feeTransactionDate ? (
                                    format(feeTransactionDate, "PPP")
                                 ) : (
                                    <span>Pick a date</span>
                                 )}
                              </Button>
                           </PopoverTrigger>
                           <PopoverContent
                              className="w-auto p-0"
                              align="start"
                           >
                              <Calendar
                                 mode="single"
                                 selected={feeTransactionDate}
                                 onSelect={(date) => {
                                    setFeeTransactionDate(date || new Date());
                                    setFeeCalendarOpen(false);
                                 }}
                                 initialFocus
                              />
                           </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                           When this fee was earned or deducted
                        </p>
                     </div>
                  </div>
                  <AlertDialogFooter>
                     <AlertDialogCancel disabled={isSubmittingFee}>
                        Cancel
                     </AlertDialogCancel>
                     <AlertDialogAction
                        onClick={async () => {
                           if (
                              !feeAmount ||
                              parseFloat(feeAmount) === 0 ||
                              isNaN(parseFloat(feeAmount))
                           ) {
                              toast.error(
                                 "Please enter a valid non-zero amount",
                              );
                              return;
                           }
                           if (!feeReason.trim()) {
                              toast.error("Please enter a reason");
                              return;
                           }

                           // FIXED: Extract rider ID - handle multiple formats and data structures
                           const riderId =
                              rider?.id ||
                              (rider as any)?.rider_id ||
                              (rider as any)?.riderId ||
                              (normalizedOrder as any)?.assignment?.riderId ||
                              (normalizedOrder as any)?.assignment?.rider_id ||
                              (normalizedOrder as any)?.assignments?.[0]
                                 ?.riderId ||
                              (normalizedOrder as any)?.assignments?.[0]
                                 ?.rider_id ||
                              (normalizedOrder as any)?.assignments?.[0]?.rider
                                 ?.id ||
                              (normalizedOrder as any)?.assignments?.[0]?.rider
                                 ?.rider_id;

                           if (!riderId) {
                              // Try to fetch assignment data if not found locally
                              try {
                                 const assignmentResponse =
                                    await handleApiRequest(() =>
                                       unauthorizedAPI.get(
                                          `/orders/assignments/batch?ids=${normalizedOrder.id}`,
                                       ),
                                    );

                                 const assignmentData =
                                    assignmentResponse?.assignments?.[
                                       normalizedOrder.id
                                    ];
                                 const fetchedRiderId =
                                    assignmentData?.rider?.id ||
                                    assignmentData?.assignment?.riderId ||
                                    assignmentData?.riderId;

                                 if (fetchedRiderId) {
                                    // Use the fetched rider ID
                                    await submitFeeAdjustment(fetchedRiderId);
                                    return;
                                 }
                              } catch (fetchErr) {
                                 console.error(
                                    "Failed to fetch rider ID:",
                                    fetchErr,
                                 );
                              }

                              toast.error(
                                 "Rider ID not found. Please ensure a rider is assigned to this order.",
                              );
                              return;
                           }

                           await submitFeeAdjustment(riderId);
                        }}
                        disabled={isSubmittingFee}
                     >
                        {isSubmittingFee ? "Adding..." : "Add Fee"}
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </AlertDialogContent>
            </AlertDialog>
         )}
      </>
   );
}
