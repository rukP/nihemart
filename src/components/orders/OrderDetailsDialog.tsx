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
} from "lucide-react";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { UserAvatarProfile } from "../user-avatar-profile";
// import { useEffect, useMemo } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { fetchStoreProductById } from "@/integrations/supabase/store";
import { useEffect } from "react";
import { ManageRefundDialog } from "./ManageRefundDialog";

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
   const { useCancelRefundRequestItem, useRequestRefundItem } = useOrders();
   const cancelRefund = useCancelRefundRequestItem();
   const requestRefund = useRequestRefundItem();
   const { useRequestRefundOrder, useCancelRefundRequestOrder } = useOrders();
   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();
   const { user, hasRole } = useAuth();
   const isOwner = user?.id === order.user_id;
   const isAdmin = typeof hasRole === "function" ? hasRole("admin") : false;
   const statusLower = (order.status || "").toLowerCase();
   const orderRefundStatus = (order.refund_status || "").toLowerCase();
   const nonRefundableOrder =
      statusLower === "cancelled" ||
      statusLower === "refunded" ||
      orderRefundStatus === "approved" ||
      orderRefundStatus === "refunded";
   const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
   const [manageDialogOpen, setManageDialogOpen] = useState(false);
   const [manageItem, setManageItem] = useState<OrderItem | null>(null);
   const customerName =
      `${order.customer_first_name} ${order.customer_last_name}`.trim();
   const [showOrderRefundDialog, setShowOrderRefundDialog] = useState(false);
   const [orderRefundReason, setOrderRefundReason] = useState("");
   const [orderLoading, setOrderLoading] = useState(false);
   // Rider info: prefer the rider attached to the order row, but fall back to
   // querying the cached assignment hook when the order payload did not
   // include `rider`.
   const { useOrderAssignment } = useOrders();
   const assignmentQuery = useOrderAssignment(
      order?.id,
      Boolean(open && !(order as any)?.rider)
   );
   const riderFromAssignment = assignmentQuery.data;
   const riderLoading = assignmentQuery.isLoading;

   const rider: Rider | null | undefined =
      (order && (order as any).rider) ?? riderFromAssignment;

   const [productImages, setProductImages] = useState<
      Record<string, string | null>
   >({});
   // Map of product_variation_id -> variation name (populated from product detail fetch)
   const [productVariationNames, setProductVariationNames] = useState<
      Record<string, string>
   >({});

   // Helper to render variation information for an order item
   const renderVariationLabel = (item: OrderItem) => {
      // Prefer explicit variation_name saved on the order item
      const explicit = item.variation_name;
      if (explicit) {
         // Sometimes variation_name may be a JSON string of attributes
         try {
            const parsed = JSON.parse(explicit);
            if (parsed && typeof parsed === "object") {
               const pairs = Object.entries(parsed)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
               return (
                  <p className="text-sm text-muted-foreground">
                     Variation: {pairs}
                  </p>
               );
            }
         } catch (e) {
            // not JSON, fall back to plain string
         }
         return (
            <p className="text-sm text-muted-foreground">
               Variation: {explicit}
            </p>
         );
      }

      // Fall back to variation lookup fetched from product details
      const lookup =
         item.product_variation_id &&
         productVariationNames[item.product_variation_id]
            ? productVariationNames[item.product_variation_id]
            : undefined;
      if (lookup) {
         return (
            <p className="text-sm text-muted-foreground">Variation: {lookup}</p>
         );
      }

      // As a last resort show SKU or the raw variation id so user can identify
      if (item.product_sku) {
         return (
            <p className="text-sm text-muted-foreground">
               SKU: {item.product_sku}
            </p>
         );
      }

      if (item.product_variation_id) {
         return (
            <p className="text-sm text-muted-foreground">
               Variation id: {item.product_variation_id}
            </p>
         );
      }

      return null;
   };

   useEffect(() => {
      let mounted = true;
      // Fetch latest assignment's rider when the dialog opens and the order
      // does not already include rider metadata.
      // assignment is loaded via useOrderAssignment hook (react-query)
      const load = async () => {
         try {
            if (!order?.items || order.items.length === 0) return;
            const ids = Array.from(
               new Set(
                  order.items
                     .map((it) => it.product_id)
                     .filter(Boolean) as string[]
               )
            );
            if (ids.length === 0) return;
            const map: Record<string, string | null> = {};
            const variationMap: Record<string, string> = {};
            await Promise.all(
               ids.map(async (id) => {
                  try {
                     const data = await fetchStoreProductById(id);
                     map[id] = data?.product?.main_image_url || null;
                     // collect variations mapping for this product
                     if (data && Array.isArray(data.variations)) {
                        for (const v of data.variations) {
                           if (v && v.id && v.name) {
                              variationMap[v.id] = v.name;
                           }
                        }
                     }
                  } catch (e) {
                     map[id] = null;
                  }
               })
            );
            if (mounted) {
               setProductImages(map);
               // merge with existing mapping without clobbering
               setProductVariationNames((prev) => ({
                  ...prev,
                  ...variationMap,
               }));
            }
         } catch (e) {
            // ignore
         }
      };
      if (open) {
         load();
         // fetch rider info if needed
         // No need to fetch rider info, it's handled by the useOrderAssignment hook
      }
      return () => {
         mounted = false;
      };
   }, [order?.items, open]);

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
                                    Order #{order.order_number}
                                 </h3>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                 {format(
                                    new Date(order.created_at),
                                    "MMMM d, yyyy 'at' HH:mm"
                                 )}
                              </p>
                              {/* Rider section moved below — kept header concise */}
                           </div>
                           <Badge
                              className={cn(
                                 "capitalize font-semibold text-base px-3 py-1 rounded-lg",
                                 {
                                    "bg-green-500/10 text-green-500":
                                       order.status === "delivered",
                                    "bg-yellow-500/10 text-yellow-500": [
                                       "pending",
                                       "processing",
                                       "shipped",
                                    ].includes(order.status),
                                    "bg-red-500/10 text-red-500":
                                       order.status === "cancelled",
                                 }
                              )}
                           >
                              {order.status}
                           </Badge>
                        </div>
                     </Card>

                     {/* Customer Information */}
                     <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <User className="h-5 w-5 text-blue-500" />
                           <h4 className="font-semibold text-base">
                              Customer Information
                           </h4>
                        </div>
                        <div className="flex items-center space-x-4 mb-4">
                           <UserAvatarProfile
                              user={{
                                 fullName: customerName,
                                 subTitle: order.customer_email,
                              }}
                              showInfo={false}
                           />
                           <div className="flex-1">
                              <h5 className="font-medium">{customerName}</h5>
                              <div className="flex items-center gap-2">
                                 <p className="text-sm text-muted-foreground">
                                    {order.customer_email}
                                 </p>
                                 <CopyButton
                                    text={order.customer_email}
                                    label="Copy email"
                                 />
                              </div>
                              {order.customer_phone && (
                                 <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                       {order.customer_phone}
                                    </p>
                                    <CopyButton
                                       text={order.customer_phone}
                                       label="Copy phone number"
                                    />
                                 </div>
                              )}
                           </div>
                        </div>
                        <div className="space-y-2 border-t pt-2">
                           <h4 className="font-medium">Delivery Address</h4>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_address}
                           </p>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_city}
                           </p>
                           {order.delivery_notes && (
                              <p className="text-sm text-muted-foreground italic">
                                 Note: {order.delivery_notes}
                              </p>
                           )}
                           {order.schedule_notes && (
                              <p className="text-sm text-muted-foreground italic mt-1">
                                 Schedule notes: {order.schedule_notes}
                              </p>
                           )}
                           {order.delivery_time && (
                              <p className="text-sm text-muted-foreground mt-2">
                                 <strong>Requested delivery time: </strong>
                                 {isValid(new Date(order.delivery_time))
                                    ? format(
                                         new Date(order.delivery_time),
                                         "MMMM d, yyyy 'at' HH:mm"
                                      )
                                    : String(order.delivery_time)}
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
                           {order.items?.map((item, index) => (
                              <div
                                 key={item.id}
                                 className={cn(
                                    "flex gap-4 rounded-lg hover:bg-gray-100 transition-colors p-2",
                                    index !== 0 && "border-t pt-4"
                                 )}
                              >
                                 {/* Product Image */}
                                 {/* Prefer product's canonical main image when available, else fall back to the image recorded on the order item */}
                                 {(productImages[item.product_id || ""] ||
                                    item.product_image_url) && (
                                    <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                       <Image
                                          src={
                                             productImages[
                                                item.product_id || ""
                                             ] ||
                                             item.product_image_url ||
                                             ""
                                          }
                                          alt={item.product_name}
                                          fill
                                          className="object-cover"
                                          sizes="64px"
                                          onError={(e) => {
                                             e.currentTarget.style.display =
                                                "none";
                                          }}
                                       />
                                    </div>
                                 )}
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                       <p className="font-medium">
                                          {item.product_name}
                                       </p>
                                       {item.refund_status ? (
                                          <>
                                             <Badge
                                                variant={
                                                   item.refund_status ===
                                                   "approved"
                                                      ? "default"
                                                      : item.refund_status ===
                                                        "rejected"
                                                      ? "destructive"
                                                      : "secondary"
                                                }
                                             >
                                                {item.refund_status
                                                   .charAt(0)
                                                   .toUpperCase() +
                                                   item.refund_status.slice(1)}
                                             </Badge>
                                             {item.refund_status ===
                                                "requested" && (
                                                <Button
                                                   size="sm"
                                                   variant="ghost"
                                                   onClick={async () => {
                                                      setLoadingItemId(item.id);
                                                      try {
                                                         await cancelRefund.mutateAsync(
                                                            item.id
                                                         );
                                                      } catch (e) {
                                                         // handled by mutation
                                                      } finally {
                                                         setLoadingItemId(null);
                                                      }
                                                   }}
                                                   disabled={
                                                      loadingItemId === item.id
                                                   }
                                                >
                                                   {loadingItemId ===
                                                   item.id ? (
                                                      <Loader2 className="h-4 w-4 animate-spin" />
                                                   ) : (
                                                      "Cancel"
                                                   )}
                                                </Button>
                                             )}
                                             {isAdmin &&
                                                item.refund_status ===
                                                   "requested" &&
                                                !nonRefundableOrder && (
                                                   <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => {
                                                         setManageItem(item);
                                                         setManageDialogOpen(
                                                            true
                                                         );
                                                      }}
                                                   >
                                                      Manage
                                                   </Button>
                                                )}

                                             {isAdmin &&
                                                !item.refund_status &&
                                                !nonRefundableOrder && (
                                                   <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={async () => {
                                                         setLoadingItemId(
                                                            item.id
                                                         );
                                                         try {
                                                            const updated =
                                                               await requestRefund.mutateAsync(
                                                                  {
                                                                     orderItemId:
                                                                        item.id,
                                                                     reason:
                                                                        "Admin initiated refund",
                                                                     adminInitiated:
                                                                        true,
                                                                  } as any
                                                               );
                                                            // Open manage dialog for admin to approve/complete
                                                            setManageItem(
                                                               updated as any
                                                            );
                                                            setManageDialogOpen(
                                                               true
                                                            );
                                                         } catch (e) {
                                                            // handled by mutation
                                                         } finally {
                                                            setLoadingItemId(
                                                               null
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
                                                         "Initiate refund"
                                                      )}
                                                   </Button>
                                                )}
                                          </>
                                       ) : null}
                                    </div>
                                    {/* Prefer explicit variation_name saved on the order item, but
                                     fall back to a product variation lookup (fetched above)
                                     when available. This ensures admins see which variation
                                     the user selected even if the order row did not include
                                     the variation_name field. */}
                                    {renderVariationLabel(item)}
                                    <div className="flex justify-between items-center mt-2">
                                       <p className="text-sm text-muted-foreground">
                                          Quantity: {item.quantity} ×{" "}
                                          {Number(
                                             item.price || 0
                                          ).toLocaleString()}{" "}
                                          RWF
                                       </p>
                                       <p className="font-medium">
                                          {Number(
                                             item.total || 0
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
                           ))}
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
                                 {Number(order.subtotal || 0).toLocaleString()}{" "}
                                 RWF
                              </p>
                           </div>
                           <div className="flex justify-between">
                              <p className="text-muted-foreground">
                                 Transport fee
                              </p>
                              <p>
                                 {Number(order.tax || 0).toLocaleString()} RWF
                              </p>
                           </div>
                           <div className="flex justify-between font-semibold border-t pt-2">
                              <p>Total</p>
                              <p>
                                 {Number(order.total || 0).toLocaleString()} RWF
                              </p>
                           </div>
                        </div>
                     </Card>

                     {/* Rider Section (full-width, below other sections) */}
                     <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                           <BadgeCheck className="h-5 w-5 text-blue-500" />
                           <h4 className="font-semibold text-base">Rider</h4>
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
                                          (rider as any).name ||
                                          "Unknown Rider",
                                       subTitle:
                                          rider.phone || rider.email || "",
                                       imageUrl:
                                          (rider as any).image_url ||
                                          (rider as any).imageUrl ||
                                          undefined,
                                    }}
                                    showInfo={false}
                                 />
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                       {rider.full_name ||
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
                                 No rider assigned
                              </p>
                           )}
                        </div>
                     </Card>
                  </div>
               </ScrollArea>
            </DialogContent>
         </Dialog>
         {manageItem && (
            <ManageRefundDialog
               open={manageDialogOpen}
               onOpenChange={(v: boolean) => {
                  setManageDialogOpen(v);
                  if (!v) setManageItem(null);
               }}
               order={order}
               item={manageItem}
            />
         )}
      </>
   );
}
