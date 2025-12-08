"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRiderByUserId } from "@/hooks/useRiders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
import { useUpdateRider } from "@/hooks/useRiders";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Removed image usage; using initials avatar instead
import {
   User,
   Phone,
   Car,
   Power,
   Settings as SettingsIcon,
   XCircle,
} from "lucide-react";
import { UserAvatarProfile } from "@/components/user-avatar-profile";

function LanguageSelector() {
   const { language, setLanguage, t } = useLanguage();

   return (
      <Select
         value={language}
         onValueChange={(v) => setLanguage(v as any)}
      >
         <SelectTrigger className="w-full h-11">
            <SelectValue />
         </SelectTrigger>
         <SelectContent>
            <SelectItem value="rw">{t("language.short.rw")}</SelectItem>
            <SelectItem value="en">{t("language.short.en")}</SelectItem>
         </SelectContent>
      </Select>
   );
}

export default function RiderSettingsPage() {
   const { user } = useAuth();
   // Editing is revoked for riders: make this page view-only
   const [saving, setSaving] = useState(false);
   const { data: rider, isLoading: loading } = useRiderByUserId(user?.id);

   // Local state used only for display; inputs are disabled
   const [fullName] = React.useState("");
   const [phone] = React.useState("");
   const [vehicle] = React.useState("");
   const [active, setActive] = React.useState<boolean>(false);

   const getInitials = (nameOrEmail: string) => {
      if (!nameOrEmail) return "R";
      const base = nameOrEmail.includes("@")
         ? nameOrEmail.split("@")[0].replace(/[._-]+/g, " ")
         : nameOrEmail;
      const parts = base.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "R";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
   };

   // Initialize local form state from shared rider query
   useEffect(() => {
      if (!rider) return;
      // initialize display-only state
      // note: fullName/phone/vehicle are pulled directly from rider when rendering
      setActive(!!rider?.active);
   }, [rider]);

   const updateRider = useUpdateRider();

   if (!user) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full shadow-lg">
               <CardContent>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <User className="w-8 h-8 text-orange-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     Please Sign In
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     You need to sign in to access your settings.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="text-center">
               <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
               <p className="text-gray-600">Loading your settings...</p>
            </div>
         </div>
      );
   }

   if (!rider) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full shadow-lg">
               <CardContent>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     No Profile Found
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     No rider profile found for your account.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   // Read-only page: no save/reset functionality

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
         <div className="mx-auto p-3 sm:p-4 md:p-6 ">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                     <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>

                  {/* Language preference */}
                  <div className="space-y-2">
                     <Label className="text-sm font-medium text-gray-700">
                        Preferred Language
                     </Label>
                     <LanguageSelector />
                  </div>
                  <div>
                     <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Rider Settings
                     </h1>
                     <p className="text-xs sm:text-sm text-gray-600">
                        Manage your profile and preferences
                     </p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Profile Status Card */}
               <div className="lg:col-span-1">
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 sticky top-6">
                     <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                           Profile Status
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="flex items-start gap-4">
                           <div className="relative flex-shrink-0">
                              <div className="w-16 h-16 rounded-xl shadow-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center overflow-hidden">
                                 <UserAvatarProfile
                                    className="w-16 h-16"
                                    user={{
                                       fullName:
                                          rider?.full_name ||
                                          user?.email ||
                                          "Rider",
                                       subTitle: rider?.location || "",
                                       imageUrl: rider?.image_url || "",
                                    }}
                                 />
                              </div>
                              <div
                                 className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                                    active ? "bg-green-500" : "bg-red-500"
                                 }`}
                              ></div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900 truncate">
                                 {rider?.full_name || user?.email || "Rider"}
                              </h3>
                              <p className="text-gray-500 text-sm truncate">
                                 ID: #{rider.id.slice(0, 8)}
                              </p>
                              <Badge
                                 className={`mt-2 text-xs ${
                                    active
                                       ? "bg-green-100 text-green-700 hover:bg-green-100"
                                       : "bg-red-100 text-red-700 hover:bg-red-100"
                                 }`}
                              >
                                 {active ? "Active" : "Inactive"}
                              </Badge>
                           </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                           <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">
                                 Email
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                 {user?.email}
                              </p>
                           </div>
                           <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">
                                 Location
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                 {rider?.location || "Not set"}
                              </p>
                           </div>
                           <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">
                                 Vehicle Type
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                 {rider?.vehicle || "Not set"}
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>

               {/* Settings Form */}
               <div className="lg:col-span-2">
                  <Card className="border-0 shadow-lg">
                     <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                           Profile Information
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              Full Name
                           </Label>
                           <Input
                              value={rider?.full_name || ""}
                              placeholder="Full name"
                              disabled
                              className="h-11 focus-visible:ring-orange-500"
                           />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              Phone Number
                           </Label>
                           <Input
                              value={rider?.phone || ""}
                              placeholder="Phone number"
                              disabled
                              type="tel"
                              className="h-11 focus-visible:ring-orange-500"
                           />
                        </div>

                        {/* Vehicle */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Car className="w-4 h-4 text-gray-500" />
                              Vehicle Type
                           </Label>
                           <Select
                              value={rider?.vehicle || ""}
                              onValueChange={() => {}}
                           >
                              <SelectTrigger className="w-full h-11 focus:ring-orange-500">
                                 <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="Bike">Bike</SelectItem>
                                 <SelectItem value="Car">Car</SelectItem>
                                 <SelectItem value="Motorbike">
                                    Motorbike
                                 </SelectItem>
                                 <SelectItem value="Bicycle">
                                    Bicycle
                                 </SelectItem>
                                 <SelectItem value="Van">Van</SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        {/* Availability Toggle */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-5 border border-gray-200">
                           <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                 <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Power className="w-5 h-5 text-orange-500" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                       Available for Assignments
                                    </p>
                                    <p className="text-xs text-gray-600">
                                       Toggle your availability to receive new
                                       delivery assignments
                                    </p>
                                 </div>
                              </div>
                              <div className="flex-shrink-0">
                                 {/* Availability toggle: rider may change their availability */}
                                 <Switch
                                    checked={!!rider?.active}
                                    onCheckedChange={async (v) => {
                                       if (!rider) return;
                                       try {
                                          setSaving(true);
                                          await updateRider.mutateAsync({
                                             riderId: rider.id,
                                             updates: { active: !!v },
                                          });
                                          toast.success(
                                             v
                                                ? "You are now available"
                                                : "You are now unavailable"
                                          );
                                       } catch (err: any) {
                                          console.error(err);
                                          toast.error(
                                             err?.message ||
                                                "Failed to update availability"
                                          );
                                       } finally {
                                          setSaving(false);
                                       }
                                    }}
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Editing is disabled for riders. Show informational notice. */}
                        <div className="pt-4">
                           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                              <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                 <svg
                                    className="w-2 h-2 text-yellow-700"
                                    viewBox="0 0 8 8"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                 >
                                    <path
                                       d="M4 0a4 4 0 100 8A4 4 0 004 0z"
                                       fill="currentColor"
                                    />
                                 </svg>
                              </div>
                              <p className="text-xs text-yellow-700">
                                 Editing has been disabled for riders. If you
                                 need to update your profile, please contact
                                 support or an admin.
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      </div>
   );
}
