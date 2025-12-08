"use client";
import React, { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Calendar,
  Search,
  TrendingUp,
  Users,
  ShoppingCart,
  RotateCcw,
  Bike,
  LucideIcon,
  Download,
  Loader2,
  Package,
} from "lucide-react";
import OrdersListMini from "@/components/admin/orders-list-mini";
import StatsCard from "@/components/admin/StatsCard";
import DetailedStatsCard from "@/components/admin/DetailedStatsCard";
import ProductItem from "@/components/admin/ProductItem";
import UserItem from "@/components/admin/UserItem";
import StatsGrid from "@/components/admin/StatsGrid";
import { format } from "date-fns";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchRiders } from "@/integrations/supabase/riders";
import { useUsers } from "@/hooks/useUsers";
import { ProtectedRoute } from "@/components/ProtectedRoute";
const sb = supabase as any;
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Type definitions
interface TopProduct {
  id: string;
  name: string;
  main_image_url?: string;
  order_count: number;
  price: number;
}

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  iconColor: string;
}

interface DetailedStatsData {
  label: string;
  value: string;
}

interface DetailedStatsCardProps {
  title: string;
  data: DetailedStatsData[];
  icon: LucideIcon;
  iconColor: string;
}

interface ProductItemProps {
  image?: React.ReactNode;
  name: string;
  code: string;
  price: string;
  bgColor?: string;
}

interface UserItemProps {
  name: string;
  code: string;
  amount: string;
  avatar: string;
}

// Filter type type
type FilterType = "today" | "all" | "custom";

