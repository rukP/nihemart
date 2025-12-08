"use client";

import React, { useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Order, OrderItem } from "@/types/orders";
import { useOrders } from "@/hooks/useOrders";
import { toast } from "sonner";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import {
   User,
   Package,
   CheckCircle2,
   AlertCircle,
   Loader2,
   Receipt,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface Props {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   order: Order;
   item?: OrderItem | null;
}

export function ManageRefundDialog({ open, onOpenChange, order, item }: Props) {
   const {
      useRespondRefundRequest,
      useRespondOrderRefund,
      useRequestRefundItem,
      useRequestRefundOrder,
   } = useOrders();
   const respond = useRespondRefundRequest();
   const respondOrder = useRespondOrderRefund();
   const requestItem = useRequestRefundItem();
   const requestOrder = useRequestRefundOrder();
   const [processing, setProcessing] = useState(false);
   const [note, setNote] = useState("");
   const [target, setTarget] = useState<"order" | "item">(
      item ? "item" : "order"
   );
   const [selectedItemId, setSelectedItemId] = useState<string | null>(
      item
         ? item.id
         : order.items && order.items.length === 1
         ? order.items[0].id
         : null
   );

   const handleResponse = async (approve: boolean) => {
      if (processing) return;
      setProcessing(true);
      if (nonRefundableOrder) {
         toast.error("Cannot initiate refund for this order status");
         setProcessing(false);
         return;
      }
      try {
         if (target === "item") {
            const itemId = selectedItemId || (item ? item.id : null);
            if (!itemId) throw new Error("No item selected");

            const currentItem =
               order.items?.find((it) => it.id === itemId) || item || null;

            if (currentItem && currentItem.refund_status === "requested") {
               await respond.mutateAsync({ itemId, approve, note });
            } else {
               await requestItem.mutateAsync({
                  orderItemId: itemId,
                  reason: note || "Refund by admin",
                  adminInitiated: true,
               } as any);
               await respond.mutateAsync({ itemId, approve: true, note });
            }
         } else {
            if (order.refund_status === "requested") {
               await respondOrder.mutateAsync({
                  orderId: order.id,
                  approve,
                  note,
               });
            } else {
               await requestOrder.mutateAsync({
                  orderId: order.id,
                  reason: note || "Refund by admin",
                  adminInitiated: true,
               } as any);
               await respondOrder.mutateAsync({
                  orderId: order.id,
                  approve: true,
                  note,
               });
            }
         }

         if (approve) {
            toast.success("Refund approved");
         } else {
            toast.success("Operation completed");
         }
         onOpenChange(false);
      } catch (err: any) {
         toast.error(err?.message || `Failed to process refund`);
      } finally {
         setProcessing(false);
      }
   };

   const customerName =
      `${order.customer_first_name} ${order.customer_last_name}`.trim();

   const statusLower = (order.status || "").toLowerCase();
   const isCancelled =
      statusLower === "cancelled" || statusLower === "canceled";
   const isRefundedStatus = statusLower === "refunded";
   const orderRefundStatus = (order.refund_status || "").toLowerCase();

   // Non-refundable order conditions: cancelled, already refunded, or refund already approved
   const nonRefundableOrder =
      isCancelled ||
      isRefundedStatus ||
      orderRefundStatus === "approved" ||
      orderRefundStatus === "refunded";

   const selectedItem =
      (order.items || []).find((it) => it.id === selectedItemId) || null;
   const selectedItemRefundStatus = (
      selectedItem?.refund_status || ""
   ).toLowerCase();
   const selectedItemNonRefundable =
      selectedItemRefundStatus === "approved" ||
      selectedItemRefundStatus === "refunded";

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-2xl px-1 sm:px-4">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Manage Refund Request
               </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[75vh]">
               {nonRefundableOrder && (
                  <Card className="p-3 border-0 bg-yellow-50 shadow-none">
                     <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                           <p className="font-semibold text-sm">
                              Refund Not Allowed
                           </p>
                           <p className="text-sm text-amber-900">
                              This order cannot be refunded (status:{" "}
                              {order.status || "unknown"}).
                           </p>
                        </div>
                     </div>
                  </Card>
               )}
               <div className="space-y-4 p-2 sm:p-4">
                  {/* Customer Info Card */}
                  <Card className="p-4 border-0 bg-gradient-to-br from-blue-50 to-white shadow-none">
                     <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-blue-500" />
                        <h4 className="font-semibold text-sm">Customer</h4>
                     </div>
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="font-medium">{customerName}</p>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_city}
                           </p>
                        </div>
                        <Badge
                           variant="outline"
                           className="text-xs"
                        >
                           Order #{order.order_number}
                        </Badge>
                     </div>
                  </Card>

                  {/* Refund Target Selection */}
                  <Card className="p-4">
                     <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-orange-500" />
                        <h4 className="font-semibold text-sm">Refund Target</h4>
                     </div>

                     <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                           onClick={() =>
                              !nonRefundableOrder && setTarget("order")
                           }
                           className={cn(
                              "p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                              target === "order"
                                 ? "border-blue-500 bg-blue-50 shadow-md"
                                 : "border-gray-200 bg-white hover:border-gray-300"
                           )}
                           disabled={nonRefundableOrder}
                        >
                           <div className="flex items-center gap-2 mb-1">
                              <Receipt className="h-4 w-4" />
                              <span className="font-medium text-sm">
                                 Whole Order
                              </span>
                           </div>
                           <p className="text-xs text-muted-foreground">
                              Refund entire order
                           </p>
                        </button>

                        <button
                           onClick={() =>
                              !nonRefundableOrder && setTarget("item")
                           }
                           className={cn(
                              "p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                              target === "item"
                                 ? "border-blue-500 bg-blue-50 shadow-md"
                                 : "border-gray-200 bg-white hover:border-gray-300"
                           )}
                           disabled={nonRefundableOrder}
                        >
                           <div className="flex items-center gap-2 mb-1">
                              <Package className="h-4 w-4" />
                              <span className="font-medium text-sm">
                                 Specific Item
                              </span>
                           </div>
                           <p className="text-xs text-muted-foreground">
                              Refund selected items
                           </p>
                        </button>
                     </div>

                     {/* Item Selection */}
                     {target === "item" && (
                        <div className="space-y-2 pt-2 border-t">
                           <p className="text-sm font-medium mb-3">
                              Select item to refund:
                           </p>
                           {(order.items || []).map((it) => {
                              const itemRefundStatus = (
                                 it.refund_status || ""
                              ).toLowerCase();
                              const nonRefundableItem =
                                 itemRefundStatus === "approved" ||
                                 itemRefundStatus === "refunded";

                              return (
                                 <button
                                    key={it.id}
                                    onClick={() =>
                                       !nonRefundableOrder &&
                                       !nonRefundableItem &&
                                       setSelectedItemId(it.id)
                                    }
                                    className={cn(
                                       "w-full p-3 rounded-lg border-2 transition-all text-left hover:shadow-md",
                                       selectedItemId === it.id
                                          ? "border-blue-500 bg-blue-50 shadow-md"
                                          : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                    disabled={
                                       nonRefundableOrder || nonRefundableItem
                                    }
                                 >
                                    <div className="flex items-start justify-between gap-3">
                                       <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm truncate">
                                             {it.product_name}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                             <span className="text-xs text-muted-foreground">
                                                Qty: {it.quantity}
                                             </span>
                                             <span className="text-xs text-muted-foreground">
                                                •
                                             </span>
                                             <span className="text-xs font-medium">
                                                {it.total?.toLocaleString?.()}{" "}
                                                RWF
                                             </span>
                                             {it.refund_status && (
                                                <>
                                                   <span className="text-xs text-muted-foreground">
                                                      •
                                                   </span>
                                                   <Badge
                                                      variant={
                                                         it.refund_status ===
                                                         "approved"
                                                            ? "default"
                                                            : it.refund_status ===
                                                              "rejected"
                                                            ? "destructive"
                                                            : "secondary"
                                                      }
                                                      className="text-xs"
                                                   >
                                                      {it.refund_status}
                                                   </Badge>
                                                </>
                                             )}
                                          </div>
                                       </div>
                                       {selectedItemId === it.id && (
                                          <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                       )}
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     )}
                  </Card>

                  {/* Refund Reason Display */}
                  {(item || order.refund_reason) && (
                     <Card className="p-4 border-0 bg-amber-50 shadow-none">
                        <div className="flex items-start gap-2">
                           <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                           <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm mb-1">
                                 {item
                                    ? "Item Refund Reason"
                                    : "Order Refund Reason"}
                              </h4>
                              <p className="text-sm italic text-amber-900">
                                 {item
                                    ? item.refund_reason
                                    : order.refund_reason}
                              </p>
                              {item && (
                                 <div className="mt-2 pt-2 border-t border-amber-200">
                                    <p className="text-xs text-muted-foreground">
                                       {item.product_name}
                                       {item.variation_name &&
                                          ` (${item.variation_name})`}
                                    </p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </Card>
                  )}

                  {/* Admin Note */}
                  <Card className="p-4">
                     <label className="block">
                        <span className="font-semibold text-sm mb-2 block">
                           Admin Note (Optional)
                        </span>
                        <Textarea
                           value={note}
                           onChange={(e) => setNote(e.target.value)}
                           placeholder="Add a note for the customer or internal logs..."
                           className="min-h-[100px] resize-none"
                           disabled={processing}
                        />
                     </label>
                  </Card>
               </div>
            </ScrollArea>

            <DialogFooter className="border-t pt-4">
               <div className="flex gap-2 justify-end w-full">
                  <Button
                     variant="ghost"
                     onClick={() => onOpenChange(false)}
                     disabled={processing}
                  >
                     Cancel
                  </Button>
                  <Button
                     className="bg-green-600 hover:bg-green-700 min-w-[120px]"
                     onClick={() => handleResponse(true)}
                     disabled={
                        processing ||
                        nonRefundableOrder ||
                        (target === "item" &&
                           (!selectedItemId || selectedItemNonRefundable))
                     }
                     title={
                        nonRefundableOrder
                           ? `Cannot initiate refund for order status: ${order.status}`
                           : target === "item" && selectedItemNonRefundable
                           ? "Selected item already refunded/approved"
                           : undefined
                     }
                  >
                     {processing ? (
                        <>
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                           Processing...
                        </>
                     ) : (
                        <>
                           <CheckCircle2 className="h-4 w-4 mr-2" />
                           Approve Refund
                        </>
                     )}
                  </Button>
               </div>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
