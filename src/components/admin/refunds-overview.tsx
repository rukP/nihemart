"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
   MoreHorizontal,
   ArrowDownRight,
   ArrowUpRight,
   Users,
   RefreshCw,
   BarChart3,
} from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   ChartConfig,
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, CartesianGrid, XAxis, Bar, BarChart, Area } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useOrders } from "@/hooks/useOrders";
import { fetchRefundedDataForDashboard } from "@/integrations/supabase/orders";

const refundsChartConfig = {
   requested: { label: "Requested", color: "hsl(38, 92%, 50%)" },
   approved: { label: "Approved", color: "hsl(142, 76%, 36%)" },
   rejected: { label: "Rejected", color: "hsl(0, 84%, 60%)" },
   cancelled: { label: "Cancelled", color: "hsl(220, 14%, 92%)" },
   refunded: { label: "Refunded", color: "hsl(200, 70%, 40%)" },
} satisfies ChartConfig;

export default function RefundsOverview({
   onTabChange,
}: {
   onTabChange?: (tab: string) => void;
}) {
   const { useOrderStats } = useOrders();
   const { data: orderStats } = useOrderStats();

   // Fetch refund summary data (server integration should provide aggregated counts)
   const {
      data: refunds = {
         totals: { requested: 0, approved: 0, rejected: 0 },
         series: [],
      },
      isLoading,
   } = useQuery({
      queryKey: ["refunds-overview"],
      queryFn: () => fetchRefundedDataForDashboard(),
   });

   // Prepare chart data fallback (if integration doesn't provide time series)
   const chartData =
      refunds.series && refunds.series.length > 0
         ? refunds.series
         : [
              { month: "Jan", requested: 12, approved: 6, rejected: 2 },
              { month: "Feb", requested: 9, approved: 7, rejected: 1 },
              { month: "Mar", requested: 14, approved: 9, rejected: 3 },
              { month: "Apr", requested: 8, approved: 5, rejected: 2 },
              { month: "May", requested: 6, approved: 4, rejected: 1 },
              { month: "Jun", requested: 11, approved: 7, rejected: 2 },
           ];

   if (isLoading) {
      return (
         <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
            <span className="ml-2">Loading refunds dashboard...</span>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-l-4 border-l-orange-500">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                     Total Refunds
                  </CardTitle>
                  <Users className="h-5 w-5 text-orange-600" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                     {Object.values(refunds.totals || {}).reduce(
                        (acc: number, v: any) => acc + Number(v || 0),
                        0
                     )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                     {refunds.totals.approved} approved
                  </p>
               </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                     Approved
                  </CardTitle>
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                     {refunds.totals.approved}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                     Refunds processed
                  </p>
               </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-yellow-500">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                     Requested
                  </CardTitle>
                  <ArrowDownRight className="h-5 w-5 text-yellow-600" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                     {refunds.totals.requested}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
               </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-red-500">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                     Rejected
                  </CardTitle>
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                     {refunds.totals.rejected}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Declined refunds</p>
               </CardContent>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                     <CardTitle className="text-sm font-medium text-gray-600">
                        Refunds Trend
                     </CardTitle>
                     <div className="text-lg font-bold mt-2 text-orange-600">
                        {refunds.totals.requested} requests
                     </div>
                  </div>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="ghost"
                           className="h-8 w-8 p-0"
                        >
                           <MoreHorizontal className="h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Export data</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </CardHeader>
               <CardContent>
                  <ChartContainer config={refundsChartConfig}>
                     <BarChart
                        data={chartData}
                        height={200}
                     >
                        <CartesianGrid vertical={false} />
                        <XAxis
                           dataKey="month"
                           tickLine={false}
                           axisLine={false}
                           tickMargin={8}
                           tick={{ fontSize: 12, fill: "#888" }}
                        />
                        <ChartTooltip
                           cursor={false}
                           content={<ChartTooltipContent />}
                        />
                        <Bar
                           dataKey="requested"
                           fill="var(--color-requested)"
                           radius={[2, 2, 0, 0]}
                        />
                        <Bar
                           dataKey="approved"
                           fill="var(--color-approved)"
                           radius={[2, 2, 0, 0]}
                        />
                        <Bar
                           dataKey="rejected"
                           fill="var(--color-rejected)"
                           radius={[2, 2, 0, 0]}
                        />
                     </BarChart>
                  </ChartContainer>
               </CardContent>
            </Card>

            <Card className="bg-white">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                     <CardTitle className="text-sm font-medium text-gray-600">
                        Order Refund Rate
                     </CardTitle>
                     <div className="text-lg font-bold mt-2 text-blue-600">
                        {(orderStats as any)?.delivered_orders || 0} completed
                     </div>
                  </div>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="ghost"
                           className="h-8 w-8 p-0"
                        >
                           <MoreHorizontal className="h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem>View orders</DropdownMenuItem>
                        <DropdownMenuItem>Export report</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </CardHeader>
               <CardContent>
                  <ChartContainer
                     config={{
                        orders: { label: "Orders", color: "hsl(221,83%,53%)" },
                     }}
                  >
                     <AreaChart
                        data={chartData}
                        height={200}
                        margin={{ left: 12, right: 12 }}
                     >
                        <CartesianGrid vertical={false} />
                        <XAxis
                           dataKey="month"
                           tickLine={false}
                           axisLine={false}
                           tickMargin={8}
                           tick={{ fontSize: 12, fill: "#888" }}
                        />
                        <ChartTooltip
                           cursor={false}
                           content={<ChartTooltipContent hideLabel />}
                        />
                        <Area
                           dataKey="requested"
                           type="monotone"
                           fill="#3b82f6"
                           fillOpacity={0.2}
                           stroke="#3b82f6"
                           strokeWidth={2}
                        />
                     </AreaChart>
                  </ChartContainer>
               </CardContent>
            </Card>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
               <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-orange-500 rounded-full">
                        <Users className="h-6 w-6 text-white" />
                     </div>
                     <div>
                        <h3 className="font-semibold text-gray-900">
                           Manage Refunds
                        </h3>
                        <p className="text-sm text-gray-600">
                           Review and process refund requests
                        </p>
                     </div>
                  </div>
                  <Button
                     className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white"
                     onClick={() => onTabChange?.("orders")}
                  >
                     Manage Refunds
                  </Button>
               </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
               <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-500 rounded-full">
                        <BarChart3 className="h-6 w-6 text-white" />
                     </div>
                     <div>
                        <h3 className="font-semibold text-gray-900">
                           Export Reports
                        </h3>
                        <p className="text-sm text-gray-600">
                           Create CSV/Excel reports of refunds
                        </p>
                     </div>
                  </div>
                  <Button
                     className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
                     onClick={() => onTabChange?.("history")}
                  >
                     Export
                  </Button>
               </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
               <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-purple-500 rounded-full">
                        <BarChart3 className="h-6 w-6 text-white" />
                     </div>
                     <div>
                        <h3 className="font-semibold text-gray-900">
                           View History
                        </h3>
                        <p className="text-sm text-gray-600">
                           Audit trail & reports
                        </p>
                     </div>
                  </div>
                  <Button
                     className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white"
                     onClick={() => onTabChange?.("history")}
                  >
                     Go to History
                  </Button>
               </CardContent>
            </Card>
         </div>
      </div>
   );
}
