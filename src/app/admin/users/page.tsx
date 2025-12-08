"use client";

import OrdersMetrics from "@/components/transaction/TransactionsMetrics";
import OrdersTable from "@/components/transaction/TransactionsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomerTable } from "@/components/users/customers-table";
import CustomersMetrics from "@/components/users/CustomersMetrics";
import { FC } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="users">
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="flex min-w-0 flex-col px-2 py-10 xs:px-5 sm:px-10">
          <CustomersMetrics />
          <CustomerTable />
        </div>
      </ScrollArea>
    </ProtectedRoute>
  );
};

export default page;
