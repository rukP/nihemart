"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function CheckoutFooter({
   isKigali,
   isLoggedIn,
   isSubmitting,
   isInitiating,
   hasItems,
   hasAddress,
   hasEmail,
   hasValidPhone,
   paymentMethod,
   ordersEnabled,
   ordersSource,
   scheduleConfirmChecked,
   missingSteps,
   t,
   onLoginClick,
   onOrderNowClick,
   onWhatsAppClick,
}: any) {
   const disabled =
      isSubmitting ||
      isInitiating ||
      !hasItems ||
      !hasAddress ||
      // Email is no longer required for guest checkout
      !hasValidPhone ||
      !paymentMethod ||
      (ordersEnabled === false &&
         ordersSource === "schedule" &&
         !scheduleConfirmChecked) ||
      (ordersEnabled === false && ordersSource === "admin");

   if (isKigali) {
      // Allow both authenticated users and guests to place orders.
      return (
         <div className="space-y-2">
            <Button
               className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
               onClick={onOrderNowClick}
               disabled={disabled}
            >
               {isSubmitting || isInitiating ? (
                  <>
                     <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                     {isInitiating
                        ? "Initiating Payment..."
                        : t("checkout.processing")}
                  </>
               ) : (
                  <>
                     <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                     {t("checkout.orderNow") || "Order Now"}
                  </>
               )}
            </Button>
         </div>
      );
   }

   // non-Kigali flow (WhatsApp)
   return (
      <>
         <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
            onClick={onWhatsAppClick}
            disabled={!hasItems}
         >
            {t("checkout.orderViaWhatsApp") || "Order via WhatsApp"}
         </Button>
      </>
   );
}
