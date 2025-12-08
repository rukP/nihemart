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
  orderStatusData: { label: string; value: string }[];
  refundsData: { label: string; value: string }[];
  ridersStatsData: { label: string; value: string }[];
  ordersLoading: boolean;
  usersLoading: boolean;
  ridersLoading: boolean;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  metrics,
  orderStatusData,
  refundsData,
  ridersStatsData,
  ordersLoading,
  usersLoading,
  ridersLoading,
}) => (
  <>
    {/* Stats Cards Row 1 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
      {ordersLoading || usersLoading ? (
        // Loading skeletons
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex flex-col flex-grow justify-between">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        ))
      ) : (
        <>
          <StatsCard
            title="Total Revenue"
            value={`RWF ${metrics.totalRevenue.toLocaleString()}`}
            change={
              metrics.totalRevenue > 100000 ? "12.5" : "0"
            }
            icon={TrendingUp}
            iconColor="bg-orange-500"
          />
          <StatsCard
            title="Total Orders"
            value={metrics.totalOrders.toString()}
            change={metrics.totalOrders > 10 ? "8.2" : "0"}
            icon={ShoppingCart}
            iconColor="bg-orange-500"
          />
          <StatsCard
            title="Total Users"
            value={metrics.totalUsers.toString()}
            change={metrics.totalUsers > 5 ? "15.3" : "0"}
            icon={Users}
            iconColor="bg-orange-500"
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
            className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex flex-col flex-grow justify-between">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-14 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <>
          <DetailedStatsCard
            title="Total Orders"
            data={orderStatusData}
            icon={ShoppingCart}
            iconColor="bg-orange-500"
          />
          <DetailedStatsCard
            title="Total Refunds"
            data={refundsData}
            icon={RotateCcw}
            iconColor="bg-orange-500"
          />
          <DetailedStatsCard
            title="Riders"
            data={ridersStatsData}
            icon={Bike}
            iconColor="bg-orange-500"
          />
        </>
      )}
    </div>
  </>
);

export default StatsGrid;