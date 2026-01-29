import React from "react";
import { TrendingUp, ShoppingCart, Users } from "lucide-react";
import StatsCard from "./StatsCard";
import DetailedStatsCard from "./DetailedStatsCard";
import { RotateCcw, Bike } from "lucide-react";

interface StatsGridProps {
  metrics: {
    totalRevenue: number;
    totalUsers: number;
    totalOrders: number;
    totalRefunded: number;
    refundedOrders: number;
  };
  previousMetrics?: {
    totalRevenue: number;
    totalUsers: number;
    totalOrders: number;
  };
  orderStatusData: { label: string; value: string }[];
  refundsData: { label: string; value: string }[];
  ridersStatsData: { label: string; value: string }[];
  ordersLoading: boolean;
  usersLoading: boolean;
  ridersLoading: boolean;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  metrics,
  previousMetrics,
  orderStatusData,
  refundsData,
  ridersStatsData,
  ordersLoading,
  usersLoading,
  ridersLoading,
}) => {
  // Calculate percentage changes
  const calculateChange = (current: number, previous: number = 0): { value: string; type: "increase" | "decrease" | "neutral" } => {
    if (previous === 0) {
      return { value: current > 0 ? "100" : "0", type: current > 0 ? "increase" : "neutral" };
    }
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 0.01) {
      return { value: "0", type: "neutral" };
    }
    return {
      value: Math.abs(change).toFixed(1),
      type: change > 0 ? "increase" : "decrease"
    };
  };

  const revenueChange = calculateChange(metrics.totalRevenue, previousMetrics?.totalRevenue);
  const ordersChange = calculateChange(metrics.totalOrders, previousMetrics?.totalOrders);
  const usersChange = calculateChange(metrics.totalUsers, previousMetrics?.totalUsers);

  return (
    <>
      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        {ordersLoading || usersLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
              <div className="flex flex-col flex-grow justify-between">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Revenue"
              value={`RWF ${metrics.totalRevenue.toLocaleString()}`}
              change={revenueChange.value}
              changeType={revenueChange.type}
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-orange-500 to-orange-600"
              iconBgColor="bg-gradient-to-br from-orange-500 to-orange-600"
            />
            <StatsCard
              title="Total Orders"
              value={metrics.totalOrders.toString()}
              change={ordersChange.value}
              changeType={ordersChange.type}
              icon={ShoppingCart}
              iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
              iconBgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatsCard
              title="Total Users"
              value={metrics.totalUsers.toString()}
              change={usersChange.value}
              changeType={usersChange.type}
              icon={Users}
              iconColor="bg-gradient-to-br from-green-500 to-green-600"
              iconBgColor="bg-gradient-to-br from-green-500 to-green-600"
            />
          </>
        )}
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        {ordersLoading || ridersLoading ? (
          // Loading skeletons for detailed cards
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
              <div className="flex flex-col flex-grow justify-between">
                <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between py-2">
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <DetailedStatsCard
              title="Order Status"
              data={orderStatusData}
              icon={ShoppingCart}
              iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
              iconBgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <DetailedStatsCard
              title="Refunds Overview"
              data={refundsData}
              icon={RotateCcw}
              iconColor="bg-gradient-to-br from-red-500 to-red-600"
              iconBgColor="bg-gradient-to-br from-red-500 to-red-600"
            />
            <DetailedStatsCard
              title="Riders Statistics"
              data={ridersStatsData}
              icon={Bike}
              iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
              iconBgColor="bg-gradient-to-br from-purple-500 to-purple-600"
            />
          </>
        )}
      </div>
    </>
  );
};

export default StatsGrid;