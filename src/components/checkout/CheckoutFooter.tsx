"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";

export default function CheckoutFooter({
   isKigali,
   isExplicitNonKigaliLocation,
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

   // WhatsApp-only locations (non-Kigali/izo mu ntara):
   // - HIDE "Order Now" button
   // - ONLY show "Order via WhatsApp" button
   // - This prevents standard orders for WhatsApp-only delivery locations
   const isWhatsAppOnlyLocation = isExplicitNonKigaliLocation;
   const showOrderNow = !isWhatsAppOnlyLocation;
   const showWhatsAppOnly = isWhatsAppOnlyLocation && hasItems;

   return (
      <div className="space-y-2">
         {/* Standard Order Now button - shown for Kigali locations only */}
         {showOrderNow && (
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
         )}

         {/* WhatsApp Order button - ONLY shown for non-Kigali locations (izo mu ntara) */}
         {showWhatsAppOnly && (
            <Button
               className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
               onClick={onWhatsAppClick}
               disabled={!hasItems}
            >
               <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
               {t("checkout.orderViaWhatsApp") || "Order via WhatsApp"}
            </Button>
         )}
      </div>
   );
}
