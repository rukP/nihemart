"use client";

import TransactionsMetrics from "@/components/transaction/TransactionsMetrics";
import TransactionsTable from "@/components/transaction/TransactionsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FC, Suspense } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
   return (
      <ProtectedRoute requiredSection="transactions">
         <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
            <div className="px-5 sm:px-10 py-10">
               <Suspense
                  fallback={
                     <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                     </div>
                  }
               >
                  <TransactionsMetrics />
               </Suspense>
               <Suspense
                  fallback={
                     <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                     </div>
                  }
               >
                  <TransactionsTable />
               </Suspense>
            </div>
         </ScrollArea>
      </ProtectedRoute>
   );
};

export default page;
