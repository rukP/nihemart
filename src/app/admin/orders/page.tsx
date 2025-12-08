"use client";

import OrdersMetrics from "@/components/orders/OrdersMetrics";
import OrdersTable from "@/components/orders/OrdersTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FC } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="orders">
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="px-5 sm:px-10 py-10">
          <OrdersMetrics />
          <OrdersTable />
        </div>
      </ScrollArea>
    </ProtectedRoute>
  );
};

export default page;
