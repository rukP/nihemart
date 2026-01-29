"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React from "react";
import useGuestInfo from "@/hooks/useGuestInfo";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
   formData: any;
   setFormData: (fn: (prev: any) => any) => void;
   errors: any;
   onPhoneChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   phoneValue: string;
};

const GuestCheckoutForm: React.FC<Props> = ({
   formData,
   setFormData,
   errors,
   onPhoneChange,
   phoneValue,
}) => {
   const { formatPhoneInput } = useGuestInfo();
   const { t } = useLanguage();

   const localPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);
      setFormData((prev: any) => ({ ...prev, phone: formatted }));
   };
   return (
      <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
         <div className="text-sm font-medium mb-2">
            {t("checkout.guestDetails")}
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="sm:col-span-2">
               <Label className="text-xs sm:text-sm">
                  {t("checkout.fullName") || "Full name"}{" "}
                  <span className="text-red-500">*</span>
               </Label>
               <Input
                  value={formData.fullName || ""}
                  placeholder={t("checkout.fullNamePlaceholder") || "Enter yourFull name"}
                  onChange={(e) =>
                     setFormData((prev: any) => ({
                        ...prev,
                        fullName: e.target.value,
                     }))
                  }
                  className={errors?.fullName ? "border-red-500" : ""}
               />
               {errors?.fullName && (
                  <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
               )}
            </div>
         </div>
      </div>
   );
};

export default GuestCheckoutForm;
