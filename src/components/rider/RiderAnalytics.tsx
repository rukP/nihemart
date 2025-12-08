"use client";

import { useState } from "react";
import { Calendar, MoreVertical, ArrowUp, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const deliveriesData = [
  { time: "6 AM", deliveries: 2 },
  { time: "8 AM", deliveries: 1 },
  { time: "10 AM", deliveries: 0 },
  { time: "12 PM", deliveries: 3 },
  { time: "2 PM", deliveries: 5 },
  { time: "4 PM", deliveries: 8 },
  { time: "6 PM", deliveries: 12 },
  { time: "8 PM", deliveries: 15 },
  { time: "10 PM", deliveries: 10 },
];

const chartConfig = {
  deliveries: {
    label: "Deliveries",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function RiderAnalytics() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const totalDeliveries = deliveriesData.reduce((sum, item) => sum + item.deliveries, 0);
  const peakHour = deliveriesData.reduce((prev, current) => 
    prev.deliveries > current.deliveries ? prev : current
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Delivery Analytics
          </h3>
          <p className="text-gray-600 text-sm">
            Track your performance throughout the day
          </p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg w-full sm:w-auto">
          <ArrowUp className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalDeliveries}</div>
              <div className="text-sm text-gray-500">Today&apos;s Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{peakHour.time}</div>
              <div className="text-sm text-gray-500">Peak Hour</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">4.8★</div>
              <div className="text-sm text-gray-500">Avg Rating</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Hourly Deliveries</CardTitle>
            <CardDescription>
              Your delivery pattern for {date ? date.toLocaleDateString() : 'today'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-9 px-3 border-gray-200 hover:bg-gray-50"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? date.toLocaleDateString() : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
          </div>
        </CardHeader>

        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={deliveriesData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                className="stroke-gray-200"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-gray-600"
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="deliveries"
                type="monotone"
                stroke="var(--color-deliveries)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "var(--color-deliveries)",
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: "var(--color-deliveries)",
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>

        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Peak activity at {peakHour.time} with {peakHour.deliveries} deliveries{" "}
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing delivery pattern for the selected day
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}