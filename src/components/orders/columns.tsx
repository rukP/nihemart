"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { format, isValid } from "date-fns";
import { UserAvatarProfile } from "../user-avatar-profile";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import Image from "next/image";
import { momoIcon } from "@/assets";
import { Icons } from "../icons";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CustomerDetailsDialog } from "./CustomerDetailsDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { AssignRiderDialog } from "./AssignRiderDialog";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/orders";

const Status = ({ status }: { status: Order["status"] }) => {
   return (
      <Badge
         className={cn("capitalize font-semibold", {
            "bg-green-500/10 text-green-500": status === "delivered",
            "bg-yellow-500/10 text-yellow-500":
               status === "pending" ||
               status === "processing" ||
               status === "shipped",
            "bg-blue-500/10 text-blue-500": status === "assigned",
            "bg-red-500/10 text-red-500": status === "cancelled",
         })}
      >
         {status || "unknown"}
      </Badge>
   );
};

const PaymentMethod = ({ method }: { method?: string }) => {
   const paymentMethod = method || "mobile_money";
   switch (paymentMethod) {
      case "mobile_money":
         return (
            <Image
               src={momoIcon}
               alt="momoIcon"
               height={30}
               width={70}
            />
         );
      case "credit_card":
         return (
            <div className="flex items-center gap-1">
               <Icons.orders.masterCard /> ... 1234
            </div>
         );
      default:
         return <span className="text-sm text-muted-foreground">Unknown</span>;
   }
};

