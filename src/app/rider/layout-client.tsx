"use client";

import RiderSidebar from "@/components/RiderSidebar";
import RiderTopBar from "@/components/RiderTopBar";
import { ReactNode, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface LayoutProps {
   children: ReactNode;
}

export default function RiderLayoutClient({ children }: LayoutProps) {
   const [sidebarOpen, setSidebarOpen] = useState(false);

   return (
      <div className="w-full h-screen overflow-hidden flex bg-white">
         <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-80">
               <RiderSidebar onLinkClick={() => setSidebarOpen(false)} />
            </SheetContent>
         </Sheet>

         <div className="w-80 border-r bg-surface-secondary border-border-primary h-full hidden lg:block">
            <RiderSidebar />
         </div>

         <div className="w-full flex flex-col">
            <RiderTopBar
               variant="primary"
               title="Rider Dashboard"
            />
            <div className="flex-1 overflow-auto">
               {children}
            </div>
         </div>
      </div>
   );
}