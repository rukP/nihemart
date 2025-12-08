"use client";
import React from "react";
import { Separator } from "@/components/ui/separator";

export default function PriceSummary({
   subtotal,
   transport,
   total,
   t,
}: {
   subtotal: number;
   transport: number;
   total: number;
   t: (k: string) => string;
}) {
   return (
      <div className="space-y-2 sm:space-y-3">
         <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">{t("checkout.subtotal")}</span>
            <span className="font-medium">RWF {subtotal.toLocaleString()}</span>
         </div>
         <div className="flex justify-between text-xs sm:text-sm items-center">
            <div className="flex items-center">
               <span className="text-gray-600">
                  {t("checkout.deliveryFee")}
               </span>
               <div className="ml-2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-400 flex items-center justify-center">
                  <span className="text-xs text-gray-400">i</span>
               </div>
            </div>
            <span className="font-medium text-orange-600">
               RWF {transport.toLocaleString()}
            </span>
         </div>
         <Separator />
         <div className="flex justify-between text-sm sm:text-lg font-bold">
            <span className="text-gray-900">{t("checkout.total")}</span>
            <span className="text-orange-600">
               RWF {total.toLocaleString()}
            </span>
         </div>
      </div>
   );
}
