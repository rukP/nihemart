"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/hooks/useOrders";
import { useRiders, useAssignOrder } from "@/hooks/useRiders";
import { toast } from "sonner";

interface AssignOrderToRiderDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   riderId: string;
   onAssigned?: () => void;
}

export default function AssignOrderToRiderDialog({
   open,
   onOpenChange,
   riderId,
   onAssigned,
}: AssignOrderToRiderDialogProps) {
   const { useAllOrders, invalidateOrders } = useOrders();
   // useAllOrders expects an OrderQueryOptions shape: use filters/pagination
   const ordersQuery = useAllOrders({
      filters: { status: "pending" },
      pagination: { page: 1, limit: 50 },
   });
   const assignMutation = useAssignOrder();

   const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(
      undefined
   );

   useEffect(() => {
      if (!open) setSelectedOrderId(undefined);
   }, [open]);

   const availableOrders = useMemo(() => {
      return ordersQuery.data?.data || [];
   }, [ordersQuery.data]);

   const handleAssign = async () => {
      if (!selectedOrderId) {
         toast.error("Please select an order to assign");
         return;
      }

      // server will enforce rider existence/active status; avoid extra GET here
      try {
         await assignMutation.mutateAsync({
            orderId: selectedOrderId,
            riderId,
         });
         toast.success("Order assigned to rider");
         invalidateOrders();
         onOpenChange(false);
         onAssigned?.();
      } catch (err: any) {
         console.error(err);
         const msg =
            (err && err.error && (err.error.message || err.error)) ||
            err?.message ||
            (typeof err === "string" ? err : null) ||
            "Failed to assign order";
         toast.error(String(msg));
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Assign Order to Rider</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
               <div>
                  <p className="text-sm text-muted-foreground">
                     Select an available order to assign to this rider.
                  </p>
               </div>

               <div className="max-h-96 overflow-auto">
                  {ordersQuery.isLoading && (
                     <div className="p-4">Loading orders...</div>
                  )}
                  {ordersQuery.isError && (
                     <div className="p-4 text-red-500">
                        Failed to load orders.
                     </div>
                  )}
                  {!ordersQuery.isLoading && availableOrders.length === 0 && (
                     <div className="p-4 text-sm text-muted-foreground">
                        No available orders found.
                     </div>
                  )}

                  <ul className="divide-y">
                     {availableOrders.map((o: any) => (
                        <li
                           key={o.id}
                           className="p-2 flex items-center justify-between"
                        >
                           <label className="flex items-center gap-3">
                              <input
                                 type="radio"
                                 name="selectedOrder"
                                 checked={selectedOrderId === o.id}
                                 onChange={() => setSelectedOrderId(o.id)}
                                 className="accent-primary"
                              />
                              <div>
                                 <div className="font-medium">
                                    {o.order_number || o.id}
                                 </div>
                                 <div className="text-sm text-muted-foreground">
                                    {o.customer_first_name}{" "}
                                    {o.customer_last_name} — {o.delivery_city}
                                 </div>
                              </div>
                           </label>
                           <div className="text-sm">
                              {o.total?.toFixed?.(2) || o.total}
                           </div>
                        </li>
                     ))}
                  </ul>
               </div>

               <DialogFooter>
                  <div className="flex gap-2 justify-end w-full">
                     <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                     >
                        Cancel
                     </Button>
                     <Button
                        onClick={handleAssign}
                        disabled={
                           assignMutation.status === "pending" ||
                           !selectedOrderId
                        }
                     >
                        {assignMutation.status === "pending"
                           ? "Assigning..."
                           : "Assign Order"}
                     </Button>
                  </div>
               </DialogFooter>
            </div>
         </DialogContent>
      </Dialog>
   );
}