// Helper function to get date range based on filter type
const getDateRangeFromFilter = (
  filterType: FilterType,
  customRange?: DateRange
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
    undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { users: allUsers, loading: allUsersLoading } = useUsers();

  // Compute the actual date range based on filter type
  const dateRange = getDateRangeFromFilter(filterType, customDateRange);

  // Fetch data with optimized queries
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders", filterType, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      let query = sb
        .from("orders")
        .select(
          `
               *,
               order_items (
                  *,
                  product:products(*),
                  product_variation:product_variations(*)
               ),
               payments (*)
            `
        )
        .order("created_at", { ascending: false });

      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        // Add 1 day to include the entire end date
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - orders change more frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for admin dashboard
    refetchOnReconnect: true, // Refetch when connection restored
    refetchInterval: 2 * 60 * 1000, // Background refetch every 2 minutes for fresh order data
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50); // Reduce limit for faster loading
      if (error) throw error;
      return data as any[];
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
        // 1. Prepare parameters for the RPC call. Pass null if date is not set.
        const params = {
          start_date: dateRange?.from ? dateRange.from.toISOString() : null,
          end_date: dateRange?.to ? dateRange.to.toISOString() : null,
        };

        // 2. Call the RPC function with the parameters.
        const { data, error } = await sb.rpc("get_top_products", params);

        // 3. Handle error and return data.
        if (error) {
          console.error("Error fetching top products:", error);
          throw error;
        }

        // The data is already sorted and contains all the info you need.
        return (data || []) as TopProduct[];
      },
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  const { data: totalUsersCount, isLoading: usersCountLoading } = useQuery({
    queryKey: [
      "admin-total-users-count",
      filterType,
      dateRange?.from,
      dateRange?.to,
    ],
    queryFn: async () => {
      let query = sb
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString());
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("profiles")
        .select(
          `
               *,
               user_roles (role)
            `
        )
        .order("created_at", { ascending: false })
        .limit(5); // Limit for performance
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: recentUsersResponse, isLoading: recentUsersLoading } = useQuery(
    {
      queryKey: ["admin-recent-users"],
      queryFn: async () => {
        const { data, error } = await sb
          .from("profiles")
          .select("id, full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        console.log({ data, error });
        if (error) throw error;
        return data as any[];
      },
      staleTime: 30 * 60 * 1000, // 30 minutes
      gcTime: 60 * 60 * 1000, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  console.log("Recent Users Response:", recentUsersResponse);

  const topUsersResponse = recentUsersResponse || [];
  const topUsersLoading = recentUsersLoading;

  const { data: ridersResponse, isLoading: ridersLoading } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: () => fetchRiders(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data: earningsResponse, isLoading: earningsLoading } = useQuery({
    queryKey: ["admin-riders-earnings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/riders/earnings");
      if (!res.ok) {
        throw new Error("Failed to fetch earnings");
      }
      const j = await res.json();
      return j.earnings || {};
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const orders = ordersResponse || [];
  const products = productsResponse || [];
  const users = usersResponse || [];
  const totalUsers = totalUsersCount || 0;
  const riders = ridersResponse || [];
  const topProducts = topProductsResponse || [];
  const topUsers = topUsersResponse || [];
  const earnings = earningsResponse || {};

  // Calculate real metrics
  const metrics = useMemo(() => {
    const totalRevenue = orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + (order.total || 0), 0);
    const totalUsersCount = totalUsers;
    const totalOrders = orders.length;

    // Calculate refunds
    const refundedOrders = orders.filter(
      (order) => order.status === "refunded"
    );
    const totalRefunded = refundedOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    // Calculate profit (simplified - revenue minus some costs)
    const profit = totalRevenue * 0.8; // Assuming 20% costs

    return {
      totalRevenue,
      totalUsers: totalUsersCount,
      totalOrders,
      totalRefunded,
      refundedOrders: refundedOrders.length,
    };
  }, [orders, totalUsers]);

  // Calculate order status breakdown
  const orderStatusData: DetailedStatsData[] = useMemo(() => {
    const statusCounts = orders.reduce(
      (acc, order) => {
        const status = order.status || "pending";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return [
      { label: "Pending", value: (statusCounts.pending || 0).toString() },
      {
        label: "Processing",
        value: (statusCounts.processing || 0).toString(),
      },
      { label: "Delivered", value: (statusCounts.delivered || 0).toString() },
      {
        label: "Canceled",
        value: (statusCounts.canceled || 0).toString(),
      },
      {
        label: "Refunded",
        value: (statusCounts.refunded || 0).toString(),
      },
    ];
  }, [orders]);

  // Calculate refunds data
  const refundsData: DetailedStatsData[] = useMemo(() => {
    const refundedOrders = orders.filter(
      (order) => order.status === "refunded"
    );
    const totalRefundedAmount = refundedOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
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
    const activeRiders = riders.filter((rider) => rider.active).length;

    // Calculate total earnings from earnings map
    const totalRiderEarnings = Object.values(
      earnings as Record<string, number>
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

  // Top users are already fetched
  const filteredUsers = topUsers.slice(0, 5);

  // Get top riders based on earnings
  const topRiders = useMemo(() => {
    // Use earnings map directly
    const riderEarnings = earnings as Record<string, number>;

    // Get top 5 riders by earnings
    const topRiderIds = Object.entries(riderEarnings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    return riders
      .filter((rider) => rider.active && topRiderIds.includes(rider.id))
      .sort((a, b) => (riderEarnings[b.id] || 0) - (riderEarnings[a.id] || 0))
      .slice(0, 5)
      .map((rider) => ({
        name: rider.full_name || "Unknown Rider",
        code: "Rider",
        amount: `RWF ${(riderEarnings[rider.id] || 0).toLocaleString()}`,
        avatar:
          rider.full_name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "R",
      }));
  }, [riders, earnings]);

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
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 md:mb-6">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-2xl font-bold text-gray-900">
                      Dashboard
                    </h1>
                    <p className="text-orange-500">
                      Monitor Everything using this Dashboard
                    </p>
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                {/* Date Filter Selector */}
                <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3 mb-4 md:mb-6">
                  {/* Filter buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === "today" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilterType("today");
                        setCalendarOpen(false);
                      }}
                      className={
                        filterType === "today"
                          ? "bg-orange-500 hover:bg-orange-600"
                          : ""
                      }
                    >
                      Today
                    </Button>
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilterType("all");
                        setCalendarOpen(false);
                      }}
                      className={
                        filterType === "all"
                          ? "bg-orange-500 hover:bg-orange-600"
                          : ""
                      }
                    >
                      All Time
                    </Button>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={
                            filterType === "custom" ? "default" : "outline"
                          }
                          size="sm"
                          className={
                            filterType === "custom"
                              ? "bg-orange-500 hover:bg-orange-600"
                              : ""
                          }
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customDateRange?.from && customDateRange?.to
                            ? `${format(customDateRange.from, "MMM dd")} - ${format(customDateRange.to, "MMM dd")}`
                            : "Custom"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="range"
                          selected={customDateRange}
                          onSelect={(selectedRange) => {
                            setCustomDateRange(selectedRange);
                            if (selectedRange?.from && selectedRange?.to) {
                              setFilterType("custom");
                              setCalendarOpen(false);
                            }
                          }}
                          numberOfMonths={2}
                          initialFocus
                          className="rounded-md border shadow-sm"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Display current filter info */}
                  {filterType === "custom" &&
                    customDateRange?.from &&
                    customDateRange?.to && (
                      <div className="text-sm text-gray-600">
                        {format(customDateRange.from, "MMM dd, yyyy")} -{" "}
                        {format(customDateRange.to, "MMM dd, yyyy")}
                      </div>
                    )}
                </div>

                <StatsGrid
                  metrics={metrics}
                  orderStatusData={orderStatusData}
                  refundsData={refundsData}
                  ridersStatsData={ridersStatsData}
                  ordersLoading={ordersLoading}
                  usersLoading={usersLoading}
                  ridersLoading={ridersLoading}
                />

                {/* Order Status Distribution Chart */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Order Status Distribution
                  </h3>
                  <ChartContainer
                    config={{
                      pending: {
                        label: "Pending",
                        color: "hsl(var(--chart-1))",
                      },
                      processing: {
                        label: "Processing",
                        color: "hsl(var(--chart-2))",
                      },
                      delivered: {
                        label: "Delivered",
                        color: "hsl(var(--chart-3))",
                      },
                      refunded: {
                        label: "Refunded",
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <BarChart
                      data={orderStatusData.map((item) => ({
                        status: item.label,
                        count: parseInt(item.value),
                        color:
                          item.label.toLowerCase() === "pending"
                            ? "hsl(var(--chart-1))"
                            : item.label.toLowerCase() === "processing"
                              ? "hsl(var(--chart-2))"
                              : item.label.toLowerCase() === "delivered"
                                ? "hsl(var(--chart-3))"
                                : item.label.toLowerCase() === "canceled"
                                  ? "hsl(var(--chart-5))"
                                  : item.label.toLowerCase() === "refunded"
                                    ? "hsl(var(--chart-4))"
                                    : "hsl(var(--chart-1))",
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {orderStatusData.map((item, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              item.label.toLowerCase() === "pending"
                                ? "hsl(var(--chart-1))"
                                : item.label.toLowerCase() === "processing"
                                  ? "hsl(var(--chart-2))"
                                  : item.label.toLowerCase() === "delivered"
                                    ? "hsl(var(--chart-3))"
                                    : item.label.toLowerCase() === "canceled"
                                      ? "hsl(var(--chart-5))"
                                      : item.label.toLowerCase() === "refunded"
                                        ? "hsl(var(--chart-4))"
                                        : "hsl(var(--chart-1))"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Recent Activity Summary */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
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
                      <span className="text-xs text-gray-500">
                        {orders.length > 0
                          ? format(
                              new Date(
                                orders[orders.length - 1]?.created_at ||
                                  new Date()
                              ),
                              "HH:mm"
                            )
                          : "--:--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
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
                      <span className="text-xs text-gray-500">
                        {users.length > 0
                          ? format(
                              new Date(
                                users[users.length - 1]?.created_at ||
                                  new Date()
                              ),
                              "HH:mm"
                            )
                          : "--:--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Bike className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Rider Activity
                          </p>
                          <p className="text-xs text-gray-500">
                            {riders.filter((r) => r.active).length} active
                            riders
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">Live</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar - 1/3 width */}
              <div className="w-full lg:w-1/3 xl:w-1/4">
                <div className="space-y-4 md:space-y-6">
                  {/* Top Products */}
                  <div className="bg-white rounded-lg border shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-semibold">Top Products</h3>
                      <Link
                        className="text-sm text-blue-500"
                        href="/admin/products"
                      >
                        All product
                      </Link>
                    </div>
                    <div>
                      {topProductsLoading ? (
                        // Loading skeletons for products
                        Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                        ))
                      ) : filteredProducts.length > 0 ? (
                        filteredProducts.map((product, index) => (
                          <ProductItem
                            key={product.id || index}
                            image={product.main_image_url}
                            name={product.name}
                            code={`Sold: ${product.order_count}`}
                            price={`RWF ${product.price.toLocaleString()}`}
                            bgColor={
                              index % 4 === 0
                                ? "bg-blue-100"
                                : index % 4 === 1
                                  ? "bg-gray-100"
                                  : index % 4 === 2
                                    ? "bg-black"
                                    : "bg-red-100"
                            }
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No products found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Users */}
                  <div className="bg-white rounded-lg border shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-semibold">Users</h3>
                      <Link
                        className="text-sm text-blue-500"
                        href="/admin/users"
                      >
                        All users
                      </Link>
                    </div>
                    <div>
                      {topUsersLoading ? (
                        // Loading skeletons for users
                        Array.from({ length: 2 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                        ))
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                          <UserItem
                            key={user.id || index}
                            name={
                              user.full_name || user.email || "Unknown User"
                            }
                            code={user.email || ""}
                            amount={user.email || ""}
                            avatar={(user.full_name || user.email || "U")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No users found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Riders */}
                  <div className="bg-white rounded-lg border shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-semibold">Top Riders</h3>
                    </div>
                    <div>
                      {ridersLoading ? (
                        // Loading skeletons for riders
                        Array.from({ length: 2 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                        ))
                      ) : topRiders.length > 0 ? (
                        topRiders.map((rider, index) => (
                          <UserItem
                            key={index}
                            name={rider.name}
                            code={rider.code}
                            amount={rider.amount}
                            avatar={rider.avatar}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Bike className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No riders found</p>
                        </div>
                      )}
                    </div>
                  </div>
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
