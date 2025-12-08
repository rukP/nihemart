"use client";
import React from "react";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";

export default function PaymentSection({
   paymentMethod,
   setPaymentMethod,
   handleMobileMoneyPhoneChange,
   mobileMoneyPhones,
   disabled,
}: any) {
   return (
      <div className="space-y-3 sm:space-y-4">
         <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            disabled={disabled}
            onMobileMoneyPhoneChange={handleMobileMoneyPhoneChange}
            mobileMoneyPhones={mobileMoneyPhones}
         />
      </div>
   );
}
