"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type PhoneFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
   label?: React.ReactNode;
   helper?: React.ReactNode;
   error?: string | boolean;
};

const PhoneField: React.FC<PhoneFieldProps> = ({
   label,
   helper,
   error,
   value,
   onChange,
   id,
   className,
   disabled,
   placeholder,
   ...rest
}) => {
   const v = typeof value === "string" ? value : "";

   return (
      <div>
         {label && (
            <Label
               htmlFor={id}
               className="text-xs sm:text-sm font-medium text-gray-700"
            >
               {label}
            </Label>
         )}
         <div className="relative mt-1">
            <Input
               id={id}
               value={v}
               onChange={onChange}
               placeholder={placeholder || "07X XXX XXX or +250 XXX XXX XXX"}
               className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10 ${
                  error
                     ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                     : ""
               } ${className || ""}`}
               disabled={disabled}
               {...rest}
            />

            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
               {v.startsWith("+250") || v.startsWith("07") ? "RW" : ""}
            </div>
         </div>
         {error && typeof error === "string" && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
         )}
         {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
      </div>
   );
};

export default PhoneField;
