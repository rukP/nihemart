"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAddresses } from "@/hooks/useAddresses";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
   MapPin,
   Plus,
   Edit3,
   Trash2,
   Star,
   StarIcon,
   ChevronDown,
   ChevronRight,
   Loader2,
   ArrowLeft,
   Phone,
   Home,
   CheckCircle2,
} from "lucide-react";
import { z } from "zod";

// Import location data (same as checkout)
import provincesJson from "@/lib/data/provinces.json";
import districtsJson from "@/lib/data/districts.json";
import sectorsJson from "@/lib/data/sectors.json";
import sectorsFees from "@/lib/data/sectors_fees.json";

const AddressesPage = () => {
   const { user, isLoggedIn } = useAuth();
   const router = useRouter();
   const {
      addresses: savedAddresses,
      saved,
      selected,
      selectAddress,
      saveAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      refresh,
   } = useAddresses();

   // Form state
   const [editingId, setEditingId] = useState<string | null>(null);
   const [displayName, setDisplayName] = useState("");
   const [city, setCity] = useState("");
   const [phoneInput, setPhoneInput] = useState("");
   const [street, setStreet] = useState("");
   const [houseNumber, setHouseNumber] = useState("");
   const [isSaving, setIsSaving] = useState(false);
   const [isDeleting, setIsDeleting] = useState<string | null>(null);
   const [showAddForm, setShowAddForm] = useState(false);

   // Location data state
   const [provinces, setProvinces] = useState<any[]>([]);
   const [districts, setDistricts] = useState<any[]>([]);
   const [sectors, setSectors] = useState<any[]>([]);

   // Selected location ids
   const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
   const [selectedSector, setSelectedSector] = useState<string | null>(null);

   const [errors, setErrors] = useState<any>({});

   // Enhanced phone validation for Rwanda (same as checkout)
   const phoneSchema = z.object({
      phone: z
         .string()
         .nonempty({ message: "Phone is required" })
         .refine(
            (val) => {
               const cleaned = val.replace(/[^\d+]/g, "");
               if (/^\+250\d{9}$/.test(cleaned)) return true;
               if (/^07\d{8}$/.test(cleaned)) return true;
               return false;
            },
            { message: "Phone must be in format +250XXXXXXXXX or 07XXXXXXXX" }
         ),
   });

   // Enhanced phone formatting function (same as checkout)
   const formatPhoneInput = (input: string) => {
      const cleaned = input.replace(/[^\d+]/g, "");
      
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.slice(4);
         if (digits.length <= 3) return `+250 ${digits}`;
         if (digits.length <= 6) return `+250 ${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `+250 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
      }
      
      if (cleaned.startsWith("07")) {
         const digits = cleaned;
         if (digits.length <= 3) return digits;
         if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
      }
      
      return cleaned;
   };

   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);
      
      if (formatted.startsWith("+250")) {
         if (formatted.replace(/[^\d]/g, "").length <= 12) {
            setPhoneInput(formatted);
         }
      } else if (formatted.startsWith("07")) {
         if (formatted.replace(/[^\d]/g, "").length <= 10) {
            setPhoneInput(formatted);
         }
      } else {
         if (input.length <= 15) {
            setPhoneInput(formatted);
         }
      }
      
      if (errors?.phone) {
         setErrors((prev: any) => ({ ...prev, phone: undefined }));
      }
   };

   // Normalize phone to E.164 format (same as checkout)
   const normalizePhone = (raw: string) => {
      if (!raw) return raw;
      const digits = raw.replace(/[^\d]/g, "");
      
      if (digits.length === 10 && digits.startsWith("07")) {
         return `+250${digits.slice(1)}`;
      }
      
      if (digits.length === 12 && digits.startsWith("250")) {
         return `+${digits}`;
      }
      
      if (raw.startsWith("+250")) {
         return raw.replace(/[^\d+]/g, "");
      }
      
      return raw;
   };

   // Load location data from JSON imports (same as checkout)
   useEffect(() => {
      try {
         const extract = (j: any, namePart: string) => {
            if (!j) return [];
            if (Array.isArray(j)) {
               const table = j.find((x) => x.type === "table" && x.name?.includes(namePart));
               return table?.data || [];
            }
            if (j.type === "table" && j.data) return j.data;
            return [];
         };

         setProvinces(extract(provincesJson, "1_provinces"));
         setDistricts(extract(districtsJson, "2_districts"));
         setSectors(extract(sectorsJson, "3_sectors"));
      } catch (err) {
         console.error("Failed to load location data:", err);
      }
   }, []);

   // Update dependent lists when selections change
   useEffect(() => {
      if (!selectedProvince) return;
      setSelectedDistrict(null);
      setSelectedSector(null);
   }, [selectedProvince]);

   useEffect(() => {
      if (!selectedDistrict) return;
      setSelectedSector(null);
   }, [selectedDistrict]);

   useEffect(() => {
      if (!isLoggedIn) return;
      refresh && refresh();
   }, [isLoggedIn, refresh]);

   const getProvinceLabel = (p: any) => {
      const raw = String(p?.prv_name || "").toLowerCase();
      if (raw.includes("kigali")) return "Kigali";
      if (raw.includes("south")) return "Southern Province";
      if (raw.includes("north")) return "Northern Province";
      if (raw.includes("east")) return "Eastern Province";
      if (raw.includes("west")) return "Western Province";
      return p?.prv_name || "Province";
   };

   const resetForm = () => {
      setEditingId(null);
      setDisplayName("");
      setCity("");
      setPhoneInput("");
      setStreet("");
      setHouseNumber("");
      setSelectedProvince(null);
      setSelectedDistrict(null);
      setSelectedSector(null);
      setErrors({});
   };

   const startEdit = (id: string) => {
      const found = (saved || []).find((a: any) => a.id === id);
      if (!found) return;
      
      setEditingId(id);
      setDisplayName(found.display_name || "");
      setCity(found.city || "");
      setPhoneInput(found.phone || "");
      setStreet(found.street || "");
      setHouseNumber(found.house_number || "");
      
      // Try to match location selections based on saved data
      const foundSector = sectors.find(
         (s) => s.sct_name === found.street || s.sct_name === found.city
      );
      if (foundSector) {
         setSelectedSector(foundSector.sct_id);
         setSelectedDistrict(foundSector.sct_district);
         const foundDistrict = districts.find((d) => d.dst_id === foundSector.sct_district);
         if (foundDistrict) setSelectedProvince(foundDistrict.dst_province);
      }
      
      setShowAddForm(true);
   };

   const handleSave = async () => {
      if (isSaving) return;
      
      // Validate phone
      try {
         phoneSchema.parse({ phone: phoneInput });
      } catch (ve: any) {
         const first = ve?.errors?.[0]?.message || "Please enter a valid phone number";
         setErrors((prev: any) => ({ ...prev, phone: first }));
         toast.error(String(first));
         return;
      }

      // Validate required fields
      if (!selectedProvince || !selectedDistrict) {
         toast.error("Please select province and district");
         return;
      }

      const selectedProvinceObj = provinces.find((p: any) => String(p.prv_id) === String(selectedProvince));
      const provinceIsKigali = Boolean(selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali"));

      if (provinceIsKigali && !selectedSector) {
         toast.error("Please select a sector for Kigali addresses");
         return;
      }

      setIsSaving(true);
      
      try {
         const sectorObj = sectors.find((s) => s.sct_id === selectedSector);
         const districtObj = districts.find((d) => d.dst_id === selectedDistrict);
         const cityName = provinceIsKigali ? sectorObj?.sct_name || "" : districtObj?.dst_name || "";
         const derivedDisplayName = displayName || (sectorObj ? `${sectorObj.sct_name} address` : "Address");
         const normalizedPhone = normalizePhone(phoneInput);

         if (editingId) {
            const res = await updateAddress(editingId, {
               display_name: derivedDisplayName,
               city: cityName,
               phone: normalizedPhone,
               street: street || cityName,
               house_number: houseNumber,
            });
            if (res) {
               toast.success("Address updated successfully");
               resetForm();
               setShowAddForm(false);
            } else {
               toast.error("Failed to update address");
            }
         } else {
            const res = await saveAddress({
               display_name: derivedDisplayName,
               lat: "0",
               lon: "0",
               address: { city: cityName },
               street: street || cityName,
               house_number: houseNumber,
               phone: normalizedPhone,
               is_default: false,
            });
            if (res) {
               toast.success("Address saved successfully");
               resetForm();
               setShowAddForm(false);
            } else {
               toast.error("Failed to save address");
            }
         }
         refresh && refresh();
      } catch (err) {
         toast.error("Save failed");
         console.error(err);
      } finally {
         setIsSaving(false);
      }
   };

   const handleDelete = async (id: string) => {
      if (isDeleting) return;
      
      setIsDeleting(id);
      try {
         const ok = await removeAddress(id);
         if (ok) {
            toast.success("Address removed successfully");
            refresh && refresh();
         } else {
            toast.error("Failed to remove address");
         }
      } catch (err) {
         toast.error("Delete failed");
      } finally {
         setIsDeleting(null);
      }
   };

   const handleSetDefault = async (id: string) => {
      if (setDefaultAddress) {
         const success = await setDefaultAddress(id);
         if (success) {
            toast.success("Default address updated");
            refresh && refresh();
         } else {
            toast.error("Failed to set default address");
         }
      }
   };

   if (!isLoggedIn) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            <div className="text-center py-8 sm:py-12">
               <MapPin className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Please sign in</h2>
               <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-4">
                  You must be signed in to manage addresses.
               </p>
               <Button 
                  onClick={() => router.push('/signin')}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
               >
                  Sign In
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
               <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-1 sm:p-2 hover:bg-gray-100 h-8 w-8 sm:h-10 sm:w-10"
               >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
               </Button>
               <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Your Addresses</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your delivery addresses</p>
               </div>
            </div>
            <Button
               onClick={() => {
                  resetForm();
                  setShowAddForm(true);
               }}
               className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-9 sm:h-10 w-full sm:w-auto"
            >
               <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
               Add New Address
            </Button>
         </div>

         {/* Add/Edit Form */}
         <Collapsible open={showAddForm} onOpenChange={setShowAddForm}>
            <CollapsibleContent>
               <Card className="mb-6 sm:mb-8 border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-6">
                     <CardTitle className="flex items-center text-orange-800 text-lg sm:text-xl">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        {editingId ? "Edit Address" : "Add New Address"}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                     {/* Sequential Location Selects */}
                     <div className="space-y-3 sm:space-y-4">
                        <div>
                           <Label className="text-xs sm:text-sm font-medium text-gray-700">
                              Province <span className="text-red-500">*</span>
                           </Label>
                           <Select
                              value={selectedProvince ?? ""}
                              onValueChange={(v) => setSelectedProvince(v || null)}
                           >
                              <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                                 <SelectValue placeholder="Select a province" />
                              </SelectTrigger>
                              <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                                 {provinces.map((p: any) => (
                                    <SelectItem key={p.prv_id} value={String(p.prv_id)} className="text-xs sm:text-sm">
                                       {getProvinceLabel(p)}
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
                                    <SelectValue placeholder="Select a district" />
                                 </SelectTrigger>
                                 <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                                    {districts
                                       .filter((d: any) => d.dst_province === selectedProvince)
                                       .map((d: any) => (
                                          <SelectItem key={d.dst_id} value={String(d.dst_id)} className="text-xs sm:text-sm">
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
                                 selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali")
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
                                          <SelectValue placeholder="Select a sector" />
                                       </SelectTrigger>
                                       <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                                          {sectors
                                             .filter((s: any) => s.sct_district === selectedDistrict)
                                             .map((s: any) => (
                                                <SelectItem key={s.sct_id} value={String(s.sct_id)} className="text-xs sm:text-sm">
                                                   {s.sct_name}
                                                </SelectItem>
                                             ))}
                                       </SelectContent>
                                    </Select>
                                 </div>
                              );
                           })()}
                     </div>

                     <Separator />

                     {/* Address Details */}
                     <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <div>
                           <Label className="text-xs sm:text-sm font-medium text-gray-700">Display Name</Label>
                           <Input
                              placeholder="e.g. Home, Office, etc."
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10"
                           />
                        </div>

                        <div>
                           <Label className="text-xs sm:text-sm font-medium text-gray-700">House/Street</Label>
                           <Input
                              placeholder="House number, street name"
                              value={houseNumber}
                              onChange={(e) => setHouseNumber(e.target.value)}
                              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10"
                           />
                        </div>

                        <div>
                           <Label className="text-xs sm:text-sm font-medium text-gray-700">
                              Phone <span className="text-red-500">*</span>
                           </Label>
                           <div className="relative">
                              <Input
                                 placeholder="07X XXX XXX or +250 XXX XXX XXX"
                                 value={phoneInput}
                                 onChange={handlePhoneChange}
                                 className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10 ${
                                    errors?.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                                 }`}
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                                 {phoneInput.startsWith("+250") ? "RW" : phoneInput.startsWith("07") ? "RW" : ""}
                              </div>
                           </div>
                           {errors?.phone && (
                              <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                           )}
                           <p className="text-xs text-gray-500 mt-1">
                              Format: +250 XXX XXX XXX or 07X XXX XXX
                           </p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
                        <Button
                           variant="outline"
                           onClick={() => {
                              resetForm();
                              setShowAddForm(false);
                           }}
                           className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10 order-2 sm:order-1"
                        >
                           Cancel
                        </Button>
                        <Button
                           onClick={handleSave}
                           disabled={isSaving}
                           className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm h-9 sm:h-10 order-1 sm:order-2"
                        >
                           {isSaving ? (
                              <>
                                 <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                 {editingId ? "Updating..." : "Saving..."}
                              </>
                           ) : (
                              <>
                                 <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                 {editingId ? "Update Address" : "Save Address"}
                              </>
                           )}
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            </CollapsibleContent>
         </Collapsible>

         {/* Saved Addresses List */}
         <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
               <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Saved Addresses</h2>
               <span className="text-xs sm:text-sm text-gray-500">
                  {(saved || []).length} address{(saved || []).length !== 1 ? 'es' : ''}
               </span>
            </div>

            {(saved || []).length === 0 ? (
               <Card className="text-center py-8 sm:py-12">
                  <CardContent className="p-4 sm:p-6">
                     <Home className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                     <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No addresses saved</h3>
                     <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Add your first address to get started with deliveries.</p>
                     <Button
                        onClick={() => {
                           resetForm();
                           setShowAddForm(true);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-9 sm:h-10"
                     >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Add Your First Address
                     </Button>
                  </CardContent>
               </Card>
            ) : (
               (saved || []).map((addr: any) => (
                  <Card key={addr.id} className="hover:shadow-md transition-shadow overflow-hidden">
                     <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                           <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                 <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                                    {addr.display_name}
                                 </h3>
                                 <div className="flex flex-wrap gap-2">
                                    {addr.is_default && (
                                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                                          <Star className="h-3 w-3 mr-1 fill-current" />
                                          Default
                                       </span>
                                    )}
                                    {selected?.id === addr.id && (
                                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Selected
                                       </span>
                                    )}
                                 </div>
                              </div>
                              <div className="space-y-1 sm:space-y-2">
                                 <p className="text-xs sm:text-sm text-gray-600 flex items-start sm:items-center break-words">
                                    <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-gray-400 mt-0.5 sm:mt-0 flex-shrink-0" />
                                    {[addr.house_number, addr.street, addr.city].filter(Boolean).join(", ") || "Address details"}
                                 </p>
                                 {addr.phone && (
                                    <p className="text-xs sm:text-sm text-gray-600 flex items-center break-words">
                                       <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-gray-400 flex-shrink-0" />
                                       {addr.phone}
                                    </p>
                                 )}
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-col sm:items-end">
                              <div className="flex gap-2 order-2 sm:order-1">
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEdit(addr.id)}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs h-7 sm:h-8 px-2"
                                 >
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Edit
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(addr.id)}
                                    disabled={isDeleting === addr.id}
                                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-7 sm:h-8 px-2"
                                 >
                                    {isDeleting === addr.id ? (
                                       <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                       <Trash2 className="h-3 w-3" />
                                    )}
                                 </Button>
                              </div>
                              <div className="flex gap-2 order-1 sm:order-2">
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                       selectAddress(addr.id);
                                       toast.success("Address selected for checkout");
                                    }}
                                    disabled={selected?.id === addr.id}
                                    className="border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50 text-xs h-7 sm:h-8 px-2 whitespace-nowrap"
                                 >
                                    {selected?.id === addr.id ? "Selected" : "Select"}
                                 </Button>
                                 {!addr.is_default && (
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleSetDefault(addr.id)}
                                       className="border-yellow-300 text-yellow-600 hover:bg-yellow-50 text-xs h-7 sm:h-8 px-2 whitespace-nowrap"
                                    >
                                       <Star className="h-3 w-3 mr-1" />
                                       Set Default
                                    </Button>
                                 )}
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>
      </div>
   );
};

export default AddressesPage;