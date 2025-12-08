"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import useGuestInfo from "@/hooks/useGuestInfo";

type Props = {
   provinces: any[];
   districts: any[];
   sectors: any[];
   selectedProvince: string | null;
   setSelectedProvince: (v: string | null) => void;
   selectedDistrict: string | null;
   setSelectedDistrict: (v: string | null) => void;
   selectedSector: string | null;
   setSelectedSector: (v: string | null) => void;
   houseNumber: string;
   setHouseNumber: (v: string) => void;
   phoneInput: string;
   setPhoneInput: (v: string) => void;
   editingAddressId: string | null;
   setEditingAddressId: (v: string | null) => void;
   saveAddress: (payload: any) => Promise<any>;
   updateAddress: (id: string, payload: any) => Promise<any>;
   reloadSaved: () => Promise<void>;
   setAddNewOpen: (v: boolean) => void;
   setAddressOpen: (v: boolean) => void;
   t: (k: string) => string;
   // New prop to enable "use directly without saving" mode for checkout
   onUseDirectly?: (addressData: any) => void;
   isLoggedIn?: boolean;
};

export default function CheckoutAddressForm(props: Props) {
   const {
      provinces,
      districts,
      sectors,
      selectedProvince,
      setSelectedProvince,
      selectedDistrict,
      setSelectedDistrict,
      selectedSector,
      setSelectedSector,
      houseNumber,
      setHouseNumber,
      phoneInput,
      setPhoneInput,
      editingAddressId,
      setEditingAddressId,
      saveAddress,
      updateAddress,
      reloadSaved,
      setAddNewOpen,
      setAddressOpen,
      t,
      onUseDirectly,
      isLoggedIn,
   } = props;

   const { formatPhoneInput, normalizePhone } = useGuestInfo();
   const [isSavingAddress, setIsSavingAddress] = useState(false);
   const [errors, setErrors] = useState<any>({});

   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneInput(e.target.value);
      setPhoneInput(formatted);
      if (errors?.phone) setErrors((p: any) => ({ ...p, phone: undefined }));
   };

   const useDirectlyClicked = () => {
      if (isSavingAddress) return;
      const selectedProvinceObj = provinces.find(
         (p: any) => String(p.prv_id) === String(selectedProvince)
      );
      const provinceIsKigali = Boolean(
         selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali")
      );

      if (provinceIsKigali && !selectedSector) {
         toast.error("Please select a sector for delivery");
         return;
      }

      // simple phone validation
      try {
         const cleaned = phoneInput?.replace(/[^\d+]/g, "") || "";
         if (!/^\+250\d{9}$/.test(cleaned) && !/^07\d{8}$/.test(cleaned)) {
            throw new Error(t("checkout.errors.validPhone") || "Invalid phone");
         }
      } catch (ve: any) {
         const first = ve?.message || t("checkout.errors.validPhone");
         setErrors((prev: any) => ({ ...prev, phone: first }));
         toast.error(String(first));
         return;
      }

      const sectorObj = sectors.find((s) => s.sct_id === selectedSector);
      const districtObj = districts.find((d) => d.dst_id === selectedDistrict);
      const cityName = provinceIsKigali
         ? sectorObj?.sct_name || ""
         : districtObj?.dst_name || "";
      const derivedDisplayName = sectorObj
         ? `${sectorObj.sct_name} address`
         : "Address";

      const normalizedPhone = normalizePhone(phoneInput || "");

      // Call the onUseDirectly callback with address data (no DB save)
      if (onUseDirectly) {
         onUseDirectly({
            display_name: derivedDisplayName,
            street: cityName,
            house_number: houseNumber,
            phone: normalizedPhone,
            city: cityName,
            // Include location IDs for potential later use
            _temp: {
               selectedProvince,
               selectedDistrict,
               selectedSector,
            },
         });
      }

      setAddNewOpen(false);
      setAddressOpen(true);
      setEditingAddressId(null);
      setHouseNumber("");
      setPhoneInput("");
   };

   const saveClicked = async () => {
      if (isSavingAddress) return;
      const selectedProvinceObj = provinces.find(
         (p: any) => String(p.prv_id) === String(selectedProvince)
      );
      const provinceIsKigali = Boolean(
         selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali")
      );

      if (provinceIsKigali && !selectedSector) {
         toast.error("Please select a sector for delivery");
         return;
      }

      setIsSavingAddress(true);

      // simple phone validation (copied behavior)
      try {
         const cleaned = phoneInput?.replace(/[^\d+]/g, "") || "";
         if (!/^\+250\d{9}$/.test(cleaned) && !/^07\d{8}$/.test(cleaned)) {
            throw new Error(t("checkout.errors.validPhone") || "Invalid phone");
         }
      } catch (ve: any) {
         const first = ve?.message || t("checkout.errors.validPhone");
         setErrors((prev: any) => ({ ...prev, phone: first }));
         toast.error(String(first));
         setIsSavingAddress(false);
         return;
      }

      const sectorObj = sectors.find((s) => s.sct_id === selectedSector);
      const districtObj = districts.find((d) => d.dst_id === selectedDistrict);
      const cityName = provinceIsKigali
         ? sectorObj?.sct_name || ""
         : districtObj?.dst_name || "";
      const derivedDisplayName = sectorObj
         ? `${sectorObj.sct_name} address`
         : "Address";

      try {
         const normalizedPhone = normalizePhone(phoneInput || "");

         if (editingAddressId) {
            const updated = await updateAddress(editingAddressId, {
               display_name: derivedDisplayName,
               street: cityName,
               house_number: houseNumber,
               phone: normalizedPhone,
               city: cityName,
            });
            if (updated) toast.success(t("checkout.updatedSuccess"));
            else toast.error(t("checkout.updateFailed"));
         } else {
            const saved = await saveAddress({
               display_name: derivedDisplayName,
               lat: "0",
               lon: "0",
               address: { city: cityName },
               street: cityName,
               house_number: houseNumber,
               phone: normalizedPhone,
               is_default: false,
            });
            if (saved) toast.success(t("checkout.savedSuccess"));
            else toast.error(t("checkout.saveFailed"));
         }

         await reloadSaved();
         setAddNewOpen(false);
         setAddressOpen(true);
         setEditingAddressId(null);
         setHouseNumber("");
         setPhoneInput("");
      } catch (err) {
         console.error(err);
         toast.error(t("checkout.saveFailed"));
      } finally {
         setIsSavingAddress(false);
      }
   };

   return (
      <div className="border border-orange-200 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-25 space-y-3 sm:space-y-4">
         <div className="text-xs sm:text-sm font-medium text-orange-800">
            {t("checkout.addNewAddress")}
         </div>

         <div className="space-y-2 sm:space-y-3">
            <div>
               <Label className="text-xs sm:text-sm font-medium text-gray-700">
                  Province <span className="text-red-500">*</span>
               </Label>
               <Select
                  value={selectedProvince ?? ""}
                  onValueChange={(v) => setSelectedProvince(v || null)}
               >
                  <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                     <SelectValue
                        placeholder={t("checkout.selectProvincePlaceholder")}
                     />
                  </SelectTrigger>
                  <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                     {provinces.map((p: any) => (
                        <SelectItem
                           key={p.prv_id}
                           value={String(p.prv_id)}
                           className="text-xs sm:text-sm"
                        >
                           {p.prv_name || p.prv_code || String(p.prv_id)}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

            {selectedProvince && (
               <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                     District <span className="text-red-500">*</span>
                  </Label>
                  <Select
                     value={selectedDistrict ?? ""}
                     onValueChange={(v) => setSelectedDistrict(v || null)}
                  >
                     <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                        <SelectValue
                           placeholder={t("checkout.selectDistrictPlaceholder")}
                        />
                     </SelectTrigger>
                     <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                        {districts
                           .filter(
                              (d: any) => d.dst_province === selectedProvince
                           )
                           .map((d: any) => (
                              <SelectItem
                                 key={d.dst_id}
                                 value={String(d.dst_id)}
                                 className="text-xs sm:text-sm"
                              >
                                 {d.dst_name}
                              </SelectItem>
                           ))}
                     </SelectContent>
                  </Select>
               </div>
            )}

            {selectedDistrict &&
               (() => {
                  const selectedProvinceObj = provinces.find(
                     (p: any) => String(p.prv_id) === String(selectedProvince)
                  );
                  const provinceIsKigali = Boolean(
                     selectedProvinceObj?.prv_name
                        ?.toLowerCase()
                        .includes("kigali")
                  );
                  if (!provinceIsKigali) return null;
                  return (
                     <div>
                        <Label className="text-xs sm:text-sm font-medium text-gray-700">
                           Sector <span className="text-red-500">*</span>
                        </Label>
                        <Select
                           value={selectedSector ?? ""}
                           onValueChange={(v) => setSelectedSector(v || null)}
                        >
                           <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                              <SelectValue
                                 placeholder={t(
                                    "checkout.selectSectorPlaceholder"
                                 )}
                              />
                           </SelectTrigger>
                           <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                              {sectors
                                 .filter(
                                    (s: any) =>
                                       s.sct_district === selectedDistrict
                                 )
                                 .map((s: any) => (
                                    <SelectItem
                                       key={s.sct_id}
                                       value={String(s.sct_id)}
                                       className="text-xs sm:text-sm"
                                    >
                                       {s.sct_name}
                                    </SelectItem>
                                 ))}
                           </SelectContent>
                        </Select>
                     </div>
                  );
               })()}
         </div>

         <div className="pt-1 sm:pt-2 space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm font-medium text-gray-700">
               {t("checkout.otherInfo")}
            </div>

            <div>
               <Label className="text-xs sm:text-sm font-medium text-gray-700">
                  {t("checkout.houseStreet")}
               </Label>
               <Input
                  placeholder={t("checkout.houseStreetPlaceholder")}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10"
               />
            </div>

            <div>
               <Label className="text-xs sm:text-sm font-medium text-gray-700">
                  {t("checkout.phone")} <span className="text-red-500">*</span>
               </Label>
               <div className="relative">
                  <Input
                     placeholder="07X XXX XXX or +250 XXX XXX XXX"
                     value={phoneInput}
                     onChange={handlePhoneChange}
                     className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10 ${
                        errors?.phone
                           ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                           : ""
                     }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                     {phoneInput.startsWith("+250")
                        ? "RW"
                        : phoneInput.startsWith("07")
                        ? "RW"
                        : ""}
                  </div>
               </div>
               {errors?.phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
               )}
               <p className="text-xs text-gray-500 mt-1">
                  Format: +250 XXX XXX XXX or 07X XXX XXX
               </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-1 sm:pt-2">
               {/* Show "Use This Address" button for checkout without saving, or "Save" for normal flow */}
               {onUseDirectly ? (
                  <>
                     <Button
                        onClick={useDirectlyClicked}
                        disabled={isSavingAddress}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm h-9 sm:h-10"
                     >
                        {t("checkout.useThisAddress") || "Use This Address"}
                     </Button>
                     {isLoggedIn && (
                        <Button
                           onClick={saveClicked}
                           disabled={isSavingAddress}
                           variant="outline"
                           className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 sm:h-10"
                        >
                           {isSavingAddress ? (
                              <>
                                 <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                 {t("common.saving") || "Saving..."}
                              </>
                           ) : (
                              t("checkout.saveForLater") || "Save for Later"
                           )}
                        </Button>
                     )}
                  </>
               ) : (
                  <Button
                     onClick={saveClicked}
                     disabled={isSavingAddress}
                     className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm h-9 sm:h-10"
                  >
                     {isSavingAddress ? (
                        <>
                           <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                           {t("common.saving") || "Saving..."}
                        </>
                     ) : (
                        t("common.save")
                     )}
                  </Button>
               )}
               <Button
                  variant="outline"
                  onClick={() => {
                     setEditingAddressId(null);
                     setHouseNumber("");
                     setPhoneInput("");
                     setAddNewOpen(false);
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10"
               >
                  {t("common.cancel")}
               </Button>
            </div>
         </div>
      </div>
   );
}
