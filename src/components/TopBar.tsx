"use client";
import { profilePlaceholder } from "@/assets";
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
import { useMediaQuery } from "@/hooks/user-media-query";
import { cn } from "@/lib/utils";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { Bell, LogOut, Menu, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next13-progressbar";
import { FC } from "react";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { DropdownMenu } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { UserAvatarProfile } from "./user-avatar-profile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLogout } from "@/hooks/useLogout";
import NotificationsBell from "@/components/NotificationsBell";

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

const TopBar: FC<TopBarProps> = (props) => {
   const router = useRouter();
   const { className, variant } = props;
   const { user, roles, signOut, isLoggedIn } = useAuth();
   const { handleLogout } = useLogout();

   const fullName = user?.user_metadata?.full_name || user?.email || "User";
   const role = roles.has("admin") ? "Admin" : "User";
   const imageUrl = user?.user_metadata?.avatar_url || "";

   return (
      <div
         className={cn(
            "w-full py-3 px-3 lg:px-10 flex items-center justify-between border-b border-b-brand-border bg-white",
            { "bg-surface-secondary": variant === "secondary" },
            className
         )}
      >
         <Sheet>
            <SheetTrigger asChild>
               <Button
                  variant={"ghost"}
                  className="lg:hidden px-0 mr-4"
               >
                  <Menu />
               </Button>
            </SheetTrigger>
            <SheetContent
               side={"left"}
               className="lg:hidden pt-3 pb-6 pr-6 pl-0"
            >
               <SheetTitle className="sr-only">Edit profile</SheetTitle>
               <Sidebar />
            </SheetContent>
         </Sheet>
         {variant === "primary" && (
            <h3 className="font-bold text-3xl w-full hidden md:block">
               {props.title}
            </h3>
         )}
         <div
            className={cn("flex items-center justify-between gap-3 lg:gap-6", {
               "w-full": variant === "secondary",
            })}
         >
            <div className="relative">
               <Input
                  className="peer ps-10 border-none shadow-none h-12 md:min-w-80 md:text-base bg-surface-secondary rounded-full px-4"
                  placeholder="Search product, customer, etc..."
                  type="search"
               />
               <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <SearchIcon
                     size={20}
                     className="text-black"
                  />
               </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               <NotificationsBell />

               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        className="relative px-0"
                     >
                        <UserAvatarProfile
                           user={{
                              subTitle: role,
                              fullName,
                              imageUrl,
                           }}
                           showInfo={useMediaQuery("(min-width: 768px)")}
                        />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     className="w-56"
                     align="end"
                     sideOffset={10}
                     forceMount
                  >
                     <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                           <p className="text-sm leading-none font-medium">
                              {fullName}
                           </p>
                           <p className="text-zinc-400 text-xs leading-none">
                              {role}
                           </p>
                        </div>
                     </DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuGroup>
                        <DropdownMenuItem
                           onClick={() => router.push("/admin/settings")}
                        >
                           Settings
                        </DropdownMenuItem>
                     </DropdownMenuGroup>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={handleLogout}>
                        <LogOut
                           size={20}
                           strokeWidth={2}
                           className="opacity-60 mr-2"
                           aria-hidden="true"
                        />{" "}
                        Logout
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>
      </div>
   );
};

export default TopBar;
