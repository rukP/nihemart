"use client";
import React from "react";
import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderItemRow({
   item,
   onRemove,
}: {
   item: any;
   onRemove?: () => void;
}) {
   return (
      <div className="border-b border-gray-100 pb-2 sm:pb-3 last:border-b-0">
         <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded flex-shrink-0 flex items-center justify-center mt-0.5">
               <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                     <h4 className="font-medium text-xs sm:text-sm text-gray-900 break-words leading-tight">
                        {item.name}
                     </h4>
                     {item.variation_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                           Size: {item.variation_name}
                        </p>
                     )}
                  </div>
                  {onRemove && (
                     <div className="ml-2">
                        <Button
                           variant="ghost"
                           size="icon"
                           onClick={onRemove}
                           aria-label="Remove item"
                        >
                           <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                     </div>
                  )}
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mt-1 sm:mt-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                     RWF {item.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                     <p className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded whitespace-nowrap">
                        Qty: {item.quantity}
                     </p>
                     <p className="text-xs sm:text-sm font-medium text-orange-600 whitespace-nowrap">
                        RWF {(item.price * item.quantity).toLocaleString()}
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
