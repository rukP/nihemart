"use client";

import React, { useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { labelOrder, removeOrderLabel } from "@/lib/api/orders";
import { Order } from "@/types/orders";
import { useOrders } from "@/hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import { orderKeys } from "@/hooks/useOrders";

interface LabelOrderDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   order: Order;
}

export function LabelOrderDialog({
   open,
   onOpenChange,
   order,
}: LabelOrderDialogProps) {
   const [labelNumber, setLabelNumber] = useState(
      order.label_number || ""
   );
   const [locationCode, setLocationCode] = useState(
      order.location_code || ""
   );
   const [orderCount, setOrderCount] = useState(
      order.order_count?.toString() || ""
   );
   const [isSubmitting, setIsSubmitting] = useState(false);
   const { invalidateOrders } = useOrders();
   const queryClient = useQueryClient();

   const handleSubmit = async () => {
      if (!labelNumber.trim()) {
         toast.error("Label number is required");
         return;
      }

      if (!locationCode.trim()) {
         toast.error("Location code is required");
         return;
      }

      setIsSubmitting(true);
      try {
         // FIXED: Fetch the updated order after labeling to ensure we have all fields
         const updatedOrder = await labelOrder(order.id, {
            labelNumber: labelNumber.trim(),
            locationCode: locationCode.trim(),
            orderCount: orderCount ? parseInt(orderCount, 10) : undefined,
         });
         
         // FIXED: Update the specific order in cache immediately
         if (updatedOrder && updatedOrder.id) {
            queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder);
         }
         
         // FIXED: Invalidate all order queries to ensure UI refreshes
         invalidateOrders();
         // Also invalidate the specific order detail query
         queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
         // Invalidate all list queries to ensure lists show updated label info
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         
         toast.success("Order labeled successfully");
         onOpenChange(false);
      } catch (error: any) {
         toast.error(error?.message || "Failed to label order");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleRemoveLabel = async () => {
      if (!order.is_labeled) return;

      setIsSubmitting(true);
      try {
         // FIXED: Fetch the updated order after removing label
         const updatedOrder = await removeOrderLabel(order.id);
         
         // FIXED: Update the specific order in cache immediately
         if (updatedOrder && updatedOrder.id) {
            queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder);
         }
         
         // FIXED: Invalidate all order queries to ensure UI refreshes
         invalidateOrders();
         // Also invalidate the specific order detail query
         queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
         // Invalidate all list queries
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         
         toast.success("Label removed successfully");
         setLabelNumber("");
         setLocationCode("");
         setOrderCount("");
         onOpenChange(false);
      } catch (error: any) {
         toast.error(error?.message || "Failed to remove label");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>
                  {order.is_labeled ? "Edit Order Label" : "Label Order"}
               </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label htmlFor="label-number">Label Number *</Label>
                  <Input
                     id="label-number"
                     placeholder="e.g., 03"
                     value={labelNumber}
                     onChange={(e) => setLabelNumber(e.target.value)}
                     disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                     Group/sequence number for this order
                  </p>
               </div>
               <div className="space-y-2">
                  <Label htmlFor="location-code">Location Code *</Label>
                  <Input
                     id="location-code"
                     placeholder="e.g., KGL"
                     value={locationCode}
                     onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                     disabled={isSubmitting}
                     maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                     Location code (e.g., KGL for Kigali)
                  </p>
               </div>
               <div className="space-y-2">
                  <Label htmlFor="order-count">Order Count (Optional)</Label>
                  <Input
                     id="order-count"
                     type="number"
                     min="1"
                     placeholder="e.g., 12"
                     value={orderCount}
                     onChange={(e) => setOrderCount(e.target.value)}
                     disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                     Optional: Number of orders in this group
                  </p>
               </div>
               {order.is_labeled && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                     <p className="text-sm text-orange-800">
                        Current label:{" "}
                        <span className="font-semibold">
                           L-{order.label_number} | {order.location_code}
                           {order.order_count ? ` | #${order.order_count}` : ""}
                        </span>
                     </p>
                  </div>
               )}
            </div>
            <DialogFooter>
               {order.is_labeled && (
                  <Button
                     variant="destructive"
                     onClick={handleRemoveLabel}
                     disabled={isSubmitting}
                  >
                     Remove Label
                  </Button>
               )}
               <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
               >
                  Cancel
               </Button>
               <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Label"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

