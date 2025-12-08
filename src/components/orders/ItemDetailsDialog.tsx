"use client";

import React from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
   Package,
   User,
   DollarSign,
   ShoppingCart,
   BadgeCheck,
   Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface ItemDetailsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   item: {
      id?: string;
      product_name?: string;
      product?: { name?: string; price?: number };
      quantity?: number;
      price?: number;
      refund_status?: string;
      refund_reason?: string;
      order?: {
         customer_first_name?: string;
         customer_last_name?: string;
         customer_email?: string;
         customer_phone?: string;
         order_number?: string;
         id?: string;
      };
   } | null;
}

export const ItemDetailsDialog: React.FC<ItemDetailsDialogProps> = ({
   open,
   onOpenChange,
   item,
}) => {
   if (!item) return null;

   const productName =
      item.product?.name || item.product_name || "Unknown Product";
   const productPrice = item.product?.price || item.price || 0;
   // Try to get product image from known fields (add more if needed)
   const productImage = (item as any).product_image_url || null;
   const customerName =
      `${item.order?.customer_first_name || ""} ${
         item.order?.customer_last_name || ""
      }`.trim() || "Unknown Customer";
   const customerEmail = item.order?.customer_email || "N/A";
   const customerPhone = item.order?.customer_phone || "N/A";
   const orderNumber = item.order?.order_number || item.order?.id || "N/A";

   const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
         case "requested":
            return "bg-yellow-100 text-yellow-800";
         case "approved":
            return "bg-green-100 text-green-800";
         case "rejected":
            return "bg-red-100 text-red-800";
         case "cancelled":
            return "bg-gray-100 text-gray-800";
         default:
            return "bg-blue-100 text-blue-800";
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-2xl px-1 sm:px-4">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Item Details
               </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
               {/* Product Information */}
               <Card className="p-1 sm:p-2 md:p-4">
                  <CardContent className="pt-3 sm:pt-4 md:pt-6">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                           <ShoppingCart className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                           <h3 className="font-semibold text-lg flex items-center gap-2">
                              {productName}
                              {item.refund_status && (
                                 <BadgeCheck
                                    className="h-4 w-4 text-green-500"
                                    aria-label="Refund status"
                                 />
                              )}
                           </h3>
                           <p className="text-gray-600">
                              Product ID: {item.id || "N/A"}
                           </p>
                        </div>
                        {productImage && (
                           <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border">
                              <Image
                                 src={productImage}
                                 alt={productName}
                                 fill
                                 className="object-cover"
                                 sizes="64px"
                                 onError={(e) => {
                                    (
                                       e.currentTarget as HTMLImageElement
                                    ).style.display = "none";
                                 }}
                              />
                           </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                           <DollarSign className="h-4 w-4 text-gray-500" />
                           <div>
                              <p className="text-sm text-gray-600">Price</p>
                              <p className="font-semibold">
                                 RWF {productPrice.toLocaleString()}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Package className="h-4 w-4 text-gray-500" />
                           <div>
                              <p className="text-sm text-gray-600">Quantity</p>
                              <p className="font-semibold">
                                 {item.quantity || 1}
                              </p>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>

               {/* Customer Information */}
               <Card className="p-1 sm:p-2 md:p-4">
                  <CardContent className="pt-3 sm:pt-4 md:pt-6">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                           <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-lg">
                              Customer Information
                           </h3>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div>
                           <p className="text-sm text-gray-600">Name</p>
                           <p className="font-semibold">{customerName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-semibold">{customerEmail}</p>
                           </div>
                           <div>
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="font-semibold">{customerPhone}</p>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>

               {/* Refund Information */}
               <Card className="p-1 sm:p-2 md:p-4">
                  <CardContent className="pt-3 sm:pt-4 md:pt-6">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <BadgeCheck className="h-5 w-5 text-green-500" />
                           <h3 className="font-semibold text-lg">
                              Refund Information
                           </h3>
                        </div>
                        <Badge
                           className={getStatusColor(item.refund_status || "")}
                        >
                           {item.refund_status || "Unknown"}
                        </Badge>
                     </div>
                     <div className="space-y-3">
                        <div>
                           <p className="text-sm text-gray-600">
                              Related Order
                           </p>
                           <p className="font-semibold">#{orderNumber}</p>
                        </div>
                        {item.refund_reason && (
                           <div>
                              <p className="text-sm text-gray-600">
                                 Refund Reason
                              </p>
                              <p className="font-semibold">
                                 {item.refund_reason}
                              </p>
                           </div>
                        )}
                        <div>
                           <p className="text-sm text-gray-600">
                              Total Refund Amount
                           </p>
                           <p className="font-semibold text-lg text-orange-600">
                              RWF{" "}
                              {(
                                 productPrice * (item.quantity || 1)
                              ).toLocaleString()}
                           </p>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </DialogContent>
      </Dialog>
   );
};

export default ItemDetailsDialog;
