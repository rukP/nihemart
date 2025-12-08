"use client";

import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ChevronRight, Upload } from "lucide-react";

// Profile form schema
const ProfileSchema = z.object({
   firstName: z.string().min(1, "First name is required"),
   lastName: z.string().min(1, "Last name is required"),
   email: z.string().email("Invalid email address"),
   phoneNumber: z.string().min(1, "Phone number is required"),
   address: z.string().min(1, "Address is required"),
   town: z.string().min(1, "Town is required"),
   stateProvince: z.string().min(1, "State/Province is required"),
});

type TProfileSchema = z.infer<typeof ProfileSchema>;

interface ProfileSettingProps {}

const ProfileSetting: FC<ProfileSettingProps> = ({}) => {
   const [selectedImage, setSelectedImage] = useState<string | null>(null);

   const form = useForm<TProfileSchema>({
      resolver: zodResolver(ProfileSchema),
      defaultValues: {
         firstName: "Kevin",
         lastName: "MUNYENTWALI",
         email: "kevin@nihemart.com",
         phoneNumber: "+250788499343",
         address: "KG 250 ST",
         town: "Kigali",
         stateProvince: "Kigali City",
      },
   });

   const onSubmit = async (data: TProfileSchema) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Profile Updated:", data);
   };

   const handleDiscard = () => {
      form.reset();
   };

   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
         };
         reader.readAsDataURL(file);
      }
   };

   return (
      <div className="mx-auto p-6 overflow-y-scroll">
         {/* Header */}
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
               Profile Setting
            </h1>
            <p className="text-gray-500">
               Track orders list across your store.
            </p>
         </div>

         {/* Account Section */}
         <div className="flex gap-6 w-full flex-col lg:flex-row">
            <div className="mb-8 lg:w-[20%]">
               <div className="flex items-center justify-between p-2 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-orange-600" />
                     </div>
                     <span className="font-medium text-orange-700">
                        Account
                     </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-600" />
               </div>
            </div>

            {/* Profile Form */}
            <div className="flex-1">
               <Form {...form}>
                  <form
                     onSubmit={form.handleSubmit(onSubmit)}
                     className="space-y-6"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 lg:p-6 rounded-xl">
                        {/* First Name */}
                        <FormField
                           control={form.control}
                           name="firstName"
                           render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-gray-600 font-medium">
                                    First Name
                                 </FormLabel>
                                 <FormControl>
                                    <Input
                                       {...field}
                                       className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                    />
                                 </FormControl>
                                 <FormMessage />
                              </FormItem>
                           )}
                        />

                        {/* Last Name */}
                        <FormField
                           control={form.control}
                           name="lastName"
                           render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-gray-600 font-medium">
                                    Last Name
                                 </FormLabel>
                                 <FormControl>
                                    <Input
                                       {...field}
                                       className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                    />
                                 </FormControl>
                                 <FormMessage />
                              </FormItem>
                           )}
                        />

                        <FormField
                           control={form.control}
                           name="email"
                           render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-gray-600 font-medium">
                                    Email
                                 </FormLabel>
                                 <FormControl>
                                    <Input
                                       {...field}
                                       type="email"
                                       className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                    />
                                 </FormControl>
                                 <FormMessage />
                              </FormItem>
                           )}
                        />

                        {/* Phone Number */}
                        <FormField
                           control={form.control}
                           name="phoneNumber"
                           render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-gray-600 font-medium">
                                    Phone Number
                                 </FormLabel>
                                 <FormControl>
                                    <div className="flex">
                                       <Select defaultValue="+250">
                                          <SelectTrigger className="w-20 h-12 rounded-l-xl border-r-0 border-gray-300">
                                             <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                             <SelectItem value="+250">
                                                🇷🇼
                                             </SelectItem>
                                             <SelectItem value="+1">
                                                🇺🇸
                                             </SelectItem>
                                             <SelectItem value="+44">
                                                🇬🇧
                                             </SelectItem>
                                          </SelectContent>
                                       </Select>
                                       <Input
                                          {...field}
                                          value={field.value.replace(
                                             "+250",
                                             ""
                                          )}
                                          onChange={(e) =>
                                             field.onChange(
                                                "+250" + e.target.value
                                             )
                                          }
                                          className="h-12 rounded-r-xl rounded-l-none border-l-0 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                       />
                                    </div>
                                 </FormControl>
                                 <FormMessage />
                              </FormItem>
                           )}
                        />
                     </div>

                     <div className="border p-4 rounded-xl lg:p-6">
                        {/* Address */}
                        <FormField
                           control={form.control}
                           name="address"
                           render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-gray-600 font-medium">
                                    Address
                                 </FormLabel>
                                 <FormControl>
                                    <Input
                                       {...field}
                                       className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                    />
                                 </FormControl>
                                 <FormMessage />
                              </FormItem>
                           )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Town */}
                           <FormField
                              control={form.control}
                              name="town"
                              render={({ field }) => (
                                 <FormItem>
                                    <FormLabel className="text-gray-600 font-medium">
                                       Town
                                    </FormLabel>
                                    <FormControl>
                                       <Input
                                          {...field}
                                          className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                       />
                                    </FormControl>
                                    <FormMessage />
                                 </FormItem>
                              )}
                           />

                           {/* State/Province */}
                           <FormField
                              control={form.control}
                              name="stateProvince"
                              render={({ field }) => (
                                 <FormItem>
                                    <FormLabel className="text-gray-600 font-medium">
                                       State/Province
                                    </FormLabel>
                                    <FormControl>
                                       <Input
                                          {...field}
                                          className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                       />
                                    </FormControl>
                                    <FormMessage />
                                 </FormItem>
                              )}
                           />
                        </div>
                     </div>
                     {/* Action Buttons */}
                     <div className="flex justify-end gap-4 pt-6">
                        <Button
                           type="button"
                           variant="outline"
                           onClick={handleDiscard}
                           className="px-8 h-12 rounded-xl border-gray-300 text-gray-600 hover:bg-gray-50"
                           disabled={form.formState.isSubmitting}
                        >
                           Discard
                        </Button>
                        <Button
                           type="submit"
                           className="px-8 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                           disabled={form.formState.isSubmitting}
                        >
                           {form.formState.isSubmitting
                              ? "Saving..."
                              : "Save Changes"}
                        </Button>
                     </div>
                  </form>
               </Form>
            </div>
         </div>
      </div>
   );
};

export default ProfileSetting;
