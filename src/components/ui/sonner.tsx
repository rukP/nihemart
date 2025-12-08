"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertCircle, Bell } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
   const { theme = "system" } = useTheme();

   return (
      <Sonner
         theme={theme as ToasterProps["theme"]}
         className="toaster group"
         toastOptions={{
            classNames: {
               toast: "group toast rounded-xl border-2 border-[#1DA1F2] bg-gradient-to-r from-[#E3F2FD] to-[#F5FBFF] text-[#1DA1F2] shadow-lg px-4 py-3 flex items-center gap-3",
               description: "group-[.toast]:text-[#1DA1F2] text-sm",
               actionButton:
                  "group-[.toast]:bg-[#1DA1F2] group-[.toast]:text-white font-semibold px-3 py-1 rounded-md",
               cancelButton:
                  "group-[.toast]:bg-gray-100 group-[.toast]:text-[#1DA1F2] px-3 py-1 rounded-md",
            },
         }}
         {...props}
      />
   );
};

export { Toaster };
