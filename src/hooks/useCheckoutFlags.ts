"use client";
import { useMemo } from "react";

type Args = {
   orderItemsCount: number;
   selectedAddress: any | null;
   formData: any;
   selectedProvince: string | null;
   provinces: any[];
   selectedSector: string | null;
   sectors: any[];
   formatPhoneNumber: (s: string) => string;
   paymentMethod: string | "" | undefined;
   paymentVerified: boolean;
   effectiveIsRetry: boolean;
   ordersEnabled: boolean | null;
   ordersSource: "admin" | "schedule" | null;
   scheduleConfirmChecked: boolean;
};

export default function useCheckoutFlags({
   orderItemsCount,
   selectedAddress,
   formData,
   selectedProvince,
   provinces,
   selectedSector,
   sectors,
   formatPhoneNumber,
   paymentMethod,
   paymentVerified,
   effectiveIsRetry,
   ordersEnabled,
   ordersSource,
   scheduleConfirmChecked,
}: Args) {
   return useMemo(() => {
      const hasItems = orderItemsCount > 0;

      const selectedProvinceObj = selectedProvince
         ? provinces.find(
              (p: any) => String(p.prv_id) === String(selectedProvince)
           )
         : null;
      const provinceIsKigali = Boolean(
         selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali")
      );

      const isKigaliBySavedAddress = Boolean(
         selectedAddress &&
            [
               selectedAddress.city,
               selectedAddress.street,
               selectedAddress.display_name,
            ]
               .filter(Boolean)
               .join(" ")
               .toLowerCase()
               .includes("kigali")
      );
      const isKigali = isKigaliBySavedAddress || provinceIsKigali;

      // CRITICAL FIX: WhatsApp button should ONLY show when a complete address has been selected
      // NOT during address creation (when user is just filling the form)
      // selectedProvince alone doesn't mean address is selected - it could be mid-creation
      const hasExplicitLocationSelection = Boolean(selectedAddress);
      const isExplicitNonKigaliLocation =
         hasExplicitLocationSelection && !isKigali;

      // CRITICAL: hasAddress should only be true when an address is SELECTED/SAVED
      // NOT during address creation (filling form fields)
      // This ensures "Order Now" button stays disabled until address is complete
      const hasAddress = Boolean(
         selectedAddress &&
            (selectedAddress.display_name || selectedAddress.city)
      );

      // Email is now optional for guest users (not shown in form)
      const hasEmail = Boolean(formData.email && String(formData.email).trim());

      const phoneForCheck = (
         selectedAddress?.phone ||
         formData.phone ||
         ""
      ).toString();
      const formattedPhoneForCheck = formatPhoneNumber(phoneForCheck || "");
      const hasValidPhone = /^07\d{8}$/.test(formattedPhoneForCheck);

      const paymentRequiresVerification =
         paymentMethod && paymentMethod !== "cash_on_delivery";

      let missingSteps: string[] = [];
      if (!hasItems) missingSteps.push("checkout.missing.addItems");
      if (!hasAddress) missingSteps.push("checkout.missing.address");
      // Email is no longer required for guest checkout
      // if (!hasEmail) missingSteps.push("checkout.missing.email");
      if (!hasValidPhone) missingSteps.push("checkout.missing.phone");
      if (!paymentMethod) missingSteps.push("checkout.missing.paymentMethod");
      // Payment verification happens AFTER order placement, not before
      // if (paymentRequiresVerification && !paymentVerified)
      //    missingSteps.push("checkout.missing.completePayment");

      if (effectiveIsRetry) {
         const retryOnly: string[] = [];
         if (!paymentMethod)
            retryOnly.push("checkout.missing.selectAnotherMethod");
         missingSteps = retryOnly;
      }

      // All steps completed when: items, address, phone, and payment method are set
      // Payment verification happens AFTER placing order (except COD which creates order first)
      const allStepsCompleted =
         hasItems && hasAddress && hasValidPhone && Boolean(paymentMethod);

      return {
         hasItems,
         isKigali,
         isExplicitNonKigaliLocation,
         hasAddress,
         hasEmail,
         hasValidPhone,
         paymentRequiresVerification,
         missingSteps,
         allStepsCompleted,
         selectedProvinceObj,
      };
   }, [
      orderItemsCount,
      selectedAddress,
      formData,
      selectedProvince,
      provinces,
      selectedSector,
      sectors,
      formatPhoneNumber,
      paymentMethod,
      paymentVerified,
      effectiveIsRetry,
      ordersEnabled,
      ordersSource,
      scheduleConfirmChecked,
   ]);
}
