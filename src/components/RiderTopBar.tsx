"use client";
import {
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   Sheet,
   SheetContent,
   SheetTitle,
   SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { LogOut, Menu, Settings, User } from "lucide-react";
import { useRouter } from "next13-progressbar";
import { useEffect, useState } from "react";
import { useRiderAssignments, useRiderByUserId } from "@/hooks/useRiders";
import RiderNotificationsBell from "@/components/RiderNotificationsBell";
import { FC } from "react";
import RiderSidebar from "./RiderSidebar";
import { Button } from "./ui/button";
import { DropdownMenu } from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type TopBarProps = {
   className?: string;
} & (
   | {
        variant: "primary";
        title: string;
     }
   | {
        variant: "secondary";
     }
);

const RiderTopBar: FC<TopBarProps> = (props) => {
   const router = useRouter();
   const { className, variant } = props;
   const { signOut, user } = useAuth();
   const { t, language, setLanguage } = useLanguage();
   const [sheetOpen, setSheetOpen] = useState(false); // Add state for Sheet

   const handleLogout = async () => {
      await signOut();
      toast.success("Logged out successfully");
   };

   // Use central rider query so UI updates when rider profile is updated elsewhere
   const { data: rider } = useRiderByUserId(user?.id);
   const { data: assignments = [] } = useRiderAssignments(rider?.id);

   // Get user initials for avatar
   const getUserInitials = () => {
      const name = rider?.fullName || user?.email || "R";
      if (rider?.fullName) {
         return name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
      }
      return name[0].toUpperCase();
   };

   const getUserDisplayName = () => {
      return rider?.fullName || user?.email?.split("@")[0] || "Rider";
   };

   return (
      <div
         className={cn(
            "w-full py-4 px-4 lg:px-8 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm",
            { "bg-gray-50": variant === "secondary" },
            className
         )}
      >
         <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
               <Button
                  variant={"ghost"}
                  className="lg:hidden px-2 mr-4 hover:bg-gray-100"
               >
                  <Menu className="w-5 h-5" />
               </Button>
            </SheetTrigger>
            <SheetContent
               side={"left"}
               className="lg:hidden pt-3 pb-6 pr-6 pl-0"
            >
               <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
               <RiderSidebar onLinkClick={() => setSheetOpen(false)} />
            </SheetContent>
         </Sheet>

         <div className="flex gap-6 items-center">
            {variant === "primary" && (
               <h3 className="font-bold text-2xl lg:text-3xl text-gray-900 hidden md:block">
                  {props.title}
               </h3>
            )}
            <Badge
               className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full font-medium text-sm transition-all duration-200",
                  rider?.active
                     ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                     : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
               )}
            >
               <div
                  className={cn(
                     "h-2 w-2 rounded-full",
                     rider?.active ? "bg-green-500" : "bg-red-500"
                  )}
               ></div>
               {rider?.active
                  ? t("rider.activeLabel")
                  : t("rider.unavailableLabel")}
            </Badge>
         </div>

         <div
            className={cn("flex items-center justify-between gap-4 lg:gap-6", {
               "w-full": variant === "secondary",
            })}
         >
            <div className="flex items-center gap-4">
               <RiderNotificationsBell />

               {/* Language selector */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        className="px-2 py-1 rounded-md"
                     >
                        {t(`language.short.${language}`)}
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="end"
                     sideOffset={8}
                     forceMount
                  >
                     <DropdownMenuLabel className="text-sm">
                        {t("common.language")}
                     </DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => setLanguage("rw")}
                        className="cursor-pointer"
                     >
                        {t("language.rw")}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => setLanguage("en")}
                        className="cursor-pointer"
                     >
                        {t("language.en")}
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>

            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button
                     variant="ghost"
                     className="relative p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                     <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold text-sm">
                           {getUserInitials()}
                        </AvatarFallback>
                     </Avatar>
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent
                  className="w-64"
                  align="end"
                  sideOffset={10}
                  forceMount
               >
                  <DropdownMenuLabel className="p-3">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                           <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                              {getUserInitials()}
                           </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                           <p className="text-sm font-medium text-gray-900">
                              {getUserDisplayName()}
                           </p>
                           <p className="text-xs text-gray-500">
                              {user?.email}
                           </p>
                        </div>
                     </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                     <DropdownMenuItem
                        onClick={() => router.push("/rider/settings")}
                        className="cursor-pointer hover:bg-gray-50"
                     >
                        <Settings className="mr-3 h-4 w-4" />
                        {t("admin.settings")}
                     </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                     onClick={handleLogout}
                     className="cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-600"
                  >
                     <LogOut className="mr-3 h-4 w-4" />
                     {t("nav.logout")}
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
      </div>
   );
};

export default RiderTopBar;