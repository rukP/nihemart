"use client";

import { momoIcon, mtnIcon, airtelIcon, visaIcon, codIcon } from "@/assets";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Dot, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { Icons } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerDetailsDialog } from "../orders/CustomerDetailsDialog";
import { OrderDetailsDialog } from "../orders/OrderDetailsDialog";
import { Transaction } from "@/integrations/supabase/transactions";

type Payment = Transaction;

const Status = ({
   status,
}: {
   status: "cancled" | "delivered" | "scheduled";
}) => {
   return (
      <Badge
         className={cn(
            "capitalize font-semibold",
            { "bg-green-500/10 text-green-500": status == "delivered" },
            { "bg-yellow-500/10 text-yellow-500": status == "scheduled" },
            { "bg-red-500/10 text-red-500": status == "cancled" }
         )}
      >
         {status}
      </Badge>
   );
};

const PaymentStatus = ({ status }: { status: string }) => {
   return (
      <div
         className={cn(
            "flex items-center capitalize font-semibold",
            { "text-green-500": status == "completed" },
            { "text-red-500": status == "failed" },
            { "text-yellow-500": status == "pending" },
            { "text-gray-500": status == "timeout" }
         )}
      >
         <Dot strokeWidth={7} />
         {status}
      </div>
   );
};

const PaymentMethod = ({ method }: { method: string }) => {
   const methodLower = method?.toLowerCase().replace(/[_\s-]/g, "");

   switch (methodLower) {
      case "mtnmomo":
      case "mtn":
      case "momo":
      case "kpay":
         return (
            <div className="flex items-center">
               <Image
                  src={mtnIcon}
                  alt="MTN Mobile Money"
                  height={24}
                  width={40}
                  className="object-contain"
               />
            </div>
         );
      case "airtelmoney":
      case "airtel":
         return (
            <div className="flex items-center">
               <Image
                  src={airtelIcon}
                  alt="Airtel Money"
                  height={24}
                  width={40}
                  className="object-contain"
               />
            </div>
         );
      case "visa":
      case "visacard":
         return (
            <div className="flex items-center">
               <Image
                  src={visaIcon}
                  alt="Visa Card"
                  height={24}
                  width={40}
                  className="object-contain"
               />
            </div>
         );
      case "cashondelivery":
      case "cashondel":
      case "cashondelivery":
      case "cash_on_delivery":
      case "cod":
         return (
            <div className="flex items-center">
               <Image
                  src={codIcon}
                  alt="Cash on Delivery"
                  height={24}
                  width={40}
                  className="object-contain"
               />
            </div>
         );
      case "mastercard":
      case "master":
      case "card":
         return (
            <div className="flex items-center gap-1">
               <div className="h-6 w-auto">
                  <Icons.orders.masterCard />
               </div>
            </div>
         );
      default:
         return (
            <div className="flex items-center">
               <span className="text-sm text-gray-600 capitalize px-2 py-1 bg-gray-100 rounded">
                  {method || "Unknown"}
               </span>
            </div>
         );
   }
};

export const columns: ColumnDef<Payment>[] = [
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
      accessorKey: "reference",
      header: "REFERENCE",
      cell: ({ row }) => (
         <span className="text-text-primary font-mono text-sm">
            #{row.getValue("reference")}
         </span>
      ),
   },
   {
      accessorKey: "customer_name",
      header: "CUSTOMER",
      cell: ({ row }) => {
         const transaction = row.original;
         return (
            <div className="flex flex-col">
               <span className="font-medium">{transaction.customer_name}</span>
               <span className="text-sm text-gray-500">
                  {transaction.customer_email}
               </span>
            </div>
         );
      },
   },
   {
      accessorKey: "created_at",
      header: "DATE",
      cell: ({ row }) => (
         <span className="text-text-secondary">
            {format(new Date(row.getValue("created_at")), "MMM d, yyyy, HH:mm")}
         </span>
      ),
   },
   {
      accessorKey: "amount",
      header: () => <div className="text-right">AMOUNT</div>,
      cell: ({ row }) => {
         const amount = parseFloat(row.getValue("amount"));
         const formatted = new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            minimumFractionDigits: 0,
         }).format(amount);

         return <div className="text-right font-medium">{formatted}</div>;
      },
   },
   {
      accessorKey: "payment_method",
      header: "METHOD",
      cell: ({ row }) => (
         <PaymentMethod method={row.getValue("payment_method") || ""} />
      ),
   },
   {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => (
         <PaymentStatus status={row.getValue("status") || ""} />
      ),
   },
   {
      id: "actions",
      size: 10,
      cell: ({ row }) => {
         const transaction = row.original;
         const [showCustomerDetails, setShowCustomerDetails] = useState(false);
         const [showOrderDetails, setShowOrderDetails] = useState(false);

         const handleCopyReference = () => {
            navigator.clipboard.writeText(transaction.reference);
            toast.success("Reference copied to clipboard");
         };

         const handleCopyOrderId = () => {
            if (transaction.order_id) {
               navigator.clipboard.writeText(transaction.order_id);
               toast.success("Order ID copied to clipboard");
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
                     <DropdownMenuItem onClick={handleCopyReference}>
                        Copy reference
                     </DropdownMenuItem>
                     {transaction.order_id && (
                        <DropdownMenuItem onClick={handleCopyOrderId}>
                           Copy order ID
                        </DropdownMenuItem>
                     )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => setShowCustomerDetails(true)}
                     >
                        View customer
                     </DropdownMenuItem>
                     {transaction.order_id && (
                        <DropdownMenuItem
                           onClick={() => setShowOrderDetails(true)}
                        >
                           View order details
                        </DropdownMenuItem>
                     )}
                  </DropdownMenuContent>
               </DropdownMenu>

               <CustomerDetailsDialog
                  open={showCustomerDetails}
                  onOpenChange={setShowCustomerDetails}
                  customer={{
                     firstName:
                        transaction.customer_name?.split(" ")[0] || "Unknown",
                     lastName:
                        transaction.customer_name
                           ?.split(" ")
                           .slice(1)
                           .join(" ") || "",
                     email: transaction.customer_email,
                     phone: transaction.customer_phone,
                  }}
               />

               {transaction.order && transaction.order_id && (
                  <OrderDetailsDialog
                     open={showOrderDetails}
                     onOpenChange={setShowOrderDetails}
                     order={
                        {
                           id: transaction.order.id,
                           order_number:
                              transaction.order.order_number ||
                              transaction.reference,
                           status: transaction.order.status,
                           customer_first_name:
                              transaction.order.customer_first_name,
                           customer_last_name:
                              transaction.order.customer_last_name,
                           customer_email: transaction.order.customer_email,
                           customer_phone:
                              transaction.order.customer_phone ||
                              transaction.customer_phone,
                           total: transaction.order.total,
                           payment_status: transaction.order.payment_status,
                           delivery_address:
                              transaction.order.delivery_address || "",
                           delivery_city: transaction.order.delivery_city || "",
                           delivery_notes: transaction.order.delivery_notes,
                           user_id: transaction.order.user_id,
                           created_at: transaction.order.created_at,
                           updated_at: transaction.order.updated_at,
                           items: transaction.order.items || [],
                           subtotal: transaction.order.total,
                           tax: 0,
                           currency: transaction.currency || "RWF",
                           source: "online",
                           is_external: false,
                           is_paid: transaction.status === "completed",
                        } as any
                     }
                  />
               )}
            </>
         );
      },
   },
];
