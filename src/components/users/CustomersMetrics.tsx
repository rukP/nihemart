"use client";

import { FC, useMemo } from "react";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   ChartConfig,
} from "@/components/ui/chart";
import {
   Area,
   AreaChart,
   Bar,
   BarChart,
   CartesianGrid,
   XAxis,
   YAxis,
} from "recharts";
import {
   Users,
   ShoppingCart,
   CheckCircle2,
   TrendingUp,
   RefreshCw,
   DollarSign,
   Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { useOrders } from "@/hooks/useOrders";
import { format, subDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { formatLocalDate, parseLocalDate } from "@/lib/format";

interface CustomersMetricsProps {}

const formatNumber = (n: number) => n.toLocaleString("en-RW");

const CustomersMetrics: FC<CustomersMetricsProps> = ({}) => {
   const { users, loading: usersLoading, roleCounts } = useUsers();
   const { useOrderStats, useAllOrders } = useOrders();

   // Read global TimeFilter from URL to scope metrics
   const searchParams = useSearchParams();
   const preset = searchParams?.get("preset");
   const fromParam = searchParams?.get("from");
   const toParam = searchParams?.get("to");

   const computedRange = (() => {
      if (!preset || preset === "all") return {} as any;
      if (preset === "today" && fromParam) {
         const start = parseLocalDate(fromParam)!;
         const end = new Date(start);
         end.setDate(end.getDate() + 1);
         return {
            dateFrom: formatLocalDate(start),
            dateTo: formatLocalDate(end),
         };
      }
      if (preset === "custom" && fromParam && toParam) {
         const start = parseLocalDate(fromParam)!;
         const end = parseLocalDate(toParam)!;
         end.setDate(end.getDate() + 1);
         return {
            dateFrom: formatLocalDate(start),
            dateTo: formatLocalDate(end),
         };
      }
      return {} as any;
   })();

   const {
      data: statsData,
      isLoading: statsLoading,
      isError,
      error,
      refetch: refetchStats,
   } = useOrderStats({
      dateFrom: computedRange.dateFrom,
      dateTo: computedRange.dateTo,
   });

   // Fetch orders for chart data (default last 30 days or time filter range)
   const dateRange = useMemo(() => {
      if (computedRange.dateFrom && computedRange.dateTo) {
         return {
            from: parseLocalDate(computedRange.dateFrom)!,
            to: parseLocalDate(computedRange.dateTo)!,
         };
      }
      return { from: subDays(new Date(), 30), to: new Date() };
   }, [computedRange]);

   const { data: ordersResponse, isLoading: ordersLoading } = useAllOrders({
      filters: {
         ...(dateRange.from
            ? { dateFrom: formatLocalDate(dateRange.from) }
            : {}),
         ...(dateRange.to ? { dateTo: formatLocalDate(dateRange.to) } : {}),
      } as any,
      pagination: { page: 1, limit: 10000 },
   });

   // Use roleCounts from API for accurate total customer count
   // roleCounts is provided by the /api/admin/list-users endpoint and reflects
   // the total count of all users by role (not just the paginated results)
   const totalCustomers = roleCounts?.user || 0;

   // Compute metrics from users and order stats
   const totalOrders = Number(
      statsData?.totalOrders ?? statsData?.total_orders ?? 0,
   );
   const delivered = Number(
      statsData?.deliveredOrders ?? statsData?.delivered_orders ?? 0,
   );
   const shipped = Number(
      statsData?.shippedOrders ?? statsData?.shipped_orders ?? 0,
   );
   const completedOrders = delivered + shipped;
   const totalSales = Number(
      statsData?.totalSales ?? statsData?.total_sales ?? 0,
   );
   const pending = Number(
      statsData?.pendingOrders ?? statsData?.pending_orders ?? 0,
   );
   const processing = Number(
      statsData?.processingOrders ?? statsData?.processing_orders ?? 0,
   );
   const cancelled = Number(
      statsData?.cancelledOrders ?? statsData?.cancelled_orders ?? 0,
   );
   const activeOrders = pending + processing;

   // Calculate completion rate
   const completionRate =
      totalOrders > 0
         ? ((completedOrders / totalOrders) * 100).toFixed(1)
         : "0";

   // Calculate cancellation rate
   const cancellationRate =
      totalOrders > 0 ? ((cancelled / totalOrders) * 100).toFixed(1) : "0";

   // Calculate average order value
   const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

   // Prepare chart data from orders
   const chartData = useMemo(() => {
      if (!ordersResponse?.data || !Array.isArray(ordersResponse.data)) {
         return [];
      }

      const orders = ordersResponse.data;
      const dailyMap = new Map<
         string,
         { orders: number; revenue: number; customers: Set<string> }
      >();

      orders.forEach((order: any) => {
         const date = order.createdAt || order.created_at;
         if (!date) return;

         const orderDate = new Date(date);
         const dayKey = format(orderDate, "yyyy-MM-dd");

         const dayData = dailyMap.get(dayKey) || {
            orders: 0,
            revenue: 0,
            customers: new Set<string>(),
         };

         dayData.orders += 1;
         dayData.revenue += Number(order.total || 0);
         const userId = order.userId || order.user_id || order.user?.id;
         if (userId) {
            dayData.customers.add(String(userId));
         }

         dailyMap.set(dayKey, dayData);
      });

      // Fill in missing days and sort
      const result: Array<{
         date: string;
         orders: number;
         revenue: number;
         customers: number;
      }> = [];
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);

      for (
         let d = new Date(startDate);
         d <= endDate;
         d.setDate(d.getDate() + 1)
      ) {
         const dayKey = format(d, "yyyy-MM-dd");
         const dayData = dailyMap.get(dayKey) || {
            orders: 0,
            revenue: 0,
            customers: new Set<string>(),
         };

         result.push({
            date: dayKey,
            orders: dayData.orders,
            revenue: dayData.revenue,
            customers: dayData.customers.size,
         });
      }

      return result.sort((a, b) => a.date.localeCompare(b.date));
   }, [ordersResponse, dateRange]);

   // Status distribution for bar chart
   const statusDistribution = useMemo(() => {
      if (!ordersResponse?.data || !Array.isArray(ordersResponse.data)) {
         return [];
      }

      const orders = ordersResponse.data;
      const statusMap = new Map<string, number>();

      orders.forEach((order: any) => {
         const status = String(order.status || "").toLowerCase();
         const count = statusMap.get(status) || 0;
         statusMap.set(status, count + 1);
      });

      return Array.from(statusMap.entries()).map(([status, count]) => ({
         status: status.charAt(0).toUpperCase() + status.slice(1),
         count,
      }));
   }, [ordersResponse]);

   const metrics = useMemo(
      () => [
         {
            title: "Total Customers",
            value: formatNumber(totalCustomers),
            change: "0%",
            isPositive: true,
            icon: Users,
            period: "All time",
            color: "text-blue-600",
         },
         {
            title: "Total Orders",
            value: formatNumber(totalOrders),
            change: "0%",
            isPositive: true,
            icon: ShoppingCart,
            period: "All time",
            color: "text-orange-600",
         },
         {
            title: "Completed Orders",
            value: formatNumber(completedOrders),
            change: `${completionRate}%`,
            isPositive: true,
            icon: CheckCircle2,
            period: "Completion Rate",
            color: "text-green-600",
         },
         {
            title: "Total Revenue",
            value: `RWF ${formatNumber(totalSales)}`,
            change: "0%",
            isPositive: true,
            icon: DollarSign,
            period: "All time",
            color: "text-emerald-600",
         },
      ],
      [
         totalCustomers,
         totalOrders,
         completedOrders,
         totalSales,
         completionRate,
      ],
   );

   const loading = usersLoading || statsLoading || ordersLoading;

   const customerChartConfig: ChartConfig = {
      orders: {
         label: "Orders",
         color: "hsl(221, 83%, 53%)",
      },
      revenue: {
         label: "Revenue",
         color: "hsl(142, 76%, 36%)",
      },
      customers: {
         label: "Customers",
         color: "hsl(47, 96%, 53%)",
      },
   };

   const statusChartConfig: ChartConfig = {
      count: {
         label: "Orders",
         color: "hsl(221, 83%, 53%)",
      },
   };

   return (
      <div className="w-full space-y-6">
         {/* Header */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h1 className="text-3xl font-bold text-gray-900">
                  Customer Metrics
               </h1>
               <p className="text-gray-600 mt-1">
                  Track customer activity and order performance
               </p>
            </div>
            <Button
               variant="outline"
               onClick={() => refetchStats()}
               disabled={loading}
            >
               <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
               />
               Refresh
            </Button>
         </div>

         {/* Metrics Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading
               ? Array.from({ length: 4 }).map((_, i) => (
                    <Card
                       key={i}
                       className="relative overflow-hidden"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">
                             Loading...
                          </CardTitle>
                       </CardHeader>
                       <CardContent>
                          <div className="text-2xl font-bold text-gray-900 animate-pulse">
                             ...
                          </div>
                       </CardContent>
                    </Card>
                 ))
               : metrics.map((metric, index) => (
                    <Card
                       key={index}
                       className="relative overflow-hidden"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">
                             {metric.title}
                          </CardTitle>
                          <metric.icon className={`h-4 w-4 ${metric.color}`} />
                       </CardHeader>
                       <CardContent>
                          <div className="text-2xl font-bold text-gray-900">
                             {metric.value}
                          </div>
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                             <span
                                className={`flex items-center ${metric.isPositive ? "text-green-600" : "text-red-600"}`}
                             >
                                {metric.isPositive ? (
                                   <TrendingUp className="w-3 h-3 mr-1" />
                                ) : (
                                   <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
                                )}
                                {metric.change}
                             </span>
                             <span className="ml-2">{metric.period}</span>
                          </div>
                       </CardContent>
                       <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full opacity-20"></div>
                    </Card>
                 ))}
         </div>

         {/* Charts Section */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders & Revenue Trend */}
            <Card>
               <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                     Orders & Revenue Trend
                  </CardTitle>
                  <CardDescription>
                     Daily performance over the last 30 days
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <div className="h-[300px] flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                     </div>
                  ) : chartData && chartData.length > 0 ? (
                     <ChartContainer
                        config={customerChartConfig}
                        className="h-[300px]"
                     >
                        <AreaChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis
                              dataKey="date"
                              tickFormatter={(value) =>
                                 format(new Date(value), "MMM dd")
                              }
                           />
                           <YAxis />
                           <ChartTooltip content={<ChartTooltipContent />} />
                           <Area
                              type="monotone"
                              dataKey="orders"
                              stackId="1"
                              stroke="hsl(221, 83%, 53%)"
                              fill="hsl(221, 83%, 53%)"
                              fillOpacity={0.6}
                           />
                           <Area
                              type="monotone"
                              dataKey="revenue"
                              stackId="2"
                              stroke="hsl(142, 76%, 36%)"
                              fill="hsl(142, 76%, 36%)"
                              fillOpacity={0.6}
                           />
                        </AreaChart>
                     </ChartContainer>
                  ) : (
                     <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No data available for the selected period
                     </div>
                  )}
               </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
               <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                     Order Status Distribution
                  </CardTitle>
                  <CardDescription>
                     Breakdown of orders by status
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <div className="h-[300px] flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                     </div>
                  ) : statusDistribution && statusDistribution.length > 0 ? (
                     <ChartContainer
                        config={statusChartConfig}
                        className="h-[300px]"
                     >
                        <BarChart data={statusDistribution}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis dataKey="status" />
                           <YAxis />
                           <ChartTooltip content={<ChartTooltipContent />} />
                           <Bar
                              dataKey="count"
                              fill="hsl(221, 83%, 53%)"
                              radius={[4, 4, 0, 0]}
                           />
                        </BarChart>
                     </ChartContainer>
                  ) : (
                     <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No status data available
                     </div>
                  )}
               </CardContent>
            </Card>
         </div>

         {/* Additional Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
               <CardHeader>
                  <CardTitle className="text-sm font-medium">
                     Active Orders
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                     {formatNumber(activeOrders)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                     Pending + Processing
                  </p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader>
                  <CardTitle className="text-sm font-medium">
                     Cancelled Orders
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                     {formatNumber(cancelled)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                     {cancellationRate}% cancellation rate
                  </p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader>
                  <CardTitle className="text-sm font-medium">
                     Average Order Value
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                     RWF {formatNumber(averageOrderValue)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Per order</p>
               </CardContent>
            </Card>
         </div>
      </div>
   );
};

export default CustomersMetrics;
