"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { useRouter } from "next/navigation";
import RefundsOverview from "@/components/admin/refunds-overview";
import RefundsTable from "@/components/orders/RefundsTable";
import OrderRefundsTable from "@/components/orders/OrderRefundsTable";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AdminRefundsPage() {
  return (
    <ProtectedRoute requiredSection="refunds">
      <RefundsContent />
    </ProtectedRoute>
  );
}

function RefundsContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <ScrollArea className="h-screen pb-20">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm font-medium text-gray-700">
              Refunds Management
            </div>
            <div>
              <Button
                onClick={() => router.push("/admin/refunds/history")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-5xl grid-cols-4 bg-transparent border-b shadow-none rounded-none p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 shadow-none rounded-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 shadow-none rounded-none"
              >
                Items
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-transparent shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger value="placeholder1" className="hidden" />
              <TabsTrigger value="placeholder2" className="hidden" />
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <RefundsOverview onTabChange={setActiveTab} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="items" className="mt-6">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <RefundsTable />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <OrderRefundsTable />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ScrollArea>
  );
}
