"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useRiders, useAssignOrder, useReassignOrder } from "@/hooks/useRiders";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

interface AssignRiderDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   orderId: string;
}

export function AssignRiderDialog({
   open,
   onOpenChange,
   orderId,
}: AssignRiderDialogProps) {
   const [note, setNote] = useState("");
   const [selectedRider, setSelectedRider] = useState<string | undefined>(
      undefined
   );

   const ridersQuery = useRiders();
   const assignMutation = useAssignOrder();
   const reassignMutation = useReassignOrder();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submittingLabel, setSubmittingLabel] = useState<string | null>(null);
   const orders = useOrders();

   useEffect(() => {
      if (!open) {
         setNote("");
         setSelectedRider(undefined);
      }
   }, [open]);

   // Load current assignment when dialog opens so we can prefill and switch to "Change" flow
   useEffect(() => {
      let mounted = true;
      if (!open) return;
      (async () => {
         try {
            const res = await fetch(`/api/orders/${orderId}/assignment`);
            if (!res.ok) return;
            const json = await res.json();
            if (!mounted) return;
            const rider = json?.rider || null;
            if (rider && rider.id) setSelectedRider(rider.id);
         } catch (e) {
            // ignore
         }
      })();
      return () => {
         mounted = false;
      };
   }, [open, orderId]);

   const handleAssign = async () => {
      if (!selectedRider) {
         toast.error("Please select a rider to assign");
         return;
      }
      setIsSubmitting(true);
      setSubmittingLabel("Processing...");
      try {
         // Determine whether this is a new assign or a reassignment.
         // Fetch current assignment and the order row to inspect status.
         const [curResp, orderResp] = await Promise.all([
            fetch(`/api/orders/${orderId}/assignment`).catch(() => ({} as any)),
            fetch(`/api/orders/${orderId}`).catch(() => ({} as any)),
         ]);

         const cur =
            curResp && curResp.ok
               ? await curResp.json().catch(() => ({} as any))
               : ({} as any);
         const order =
            orderResp && orderResp.ok
               ? await orderResp.json().catch(() => ({} as any))
               : ({} as any);

         const currentRiderId = cur?.rider?.id || null;
         const orderStatus = (order && order.status) || null;

         // If the order is not pending, prefer the reassign flow so we don't
         // accidentally call the initial `assign` endpoint which requires
         // status === 'pending'. Also treat an existing different rider as
         // a reassign.
         if (
            (currentRiderId && currentRiderId !== selectedRider) ||
            (orderStatus && orderStatus !== "pending")
         ) {
            setSubmittingLabel("Reassigning...");
            await reassignMutation.mutateAsync({
               orderId,
               riderId: selectedRider,
               notes: note,
            });
            toast.success("Order reassigned to new rider");
         } else {
            setSubmittingLabel("Assigning...");
            await assignMutation.mutateAsync({
               orderId,
               riderId: selectedRider,
               notes: note,
            });
            toast.success("Order assigned to rider");
         }

         // refresh orders and riders
         orders.invalidateOrders();
         // close dialog
         onOpenChange(false);
      } catch (err: any) {
         console.error("Failed to assign/reassign order:", err);
         const msg =
            (err && err.error && (err.error.message || err.error)) ||
            err?.message ||
            (typeof err === "string" ? err : null) ||
            "Failed to assign order";
         toast.error(String(msg));
      } finally {
         setIsSubmitting(false);
         setSubmittingLabel(null);
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Assign to rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
               <div>
                  <Label>Order</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                     {orderId}
                  </div>
               </div>

               <div>
                  <Label>Rider</Label>
                  <div className="mt-2">
                     <Select
                        value={selectedRider}
                        onValueChange={(v) => setSelectedRider(v || undefined)}
                        disabled={isSubmitting || ridersQuery.isLoading}
                     >
                        <SelectTrigger>
                           <SelectValue
                              placeholder={
                                 ridersQuery.isLoading
                                    ? "Loading riders..."
                                    : "Select a rider..."
                              }
                           />
                        </SelectTrigger>
                        <SelectContent>
                           {ridersQuery.data && ridersQuery.data.length > 0 ? (
                              // show only active riders
                              ridersQuery.data
                                 .filter((r) => r.active !== false)
                                 .map((r) => (
                                    <SelectItem
                                       key={r.id}
                                       value={r.id}
                                    >
                                       {r.fullName || r.id}
                                       {r.phone ? ` — ${r.phone}` : ""}
                                    </SelectItem>
                                 ))
                           ) : (
                              <SelectItem value="">
                                 No riders available
                              </SelectItem>
                           )}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div>
                  <Label>Note</Label>
                  <Input
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="Add a note (optional)"
                     disabled={isSubmitting}
                  />
               </div>

               <div className="flex justify-end gap-2">
                  <Button
                     variant="ghost"
                     onClick={() => onOpenChange(false)}
                     disabled={isSubmitting}
                  >
                     Cancel
                  </Button>
                  <Button
                     onClick={handleAssign}
                     disabled={
                        isSubmitting ||
                        assignMutation.status === "pending" ||
                        reassignMutation.status === "pending" ||
                        ridersQuery.isLoading ||
                        !selectedRider
                     }
                  >
                     {isSubmitting ||
                     assignMutation.status === "pending" ||
                     reassignMutation.status === "pending" ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           {submittingLabel || "Processing..."}
                        </>
                     ) : (
                        "Assign"
                     )}
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}
