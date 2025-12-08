"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, History } from "lucide-react";
import { useRouter } from "next/navigation";
import StockOverview from "@/components/admin/stock-overview";
import StockLevels from "@/components/admin/stock-levels";
import OrdersTable from "@/components/orders/OrdersTable";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function StockPage() {
  return (
    <ProtectedRoute requiredSection="stock">
      <StockContent />
    </ProtectedRoute>
  );
}

function StockContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="h-[calc(100vh-10rem)] pb-20">
      <div className="bg-gray-50 p-4 sm:p-6 w-full">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Stock Dashboard
              </h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium self-start">
                Active
              </span>
            </div>
            <Button
              onClick={() => router.push("/admin/products/new")}
              className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Stock
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid !mb-2 w-full grid-cols-2 sm:grid-cols-4 bg-transparent shadow-none rounded-none p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent border-b data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 shadow-none rounded-none text-sm sm:text-base"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="stock-levels"
                className="data-[state=active]:bg-transparent border-b shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 text-sm sm:text-base"
              >
                Stock Levels
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-transparent border-b shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 text-sm sm:text-base"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-transparent border-b shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 text-sm sm:text-base"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-10 sm:mt-6">
              <StockOverview onTabChange={setActiveTab} />
            </TabsContent>

            <TabsContent value="stock-levels" className="mt-10 sm:mt-6 w-full">
              <StockLevels />
            </TabsContent>

            <TabsContent value="orders" className="mt-10 sm:mt-6">
              <OrdersTable />
            </TabsContent>

            <TabsContent value="history" className="mt-10 sm:mt-6">
              <div className="bg-white rounded-lg p-8 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Stock History
                </h3>
                <p className="text-gray-500 mb-4">
                  View detailed audit trail of all stock changes
                </p>
                <Button
                  onClick={() => router.push("/admin/stock/history")}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <History className="w-4 h-4 mr-2" />
                  View Full History
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
