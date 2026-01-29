"use client";
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Users,
  TrendingUp,
  RotateCcw,
  Download,
  LucideIcon,
  Bike,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import OrdersListMini from "@/components/admin/orders-list-mini";
import StatsGrid from "@/components/admin/StatsGrid";
import { useQuery } from "@tanstack/react-query";
import { useRiders } from "@/hooks/useRiders";
import { useUsers } from "@/hooks/useUsers";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import dashboardAPI from "@/lib/api/dashboard";
import { useOrders } from "@/hooks/useOrders";
import { formatLocalDate } from "@/lib/format";

// Import new dashboard components
import { DateFilterSelector } from "@/components/admin/dashboard/DateFilterSelector";
import { OrderStatusChart } from "@/components/admin/dashboard/OrderStatusChart";
import { RecentActivitySection } from "@/components/admin/dashboard/RecentActivitySection";
import { TopProductsSection } from "@/components/admin/dashboard/TopProductsSection";
import { TopUsersSection } from "@/components/admin/dashboard/TopUsersSection";
import { TopRidersSection } from "@/components/admin/dashboard/TopRidersSection";

// Type definitions
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TopProduct {
  id: string;
  name: string;
  main_image_url?: string;
  order_count: number;
  price: number;
}

interface DetailedStatsData {
  label: string;
  value: string;
}

type FilterType = "today" | "all" | "custom";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determines the date range based on the selected filter type
 * - "today": Returns range for current day
 * - "all": Returns undefined (no date limit)
 * - "custom": Returns the custom date range selected by user
 */
const getDateRangeFromFilter = (
  filterType: FilterType,
  customRange?: DateRange,
): DateRange | undefined => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filterType === "today") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { from: today, to: tomorrow };
  } else if (filterType === "all") {
    return undefined;
  } else if (filterType === "custom") {
    return customRange;
  }
  return undefined;
};

