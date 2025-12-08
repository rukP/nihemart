"use client";

import { FC, ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { BuyNowProvider } from "@/contexts/BuyNowContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { ReactQueryProvider } from "@/providers/react.query.provider";
import { AuthProvider } from "@/providers/auth.provider";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

interface ProvidersProps {
   children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
   return (
      <ReactQueryProvider>
         <LanguageProvider>
            <AuthProvider>
               <NotificationsProvider>
                  <CartProvider>
                     <BuyNowProvider>
                        <WishlistProvider>
                           <NuqsAdapter>{children}</NuqsAdapter>
                        </WishlistProvider>
                     </BuyNowProvider>
                  </CartProvider>
               </NotificationsProvider>
            </AuthProvider>
         </LanguageProvider>
      </ReactQueryProvider>
   );
};

export default Providers;
