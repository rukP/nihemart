"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PAYMENT_METHODS } from "@/lib/services/kpay";
import { Banknote, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileMoneyPhoneDialog from "./MobileMoneyPhoneDialog";
import Image from "next/image";
import mtnLogo from "@/assets/icons/mtn.png";
import airtelLogo from "@/assets/icons/airtel.png";
import visaLogo from "@/assets/icons/visa.png";

export interface PaymentMethodSelectorProps {
   selectedMethod: keyof typeof PAYMENT_METHODS | "cash_on_delivery";
   onMethodChange: (
      method: keyof typeof PAYMENT_METHODS | "cash_on_delivery"
   ) => void;
   disabled?: boolean;
   className?: string;
   // Mobile Money
   onMobileMoneyPhoneChange?: (
      method: "mtn_momo" | "airtel_money",
      phoneNumber: string
   ) => void;
   mobileMoneyPhones?: {
      mtn_momo?: string;
      airtel_money?: string;
   };
}

const PaymentMethodIcon = ({
   method,
}: {
   method: keyof typeof PAYMENT_METHODS | "cash_on_delivery";
}) => {
   switch (method) {
      case "mtn_momo":
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-lg p-2">
               <Image
                  src={mtnLogo}
                  alt="MTN"
                  width={40}
                  height={40}
                  className="object-contain"
               />
            </div>
         );
      case "airtel_money":
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-lg p-2">
               <Image
                  src={airtelLogo}
                  alt="Airtel"
                  width={40}
                  height={40}
                  className="object-contain"
               />
            </div>
         );
      case "visa_card":
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-lg p-2">
               <Image
                  src={visaLogo}
                  alt="Visa"
                  width={40}
                  height={40}
                  className="object-contain"
               />
            </div>
         );
      case "mastercard":
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-lg p-2">
               {/* MasterCard overlapping circles logo */}
               <div className="relative w-7 h-5 sm:w-8 sm:h-6">
                  {/* Red circle */}
                  <div className="absolute left-0 top-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EB001B]" />
                  {/* Orange/Yellow circle with overlap */}
                  <div className="absolute left-2 sm:left-2.5 top-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FF5F00]" />
               </div>
            </div>
         );
      case "cash_on_delivery":
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-orange-100 rounded-lg">
               <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
         );
      default:
         return (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 rounded-lg">
               <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
            </div>
         );
   }
};


