// components/analytics-section.tsx
"use client";

import { useState } from "react";
import { TrendingUp, Calendar, MoreVertical, Download } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ResponsiveContainer } from "recharts";

import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   ChartConfig,
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
} from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const chartData = [
   {
      day: "Sun",
      orders: 186,
      sales: 120,
      riders: 80,
      refunds: 20,
      customers: 150,
   },
   {
      day: "Mon",
      orders: 305,
      sales: 200,
      riders: 110,
      refunds: 25,
      customers: 220,
   },
   {
      day: "Tue",
      orders: 237,
      sales: 180,
      riders: 95,
      refunds: 18,
      customers: 190,
   },
   {
      day: "Wed",
      orders: 273,
      sales: 210,
      riders: 105,
      refunds: 22,
      customers: 230,
   },
   {
      day: "Thu",
      orders: 209,
      sales: 170,
      riders: 90,
      refunds: 15,
      customers: 180,
   },
   {
      day: "Fri",
      orders: 214,
      sales: 190,
      riders: 100,
      refunds: 20,
      customers: 200,
   },
   {
      day: "Sat",
      orders: 250,
      sales: 220,
      riders: 115,
      refunds: 28,
      customers: 240,
   },
];

const chartConfig = {
   orders: {
      label: "Orders",
      color: "hsl(var(--chart-1))",
   },
   sales: {
      label: "Sales",
      color: "hsl(var(--chart-2))",
   },
   riders: {
      label: "Riders",
      color: "hsl(var(--chart-3))",
   },
   refunds: {
      label: "Refunds",
      color: "hsl(var(--chart-4))",
   },
   customers: {
      label: "Customers",
      color: "hsl(var(--chart-5))",
   },
} satisfies ChartConfig;

export function AnalyticsSection() {
   const [activeTab, setActiveTab] = useState("orders");
   const [date, setDate] = useState<Date | undefined>(new Date());
   const [calendarOpen, setCalendarOpen] = useState(false);

   const getChartConfig = () => {
      return {
         [activeTab]: chartConfig[activeTab as keyof typeof chartConfig],
      };
   };

   const statsData = {
      orders: { value: "52k", label: "Orders" },
      sales: { value: "3.5k", label: "Sales" },
      riders: { value: "2.5k", label: "Riders" },
      refunds: { value: "0.5k", label: "Refund" },
      customers: { value: "250k", label: "Customers" },
   };

   return (
      <div>
         <div className="flex flex-col sm:flex-row justify-between items-start mb-4 md:mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Analytics</h3>

            <Button className="bg-orange-500 hover:bg-orange-600">
               <Download className="w-4 h-4 mr-2" />
               Export
            </Button>
         </div>
         <Card className="border shadow-sm mt-6">
            <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2">
               <div className="flex items-center gap-2">
                  <Popover
                     open={calendarOpen}
                     onOpenChange={setCalendarOpen}
                  >
                     <PopoverTrigger asChild>
                        <Button
                           variant="outline"
                           className="justify-start text-left font-normal h-9 px-3"
                        >
                           <Calendar className="mr-2 h-4 w-4" />
                           {date ? (
                              format(date, "PPP")
                           ) : (
                              <span>Pick a date</span>
                           )}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent
                        className="w-auto p-0"
                        align="end"
                     >
                        <CalendarComponent
                           mode="single"
                           selected={date}
                           onSelect={(selectedDate) => {
                              setDate(selectedDate);
                              setCalendarOpen(false);
                           }}
                           initialFocus
                           captionLayout="dropdown"
                           fromYear={2020}
                           toYear={2025}
                           className="rounded-md border shadow-sm"
                        />
                     </PopoverContent>
                  </Popover>
                  <MoreVertical className="w-4 h-4" />
               </div>
            </CardHeader>
            <CardContent>
               {/* Stats Row as Tabs */}
               <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
                  {Object.entries(statsData).map(([key, { value, label }]) => (
                     <div
                        key={key}
                        className={`text-center p-4 rounded-lg cursor-pointer transition-colors border-b ${
                           activeTab === key
                              ? "bg-gradient-to-b from-white via-white  to-[#27AAE24D] border-orange-500  "
                              : "bg-transparent hover:bg-gray-100"
                        }`}
                        onClick={() => setActiveTab(key)}
                     >
                        <p className="text-2xl font-bold text-gray-900">
                           {value}
                        </p>
                        <p className="text-sm text-gray-600">{label}</p>
                     </div>
                  ))}
               </div>

               {/* Chart Area - Full width */}
               <div className="bg-gray-50 rounded-lg p-4">
                  <ChartContainer
                     config={getChartConfig()}
                     className="h-[300px] w-full"
                  >
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                           accessibilityLayer
                           data={chartData}
                           margin={{
                              left: 12,
                              right: 12,
                              top: 12,
                           }}
                        >
                           <CartesianGrid
                              vertical={false}
                              strokeDasharray="3 3"
                           />
                           <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                           />
                           <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              width={40}
                           />
                           <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent indicator="line" />}
                           />
                           <Area
                              dataKey={activeTab}
                              type="monotone"
                              fill={`var(--color-${activeTab})`}
                              fillOpacity={0.4}
                              stroke={`var(--color-${activeTab})`}
                              strokeWidth={2}
                           />
                        </AreaChart>
                     </ResponsiveContainer>
                  </ChartContainer>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}