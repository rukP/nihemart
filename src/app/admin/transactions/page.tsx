"use client";

import TransactionsMetrics from "@/components/transaction/TransactionsMetrics";
import TransactionsTable from "@/components/transaction/TransactionsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FC } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="transactions">
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="px-5 sm:px-10 py-10">
          <TransactionsMetrics />
          <TransactionsTable />
        </div>
      </ScrollArea>
    </ProtectedRoute>
  );
};

export default page;