export default function PaymentMethodSelector({
   selectedMethod,
   onMethodChange,
   disabled = false,
   className = "",
   // Mobile Money
   onMobileMoneyPhoneChange,
   mobileMoneyPhones = {},
}: PaymentMethodSelectorProps) {
   const { t } = useLanguage();

   // Dialog states
   const [mobileMoneyDialog, setMobileMoneyDialog] = useState<{
      isOpen: boolean;
      method: "mtn_momo" | "airtel_money" | null;
   }>({ isOpen: false, method: null });

   const paymentOptions: (keyof typeof PAYMENT_METHODS | "cash_on_delivery")[] =
      [
         "mtn_momo",
         "airtel_money",
         "visa_card",
         "mastercard",
         // 'spenn', // Temporarily disabled - not supported by KPay (error 609)
         "cash_on_delivery",
      ];

   const getPaymentMethodDetails = (
      method: keyof typeof PAYMENT_METHODS | "cash_on_delivery"
   ) => {
      if (method === "cash_on_delivery") {
         return {
            name:
               t("payment.method.cash_on_delivery.name") || "Cash on Delivery",
            description:
               t("payment.method.cash_on_delivery.description") ||
               "Pay with cash when your order is delivered",
            badge: t("payment.method.cash_on_delivery.badge") || "Traditional",
            badgeColor: "bg-orange-100 text-orange-800",
         };
      }

      const paymentMethod = PAYMENT_METHODS[method];
      if (!paymentMethod) {
         return {
            name: t(`payment.method.${method}.name`) || "Unknown",
            description: t(`payment.method.${method}.description`) || "",
            badge: t(`payment.method.${method}.badge`) || "",
            badgeColor: "bg-gray-100 text-gray-800",
         };
      }

      const defaultDetails: Record<string, any> = {
         mtn_momo: { badgeColor: "bg-yellow-100 text-yellow-800" },
         airtel_money: { badgeColor: "bg-red-100 text-red-800" },
         visa_card: { badgeColor: "bg-blue-100 text-blue-800" },
         mastercard: { badgeColor: "bg-blue-100 text-blue-800" },
         spenn: { badgeColor: "bg-purple-100 text-purple-800" },
      };

      return {
         name: t(`payment.method.${method}.name`) || paymentMethod.name,
         description: t(`payment.method.${method}.description`) || "",
         badge: t(`payment.method.${method}.badge`) || "",
         badgeColor:
            defaultDetails[method]?.badgeColor || "bg-gray-100 text-gray-800",
      };
   };

   const handleMethodChange = (
      method: keyof typeof PAYMENT_METHODS | "cash_on_delivery"
   ) => {
      // Handle Mobile Money methods
      if (
         (method === "mtn_momo" || method === "airtel_money") &&
         onMobileMoneyPhoneChange
      ) {
         if (!mobileMoneyPhones[method]) {
            setMobileMoneyDialog({ isOpen: true, method });
            return;
         }
      }

      // Cash on delivery or method with data already collected
      onMethodChange(method);
   };

   const handleMobileMoneyPhoneConfirm = (phoneNumber: string) => {
      const { method } = mobileMoneyDialog;
      if (method && onMobileMoneyPhoneChange) {
         onMobileMoneyPhoneChange(method, phoneNumber);
         onMethodChange(method);
      }
   };

   const handleMobileMoneyDialogClose = () => {
      setMobileMoneyDialog({ isOpen: false, method: null });
   };

   return (
      <div className={className}>
         {/* Payment options */}
         <RadioGroup
            value={selectedMethod}
            onValueChange={handleMethodChange}
            disabled={disabled}
            className="space-y-2 sm:space-y-3"
         >
            {paymentOptions.map((method) => {
               const details = getPaymentMethodDetails(method);

               return (
                  <label
                     key={method}
                     htmlFor={method}
                     className={`
                        flex items-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${
                           selectedMethod === method
                              ? "border-orange-500 bg-orange-50/50"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                     `}
                  >
                     {/* Icon/Logo */}
                     <div className="flex-shrink-0">
                        <PaymentMethodIcon method={method} />
                     </div>

                     {/* Payment method name */}
                     <div className="flex-1 ml-3 sm:ml-4">
                        <p className="font-medium text-sm sm:text-base text-gray-900">
                           {details.name}
                        </p>
                        {/* Mobile Money Phone Numbers */}
                        {(method === "mtn_momo" || method === "airtel_money") &&
                           mobileMoneyPhones[method] && (
                              <p className="text-xs text-gray-600 font-mono mt-0.5">
                                 {mobileMoneyPhones[method]}
                              </p>
                           )}
                     </div>

                     {/* Radio button */}
                     <div className="flex-shrink-0">
                        <RadioGroupItem
                           value={method}
                           id={method}
                           className="border-2 border-gray-300 text-orange-600 w-5 h-5 sm:w-6 sm:h-6"
                        />
                     </div>
                  </label>
               );
            })}
         </RadioGroup>

         {/* Mobile Money Phone Dialog */}
         {mobileMoneyDialog.method && (
            <MobileMoneyPhoneDialog
               isOpen={mobileMoneyDialog.isOpen}
               onOpenChange={(open) => {
                  if (!open) handleMobileMoneyDialogClose();
               }}
               paymentMethod={mobileMoneyDialog.method}
               onConfirm={handleMobileMoneyPhoneConfirm}
               initialPhone={mobileMoneyPhones[mobileMoneyDialog.method] || ""}
            />
         )}
      </div>
   );
}