// Main Dashboard Component
const DashboardContent: React.FC = () => {
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    undefined,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { users: allUsers, loading: allUsersLoading } = useUsers();

  // Compute the actual date range based on filter type
  const dateRange = getDateRangeFromFilter(filterType, customDateRange);

  // Calculate previous period for comparison
  const previousDateRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
    const previousTo = new Date(dateRange.from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - periodLength);
    return { from: previousFrom, to: previousTo };
  }, [dateRange]);

  // Fetch current period stats using dashboard API
  const { data: currentStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      return await dashboardAPI.getStats(dateRange?.from, dateRange?.to);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch previous period stats for comparison
  const { data: previousStats } = useQuery({
    queryKey: [
      "admin-dashboard-stats-previous",
      previousDateRange?.from,
      previousDateRange?.to,
    ],
    queryFn: async () => {
      if (!previousDateRange) return null;
      return await dashboardAPI.getStats(
        previousDateRange.from,
        previousDateRange.to,
      );
    },
    enabled: !!previousDateRange,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });

  // Fetch data with optimized queries using backend API
  const { useAllOrders } = useOrders();
  // Convert date range to API-friendly YYYY-MM-DD strings; for custom ranges make dateTo exclusive
  const apiDateFrom = dateRange?.from
    ? formatLocalDate(dateRange.from)
    : undefined;
  const apiDateTo = dateRange?.to
    ? (() => {
        const d = new Date(dateRange.to);
        // If custom range, the 'to' from DayPicker is inclusive - convert to exclusive end
        if (filterType === "custom") {
          d.setDate(d.getDate() + 1);
        }
        return formatLocalDate(d);
      })()
    : undefined;

  const ordersQuery = useAllOrders({
    filters: {
      dateFrom: apiDateFrom,
      dateTo: apiDateTo,
    },
    // Request high limit to get all orders for accurate dashboard stats
    // Backend defaults to 50 which causes inaccurate "All Time" analytics
    pagination: {
      page: 1,
      limit: 100000,
    },
  });
  const ordersResponse = ordersQuery.data;
  const ordersLoading = ordersQuery.isLoading;

  // Products are fetched via products API - using a simplified query for dashboard
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      // Use products API if available, otherwise return empty array
      try {
        const { fetchProductsPage } = await import("@/lib/api/products");
        const response = await fetchProductsPage({
          pagination: { page: 1, limit: 50 },
        });
        return response.data || [];
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - products don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: topProductsResponse, isLoading: topProductsLoading } = useQuery(
    {
      queryKey: [
        "admin-top-products",
        filterType,
        dateRange?.from,
        dateRange?.to,
      ],
      queryFn: async () => {
        return await dashboardAPI.getTopProducts(
          dateRange?.from,
          dateRange?.to,
        );
      },
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  );

  const { data: totalUsersCount, isLoading: usersCountLoading } = useQuery({
    queryKey: ["admin-total-users-count", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      try {
        const userAPI = (await import("@/lib/api/users")).default;
        const response = await userAPI.getAllUsers({
          fromDate: dateRange?.from || null,
          toDate: dateRange?.to || null,
          limit: 10000, // Get enough to accurately count
        });
        // Handle both total_count and count fields
        const count =
          response.total_count || response.count || response.users?.length || 0;
        console.log("Users count response:", { response, count });
        return count;
      } catch (error) {
        console.error("Error fetching users count:", error);
        return 0;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      return await dashboardAPI.getRecentUsers(5);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const topUsersResponse = usersResponse || [];
  const topUsersLoading = usersLoading;

  const { data: ridersResponse, isLoading: ridersLoading } = useRiders();

  // Earnings calculation - can be derived from orders if backend doesn't have dedicated endpoint
  const { data: earningsResponse, isLoading: earningsLoading } = useQuery({
    queryKey: [
      "admin-riders-earnings",
      filterType,
      dateRange?.from,
      dateRange?.to,
    ],
    queryFn: async () => {
      const { riderAPI } = await import("@/hooks/useRiders");
      // Calculate days for the earnings query
      let days = 7;
      if (filterType === "today") {
        days = 1;
      } else if (filterType === "all") {
        days = 365 * 100; // ~100 years for all time
      } else if (filterType === "custom" && dateRange?.from && dateRange?.to) {
        const diffTime = Math.abs(
          dateRange.to.getTime() - dateRange.from.getTime(),
        );
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return await riderAPI.getRiderEarnings(days);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const orders = ordersResponse?.data || [];
  const products = productsResponse || [];
  const users = usersResponse || [];
  const totalUsers = totalUsersCount || 0;
  const riders = ridersResponse || [];
  const topProducts = topProductsResponse || [];
  const topUsers = topUsersResponse || [];
  const earnings = earningsResponse || {};

  // Use dashboard API stats if available, otherwise calculate from orders
  const metrics = useMemo(() => {
    if (currentStats) {
      // Filter totalOrders to only count delivered orders
      const deliveredOrdersCount = orders.filter(
        (order: any) => order.status === "delivered",
      ).length;

      return {
        totalRevenue: currentStats.totalRevenue,
        totalUsers: currentStats.totalUsers,
        totalOrders: deliveredOrdersCount,
        totalRefunded: currentStats.totalRefunded,
        refundedOrders: currentStats.refundedOrders,
      };
    }

    // Fallback: calculate from orders
    const totalRevenue = orders
      .filter((order: any) => order.status === "delivered")
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const totalUsersCount = totalUsers;
    const totalOrders = orders.filter(
      (order: any) => order.status === "delivered",
    ).length;

    // Calculate refunds
    const refundedOrders = orders.filter(
      (order: any) => order.status === "refunded",
    );
    const totalRefunded = refundedOrders.reduce(
      (sum: number, order: any) => sum + (order.total || 0),
      0,
    );

    return {
      totalRevenue,
      totalUsers: totalUsersCount,
      totalOrders,
      totalRefunded,
      refundedOrders: refundedOrders.length,
    };
  }, [currentStats, orders, totalUsers]);

  // Prepare previous metrics for comparison
  const previousMetrics = useMemo(() => {
    if (!previousStats) return undefined;
    return {
      totalRevenue: previousStats.totalRevenue,
      totalUsers: previousStats.totalUsers,
      totalOrders: previousStats.totalOrders,
    };
  }, [previousStats]);

  // Calculate order status breakdown
  const orderStatusData: DetailedStatsData[] = useMemo(() => {
    const statusCounts = orders.reduce(
      (acc: Record<string, number>, order: any) => {
        let status = order.status || "pending";
        // Normalize status values - handle both singular and plural forms
        if (status === "cancel" || status === "cancelled") {
          status = "canceled";
        }
        if (status === "refund") {
          status = "refunded";
        }
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("Order status counts:", statusCounts);

    return [
      { label: "Pending", value: (statusCounts.pending || 0).toString() },
      { label: "Assigned", value: (statusCounts.assigned || 0).toString() },
      {
        label: "Processing",
        value: (statusCounts.processing || 0).toString(),
      },
      { label: "Delivered", value: (statusCounts.delivered || 0).toString() },
      {
        label: "Canceled",
        value: (
          statusCounts.canceled ||
          statusCounts.cancelled ||
          statusCounts.cancel ||
          0
        ).toString(),
      },
      {
        label: "Refunded",
        value: (statusCounts.refunded || statusCounts.refund || 0).toString(),
      },
    ];
  }, [orders]);

  // Calculate refunds data
  const refundsData: DetailedStatsData[] = useMemo(() => {
    const refundedOrders = orders.filter(
      (order: any) => order.status === "refunded",
    );
    const totalRefundedAmount = refundedOrders.reduce(
      (sum: number, order: any) => sum + (order.total || 0),
      0,
    );

    return [
      {
        label: "Total Refunded Orders",
        value: refundedOrders.length.toString(),
      },
      {
        label: "Total Refunded Money",
        value: `RWF ${totalRefundedAmount.toLocaleString()}`,
      },
    ];
  }, [orders]);

  // Calculate riders data
  const ridersStatsData: DetailedStatsData[] = useMemo(() => {
    const activeRiders = riders.filter((rider: any) => rider.active).length;

    // Calculate total earnings from earnings map
    const totalRiderEarnings = Object.values(
      earnings as Record<string, number>,
    ).reduce((sum, amount) => sum + amount, 0);

    return [
      { label: "Active Riders", value: activeRiders.toString() },
      {
        label: "Total Earnings",
        value: `RWF ${totalRiderEarnings.toLocaleString()}`,
      },
    ];
  }, [riders, earnings]);

  // Top products are already fetched
  const filteredProducts = topProducts.slice(0, 5);

  // Transform top users for display
  const filteredUsers = useMemo(() => {
    return (topUsers || []).slice(0, 5).map((user: any) => {
      const userName =
        user.full_name ||
        user.fullName ||
        user.email?.split("@")[0] ||
        "Unknown User";
      const userEmail = user.email || "";
      const avatar = (user.full_name || user.fullName || user.email || "U")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return {
        name: userName,
        code: userEmail,
        amount: "", // Users don't have an amount field
        avatar: avatar,
      };
    });
  }, [topUsers]);

  // Get top riders - use backend API
  const { data: topRidersData, isLoading: topRidersLoading } = useQuery({
    queryKey: ["admin-top-riders", filterType, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      try {
        const { riderAPI } = await import("@/hooks/useRiders");
        // Calculate days for the query
        let days = 7;
        if (filterType === "today") {
          days = 1;
        } else if (filterType === "all") {
          days = 365 * 100; // ~100 years for all time
        } else if (
          filterType === "custom" &&
          dateRange?.from &&
          dateRange?.to
        ) {
          const diffTime = Math.abs(
            dateRange.to.getTime() - dateRange.from.getTime(),
          );
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        const result = await riderAPI.getTopRidersByAmount(5, days);
        return result || [];
      } catch (error) {
        console.error("Error fetching top riders:", error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const topRiders = useMemo(() => {
    if (!topRidersData || !Array.isArray(topRidersData)) return [];
    return topRidersData.map((rider: any) => ({
      name: rider.name || rider.fullName || rider.full_name || "Unknown Rider",
      code: rider.code || rider.id?.slice(0, 8) || "",
      amount: `RWF ${(rider.amount || 0).toLocaleString()}`,
      avatar:
        rider.avatar ||
        rider.imageUrl ||
        rider.image_url ||
        (rider.name || rider.fullName || rider.full_name || "R")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase(),
    }));
  }, [topRidersData]);

  return (
    <div className="h-[calc(100vh-10rem)] p-4 md:p-6">
      <ScrollArea className="h-[calc(100vh-2rem)] pb-20">
        <div className="overflow-x-auto">
          <div className="flex flex-col">
            {/* Top Section with Main Content and Sidebar */}
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-6">
              {/* Main Content - 2/3 width */}
              <div className="w-full lg:w-2/3 xl:w-3/4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 md:mb-8">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Dashboard
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Monitor everything using this dashboard
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                {/* Date Filter Selector - filters all dashboard data by time period */}
                <DateFilterSelector
                  filterType={filterType}
                  customDateRange={customDateRange}
                  calendarOpen={calendarOpen}
                  onFilterChange={setFilterType}
                  onCalendarOpenChange={setCalendarOpen}
                  onDateRangeSelect={setCustomDateRange}
                />

                {/* Main Stats Grid - displays key metrics like revenue, orders, users, refunds */}
                <StatsGrid
                  metrics={metrics}
                  previousMetrics={previousMetrics}
                  orderStatusData={orderStatusData}
                  refundsData={refundsData}
                  ridersStatsData={ridersStatsData}
                  ordersLoading={ordersLoading || statsLoading}
                  usersLoading={usersLoading || statsLoading}
                  ridersLoading={ridersLoading}
                />
                {/* Order Status Distribution Chart - shows breakdown of orders by status */}
                <OrderStatusChart data={orderStatusData} />

                {/* Recent Activity Summary */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Recent Activity
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Latest updates and events
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                          <ShoppingCart className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            New Order
                          </p>
                          <p className="text-xs text-gray-500">
                            Order #
                            {orders.length > 0
                              ? orders[orders.length - 1]?.order_number
                              : "N/A"}{" "}
                            placed
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        {orders.length > 0
                          ? format(
                              new Date(
                                orders[orders.length - 1]?.created_at ||
                                  new Date(),
                              ),
                              "HH:mm",
                            )
                          : "--:--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            New User
                          </p>
                          <p className="text-xs text-gray-500">
                            Welcome{" "}
                            {users.length > 0
                              ? users[users.length - 1]?.full_name ||
                                users[users.length - 1]?.email
                              : "new user"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        {users.length > 0
                          ? format(
                              new Date(
                                users[users.length - 1]?.created_at ||
                                  new Date(),
                              ),
                              "HH:mm",
                            )
                          : "--:--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                          <Bike className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Rider Activity
                          </p>
                          <p className="text-xs text-gray-500">
                            {riders.filter((r: any) => r.active).length} active
                            riders
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-md">
                        Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar: Contains Top Products, Top Users, and Top Riders sections */}
              <div className="w-full lg:w-1/3 xl:w-1/4">
                <div className="space-y-4 md:space-y-6">
                  {/* Top Products Section */}
                  <TopProductsSection
                    products={topProducts.slice(0, 5)}
                    isLoading={topProductsLoading}
                  />

                  {/* Recent Users Section */}
                  <TopUsersSection
                    users={filteredUsers}
                    isLoading={topUsersLoading}
                  />

                  {/* Top Riders Section */}
                  <TopRidersSection
                    riders={topRiders}
                    isLoading={topRidersLoading}
                  />
                </div>
              </div>
            </div>

            {/* Orders List - Full width below everything */}
            <OrdersListMini />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default function Page() {
  return (
    <ProtectedRoute requiredSection="dashboard">
      <DashboardContent />
    </ProtectedRoute>
  );
}
