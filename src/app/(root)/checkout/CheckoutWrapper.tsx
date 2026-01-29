"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CheckoutPage from "./CheckoutPage";

// Component that handles search params
const SearchParamsHandler = ({
   onRetryMode,
   onRetryOrderId,
}: {
   onRetryMode: (isRetry: boolean) => void;
   onRetryOrderId: (orderId: string | null) => void;
}) => {
   const searchParams = useSearchParams();

   useEffect(() => {
      const isRetry = searchParams?.get("retry") === "true";
      const orderId = searchParams?.get("orderId") || null;

      onRetryMode(isRetry);
      onRetryOrderId(orderId);
   }, [searchParams, onRetryMode, onRetryOrderId]);

   return null;
};

const CheckoutWrapper = () => {
   const [isRetryMode, setIsRetryMode] = useState(false);
   const [retryOrderId, setRetryOrderId] = useState<string | null>(null);
   // No client-only debug logging here; SearchParamsHandler drives props

   return (
      <>
         <Suspense fallback={null}>
            <SearchParamsHandler
               onRetryMode={setIsRetryMode}
               onRetryOrderId={setRetryOrderId}
            />
         </Suspense>

         <Suspense
            fallback={
               <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <div className="text-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                     <span className="text-sm text-muted-foreground">
                        Loading...
                     </span>
                  </div>
               </div>
            }
         >
            <CheckoutPage
               isRetryMode={isRetryMode}
               retryOrderId={retryOrderId}
            />
         </Suspense>
      </>
   );
};

export default CheckoutWrapper;
