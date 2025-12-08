"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   Area,
   AreaChart,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useOrders } from "@/hooks/useOrders";
import { useUsers } from "@/hooks/useUsers";

// Fallback skeleton for chart when no real stats available
const fallbackData = [
   { day: "Sun", value: 0 },
   { day: "Mon", value: 0 },
   { day: "Tue", value: 0 },
   { day: "Wed", value: 0 },
   { day: "Thu", value: 0 },
   { day: "Fri", value: 0 },
   { day: "Sat", value: 0 },
];

// Metrics will be computed from hooks (no dummy data)

const CustomTooltip = ({ active, payload, label }: any) => {
   if (active && payload && payload.length) {
      return (
         <div className="rounded-lg border bg-background p-3 shadow-md">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">
               {new Intl.NumberFormat("en-RW", {
                  maximumFractionDigits: 0,
               }).format(payload[0].value || 0)}
            </p>
         </div>
      );
   }
   return null;
};

const CustomerTrendGraph = () => {
   const { useOrderStats, useAllOrders } = useOrders();
   const { data: statsData } = useOrderStats();
   const { users } = useUsers();

   // compute date filters to pass to useAllOrders based on selected range

   // Try to build a week series from statsData.daily (if available). Expect statsData.daily to be [{ day: 'Mon', count: number }, ...]
   const [range, setRange] = useState<string>("Anytime");

   // derive dateFrom/dateTo based on range selection
   const rangeFilter = useMemo(() => {
      const now = new Date();
      if (range === "Last 7 days") {
         const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
         return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
      }
      if (range === "Last 30 days") {
         const from = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
         return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
      }
      if (range === "This month") {
         const from = new Date(now.getFullYear(), now.getMonth(), 1);
         return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
      }
      if (range === "This year") {
         const from = new Date(now.getFullYear(), 0, 1);
         return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
      }
      // Anytime: no filters
      return {};
   }, [range]);

   // Fetch orders for the selected timeframe and aggregate if statsData.daily is not available
   const { data: ordersResponse } = useAllOrders({
      filters: { ...(rangeFilter as any) } as any,
   });

   // Selected metric tab: Active Customers | Orders (week) | Completed
   const [selectedMetric, setSelectedMetric] =
      useState<string>("Active Customers");

   const chartData = useMemo(() => {
      // If we have explicit daily stats from RPC use them as order counts
      if (
         statsData &&
         Array.isArray(statsData.daily) &&
         statsData.daily.length
      ) {
         const sample = statsData.daily[0] || {};
         const sampleDay = String(sample.day || "");
         const looksLikeISO = /\d{4}-\d{2}-\d{2}/.test(sampleDay);

         if (!looksLikeISO) {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const byDay: Record<string, number> = {};
            for (const d of statsData.daily) {
               const key = String(d.day || "").slice(0, 3);
               byDay[key] = (byDay[key] || 0) + Number(d.count || d.value || 0);
            }
            return days.map((day) => ({ day, value: byDay[day] || 0 }));
         }

         const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
         const byDay: Record<string, number> = {};
         for (const d of statsData.daily) {
            const date = new Date(String(d.day));
            if (isNaN(date.getTime())) continue;
            const key = date
               .toLocaleDateString("en-US", { weekday: "short" })
               .slice(0, 3);
            byDay[key] = (byDay[key] || 0) + Number(d.count || d.value || 0);
         }
         return days.map((day) => ({ day, value: byDay[day] || 0 }));
      }

      // If we have orders data, aggregate by date within the selected range
      if (ordersResponse && Array.isArray(ordersResponse.data)) {
         const orders = ordersResponse.data as any[];

         // Group orders by YYYY-MM-DD
         const map = new Map<string, any[]>();
         for (const o of orders) {
            const created = o?.created_at || o?.createdAt || o?.date || null;
            if (!created) continue;
            const d = new Date(created);
            if (isNaN(d.getTime())) continue;
            const key = d.toISOString().slice(0, 10);
            const arr = map.get(key) || [];
            arr.push(o);
            map.set(key, arr);
         }

         const keys = Array.from(map.keys()).sort();
         if (!keys.length) return fallbackData;

         return keys.map((k) => {
            const arr = map.get(k) || [];
            let value = 0;
            if (selectedMetric === "Active Customers") {
               const set = new Set(
                  arr.map((x: any) => x.user_id || x.userId || x.user)
               );
               value = set.size;
            } else if (selectedMetric === "Completed") {
               value = arr.filter((x: any) => {
                  const s = String(x.status || "").toLowerCase();
                  return [
                     "delivered",
                     "shipped",
                     "completed",
                     "refunded",
                  ].includes(s);
               }).length;
            } else {
               value = arr.length;
            }

            return {
               day: new Date(k).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
               }),
               value,
            };
         });
      }

      return fallbackData;
   }, [statsData, ordersResponse, selectedMetric]);

   // Debug: log source data used by the chart to the browser console
   try {
      // eslint-disable-next-line no-console
      console.debug("CustomerTrendGraph - statsData:", statsData);
      // eslint-disable-next-line no-console
      console.debug("CustomerTrendGraph - ordersResponse:", ordersResponse);
      // eslint-disable-next-line no-console
      console.debug(
         "CustomerTrendGraph - chartData:",
         chartData,
         "selectedMetric:",
         selectedMetric
      );
   } catch (e) {}

   // Build simple metrics from available data
   const metrics = useMemo(() => {
      const totalCustomers = users?.length || 0;
      const totalThisWeek = chartData.reduce(
         (s, d) => s + Number(d.value || 0),
         0
      );
      const completed = statsData?.completedOrders || 0;
      return [
         {
            title: "Active Customers",
            value: totalCustomers.toLocaleString("en-RW"),
         },
         {
            title: "Orders (week)",
            value: totalThisWeek.toLocaleString("en-RW"),
         },
         { title: "Completed", value: completed.toLocaleString("en-RW") },
      ];
   }, [users, chartData, statsData]);
   return (
      <div className="space-y-3 bg-white p-5 rounded-xl border shadow">
         <div className="flex items-center justify-between mb-0 lg:mb-5">
            <h1 className="text-lg md:text-2xl lg:text-3xl font-semibold text-[#23272E]">
               Customer Overview
            </h1>
            <div className="flex items-center gap-2">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon"
                     >
                        <Calendar className="h-4 w-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={() => setRange("Anytime")}>
                        Anytime
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setRange("Last 7 days")}>
                        Last 7 days
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setRange("Last 30 days")}>
                        Last 30 days
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setRange("This month")}>
                        This month
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setRange("This year")}>
                        This year
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
               <div
                  key={metric.title}
                  className={cn(
                     "space-y-0 pb-2 relative cursor-pointer after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:w-full after:content-[''] after:bg-[#E9E7FD] after:transition-all after:rounded-full after:duration-300",
                     {
                        "after:h-1 after:bg-orange-500":
                           selectedMetric === metric.title,
                     }
                  )}
                  onClick={() => setSelectedMetric(metric.title)}
               >
                  <div className="text-lg md:text-xl lg:text-2xl font-bold text-[#23272E]">
                     {metric.value}
                  </div>
                  <div className="text-xs md:text-base text-[#8B909A]">
                     {metric.title}
                  </div>
               </div>
            ))}
         </div>

         <Card className="shadow-none border-none lg:p-0">
            <CardContent className="px-0">
               <div className="h-80">
                  <ResponsiveContainer
                     width="100%"
                     height="100%"
                  >
                     <AreaChart
                        data={chartData}
                        margin={{ top: 20, left: -20 }}
                     >
                        <defs>
                           <linearGradient
                              id="colorValue"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                           >
                              <stop
                                 offset="0%"
                                 stopColor="#4EA674"
                                 stopOpacity={0.3}
                              />
                              <stop
                                 offset="100%"
                                 stopColor="#4EA674"
                                 stopOpacity={0}
                              />
                           </linearGradient>
                        </defs>
                        <XAxis
                           dataKey="day"
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#6b7280" }}
                           tickMargin={10}
                        />
                        <YAxis
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#6b7280" }}
                           tickFormatter={(value) =>
                              new Intl.NumberFormat("en-RW", {
                                 maximumFractionDigits: 0,
                              }).format(value)
                           }
                           domain={[
                              0,
                              Math.max(...chartData.map((d) => d.value), 10),
                           ]}
                           tickMargin={10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                           type="monotone"
                           dataKey="value"
                           stroke="#8B909A"
                           strokeWidth={2}
                           fillOpacity={1}
                           fill="url(#colorValue)"
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>
   );
};

export default CustomerTrendGraph;