export const columns: ColumnDef<Order>[] = [
   {
      id: "select",
      header: ({ table }) => (
         <Checkbox
            checked={
               table.getIsAllPageRowsSelected() ||
               (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
               table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
         />
      ),
      cell: ({ row }) => (
         <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
         />
      ),
      enableSorting: false,
      enableHiding: false,
   },
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
      accessorKey: "created_at",
      header: "DATE",
      cell: ({ row }) => {
         const dateValue = row.getValue("created_at");
         const date =
            typeof dateValue === "string"
               ? new Date(dateValue)
               : (dateValue as Date);
         return (
            <span className="text-text-secondary">
               {isValid(date)
                  ? format(date, "MMMM d, yyyy, HH:mm")
                  : "Invalid Date"}
            </span>
         );
      },
   },
   {
      accessorKey: "delivery_time",
      header: "DELIVERY",
      cell: ({ row }) => {
         const v = row.getValue("delivery_time");
         if (!v)
            return <span className="text-sm text-muted-foreground">—</span>;
         const d = typeof v === "string" ? new Date(v) : (v as Date);
         return (
            <span className="text-sm text-muted-foreground">
               {isValid(d) ? format(d, "MMM d, HH:mm") : String(v)}
            </span>
         );
      },
   },
   {
      id: "customer",
      header: "CUSTOMER",
      cell: ({ row }) => {
         // Show guest badge for anonymous orders. For registered users show
         // their name (and email/phone if available) so admins can identify
         // customers quickly from the list.
         const isGuest = !row.original.user_id;
         const firstName = row.original.customer_first_name || "";
         const lastName = row.original.customer_last_name || "";
         const fullName = `${firstName} ${lastName}`.trim();
         const email = row.original.customer_email || null;
         const phone = row.original.customer_phone || null;

         if (isGuest) {
            const guestFullName = fullName || null;
            const guestLabel = guestFullName || phone || email || "Guest";
            const subLabel = guestFullName ? phone || email || "" : "";
            return (
               <div className="flex items-center gap-3">
                  <Badge className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                     Guest
                  </Badge>
                  <div className="flex flex-col">
                     <span className="text-text-primary text-sm font-medium">
                        {guestLabel}
                     </span>
                     {subLabel && (
                        <span className="text-text-secondary text-xs">
                           {subLabel}
                        </span>
                     )}
                  </div>
               </div>
            );
         }

         return (
            <div className="flex items-center gap-3">
               <UserAvatarProfile
                  user={{
                     fullName: fullName || email || phone || "User",
                     subTitle: email || phone || "",
                  }}
                  showInfo={false}
               />
               <div className="flex flex-col">
                  <span className="text-text-primary text-sm font-medium">
                     {fullName || email || phone || "User"}
                  </span>
                  {(email || phone) && (
                     <span className="text-text-secondary text-xs">
                        {email ? email : phone}
                     </span>
                  )}
               </div>
            </div>
         );
      },
   },
   {
      id: "rider",
      header: "RIDER",
      cell: ({ row }) => {
         const orderId = row.original.id;
         const [loading, setLoading] = useState(false);
         const [rider, setRider] = useState<any>(null);

         useEffect(() => {
            let mounted = true;
            (async () => {
               try {
                  setLoading(true);
                  const res = await fetch(`/api/orders/${orderId}/assignment`);
                  if (!res.ok) return;
                  const json = await res.json();
                  if (!mounted) return;
                  setRider(json?.rider || null);
               } catch (e) {
                  // ignore
               } finally {
                  if (mounted) setLoading(false);
               }
            })();
            return () => {
               mounted = false;
            };
         }, [orderId]);

         if (loading)
            return (
               <span className="text-sm text-muted-foreground">Loading…</span>
            );
         if (!rider)
            return (
               <span className="text-sm text-muted-foreground">Unassigned</span>
            );
         return (
            <div className="flex items-center gap-2">
               <UserAvatarProfile
                  user={{
                     fullName: rider.full_name || rider.name,
                     subTitle: rider.phone || undefined,
                  }}
                  showInfo={false}
               />
               <span className="text-sm">
                  {rider.full_name || rider.name || rider.id}
               </span>
            </div>
         );
      },
   },
   {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => {
         const [isUpdating, setIsUpdating] = useState(false);
         const { updateOrderStatus } = useOrders();
         const currentStatus = (row.getValue("status") ||
            "pending") as OrderStatus;
         const isExternal = !!row.original.is_external;

         const handleStatusChange = async (newStatus: OrderStatus) => {
            if (isUpdating) return;
            try {
               setIsUpdating(true);
               await updateOrderStatus.mutateAsync({
                  id: row.original.id,
                  status: newStatus,
               });
            } catch (error) {
               console.error("Failed to update order status:", error);
            } finally {
               setIsUpdating(false);
            }
         };

         return (
            <DropdownMenu>
               <DropdownMenuTrigger
                  disabled={isUpdating || !isExternal}
                  className="w-full"
               >
                  <div
                     className={
                        isUpdating ? "opacity-50 cursor-not-allowed" : ""
                     }
                  >
                     <Status status={currentStatus} />
                  </div>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                  <DropdownMenuLabel>
                     Update Status
                     {!isExternal && (
                        <span className="ml-2 text-xs text-zinc-500">
                           (external orders only)
                        </span>
                     )}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("pending")}
                     disabled={!isExternal}
                  >
                     Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("processing")}
                     disabled={!isExternal}
                  >
                     Processing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() =>
                        handleStatusChange("assigned" as OrderStatus)
                     }
                     disabled={!isExternal}
                  >
                     Assigned
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("delivered")}
                     disabled={!isExternal}
                  >
                     Delivered
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("cancelled")}
                     disabled={!isExternal}
                  >
                     Cancelled
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() =>
                        handleStatusChange("refunded" as OrderStatus)
                     }
                     disabled={!isExternal}
                  >
                     Refunded
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         );
      },
   },
   {
      accessorKey: "total",
      header: "AMOUNT",
      cell: ({ row }) => (
         <div className="font-medium">
            {row.getValue<number>("total").toLocaleString()} RWF
         </div>
      ),
   },
   {
      id: "actions",
      size: 10,
      cell: ({ row }) => {
         const order = row.original;
         const statusLower = (order.status || "").toLowerCase();
         const orderRefundStatus = (order.refund_status || "").toLowerCase();
         const nonRefundableOrder =
            statusLower === "cancelled" ||
            statusLower === "refunded" ||
            orderRefundStatus === "approved" ||
            orderRefundStatus === "refunded";
         const { updateOrderStatus } = useOrders();
         const hasRefund =
            (Array.isArray(order.items) &&
               order.items.some((it) => it.refund_status === "requested")) ||
            order.refund_status === "requested";
         const { hasRole } = useAuth();
         const isAdmin = hasRole && hasRole("admin");
         const [showCustomerDetails, setShowCustomerDetails] = useState(false);
         const [showOrderDetails, setShowOrderDetails] = useState(false);
         const [showAssignDialog, setShowAssignDialog] = useState(false);
         const [showManageRefund, setShowManageRefund] = useState(false);
         const [showCancelAlert, setShowCancelAlert] = useState(false);
         const [isCancelling, setIsCancelling] = useState(false);
         const refundItem =
            order.items?.find((it) => !!it.refund_status) || null;

         const handleCancelOrder = async () => {
            setIsCancelling(true);
            try {
               await updateOrderStatus.mutateAsync({
                  id: order.id,
                  status: "cancelled",
               } as any);
               toast.success("Order cancelled successfully");
               setShowCancelAlert(false);
            } catch (err: any) {
               toast.error(err?.message || "Failed to cancel order");
            } finally {
               setIsCancelling(false);
            }
         };

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
                           navigator.clipboard.writeText(
                              order.order_number || order.id
                           )
                        }
                     >
                        Copy order ID
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => setShowCustomerDetails(true)}
                     >
                        View customer
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => setShowOrderDetails(true)}
                     >
                        View order details
                     </DropdownMenuItem>
                     {isAdmin &&
                        order.status === "delivered" &&
                        !order.is_external && (
                           <DropdownMenuItem
                              onClick={() => setShowManageRefund(true)}
                           >
                              {order.is_external
                                 ? "Refund By Admin"
                                 : "Refund By Admin"}
                           </DropdownMenuItem>
                        )}
                     {order.status === "pending" && (
                        <DropdownMenuItem
                           onClick={() => setShowAssignDialog(true)}
                        >
                           Assign to rider
                        </DropdownMenuItem>
                     )}
                     {(order.status === "assigned" ||
                        order.status === "processing") && (
                        <DropdownMenuItem
                           onClick={() => setShowAssignDialog(true)}
                        >
                           Change rider
                        </DropdownMenuItem>
                     )}
                     {isAdmin &&
                        (order.status === "pending" ||
                           order.status === "processing") && (
                           <DropdownMenuItem
                              onClick={() => setShowCancelAlert(true)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                           >
                              Cancel Order
                           </DropdownMenuItem>
                        )}
                  </DropdownMenuContent>
               </DropdownMenu>

               <CustomerDetailsDialog
                  open={showCustomerDetails}
                  onOpenChange={setShowCustomerDetails}
                  customer={{
                     firstName: order.customer_first_name,
                     lastName: order.customer_last_name,
                     email: order.customer_email,
                     phone: order.customer_phone,
                  }}
               />

               <OrderDetailsDialog
                  open={showOrderDetails}
                  onOpenChange={setShowOrderDetails}
                  order={order}
               />

               {isAdmin && (
                  <ManageRefundDialog
                     open={showManageRefund}
                     onOpenChange={setShowManageRefund}
                     order={order}
                     item={refundItem}
                  />
               )}

               <AssignRiderDialog
                  open={showAssignDialog}
                  onOpenChange={setShowAssignDialog}
                  orderId={order.id}
               />

               <AlertDialog
                  open={showCancelAlert}
                  onOpenChange={setShowCancelAlert}
               >
                  <AlertDialogContent>
                     <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                           Are you sure you want to cancel order #
                           {order.order_number || order.id}? This action cannot
                           be undone and will set the order status to
                           "cancelled".
                        </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>
                           No, keep order
                        </AlertDialogCancel>
                        <AlertDialogAction
                           onClick={handleCancelOrder}
                           disabled={isCancelling}
                           className="bg-red-600 hover:bg-red-700 text-white"
                        >
                           {isCancelling
                              ? "Cancelling..."
                              : "Yes, cancel order"}
                        </AlertDialogAction>
                     </AlertDialogFooter>
                  </AlertDialogContent>
               </AlertDialog>
            </>
         );
      },
   },
];
