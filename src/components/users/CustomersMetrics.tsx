"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { FC } from "react";
import { Card, CardHeader } from "../ui/card";
import CustomerTrendGraph from "./CustomerTrendGraph";
import { useUsers } from "@/hooks/useUsers";
import { useOrders } from "@/hooks/useOrders";

interface CustomersMetricsProps {}

interface CustomersMetric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  period: string;
}

const formatNumber = (n: number) => n.toLocaleString("en-RW");

const CustomersMetrics: FC<CustomersMetricsProps> = ({}) => {
  const { users, loading: usersLoading } = useUsers();
  const { useOrderStats } = useOrders();
  const {
    data: statsData,
    isLoading: statsLoading,
    isError,
    error,
  } = useOrderStats();

  // Filter to only show users with role "user" (customers)
  const customerUsers = users?.filter((u) => u.role === "user") || [];

  // Compute metrics from users and order stats (support camelCase and snake_case)
  const totalCustomers = customerUsers.length;
  const totalOrders = Number(
    statsData?.totalOrders ?? statsData?.total_orders ?? 0
  );
  const delivered = Number(
    statsData?.deliveredOrders ?? statsData?.delivered_orders ?? 0
  );
  const shipped = Number(
    statsData?.shippedOrders ?? statsData?.shipped_orders ?? 0
  );
  const completedOrders = delivered + shipped;
  const totalSales = Number(
    statsData?.totalSales ?? statsData?.total_sales ?? 0
  );
  const pending = Number(
    statsData?.pendingOrders ?? statsData?.pending_orders ?? 0
  );
  const processing = Number(
    statsData?.processingOrders ?? statsData?.processing_orders ?? 0
  );
  const cancelled = Number(
    statsData?.cancelledOrders ?? statsData?.cancelled_orders ?? 0
  );

  // Mock small growth numbers only when we don't have previous period info
  const totalGrowth = 0;

  const metrics: CustomersMetric[] = [
    {
      title: "Total Customers",
      value: formatNumber(totalCustomers),
      change: `${totalGrowth}%`,
      isPositive: totalGrowth >= 0,
      period: "All time",
    },
    {
      title: "Total Orders",
      value: formatNumber(totalOrders),
      change: "0%",
      isPositive: true,
      period: "Last 7 days",
    },
    {
      title: "Completed Orders",
      value: formatNumber(completedOrders),
      change: "0%",
      isPositive: true,
      period: "Completion Rate",
    },
  ];

  const loading = usersLoading || statsLoading;

  return (
    <div className="w-full mb-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-[0.25] grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
                    <h3 className="text-base sm:text-lg text-[#23272E] font-semibold">
                      &nbsp;
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 flex items-end gap-2">
                      <div className="h-6 w-24 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      &nbsp;
                    </div>
                  </CardContent>
                </Card>
              ))
            : metrics.map((metric, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
                    <h3 className="text-base sm:text-lg text-[#23272E] font-semibold">
                      {metric.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 flex items-end gap-2">
                      <div className="text-xl sm:text-3xl font-bold text-[#023337]">
                        {metric.value}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div
                          className={`flex items-center gap-1 ${
                            metric.isPositive
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {metric.isPositive ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          <span>{metric.change}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {metric.period}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
        <div className="flex-[0.75]">
          <CustomerTrendGraph />
        </div>
      </div>
    </div>
  );
};

export default CustomersMetrics;
