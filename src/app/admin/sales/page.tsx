"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="sales">
      <SalesContent />
    </ProtectedRoute>
  );
};

function SalesContent() {
  // Mock data for sales metrics
  const salesMetrics = [
    {
      title: "Total Revenue",
      value: "Rwf 2,450,000",
      change: "+12.5%",
      isPositive: true,
      icon: DollarSign,
      period: "Last 30 days",
    },
    {
      title: "Total Orders",
      value: "1,247",
      change: "+8.2%",
      isPositive: true,
      icon: ShoppingCart,
      period: "Last 30 days",
    },
    {
      title: "Active Customers",
      value: "892",
      change: "+15.3%",
      isPositive: true,
      icon: Users,
      period: "Last 30 days",
    },
    {
      title: "Refunds",
      value: "Rwf 45,200",
      change: "-2.1%",
      isPositive: true,
      icon: TrendingDown,
      period: "Last 30 days",
    },
  ];

  // Mock data for sales chart
  const salesChartData = [
    { day: "Mon", revenue: 45000, orders: 45 },
    { day: "Tue", revenue: 52000, orders: 52 },
    { day: "Wed", revenue: 48000, orders: 48 },
    { day: "Thu", revenue: 61000, orders: 61 },
    { day: "Fri", revenue: 55000, orders: 55 },
    { day: "Sat", revenue: 67000, orders: 67 },
    { day: "Sun", revenue: 58000, orders: 58 },
  ];

  const salesChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    orders: {
      label: "Orders",
      color: "hsl(var(--chart-2))",
    },
  };

  // Mock data for top products
  const topProducts = [
    { name: "Wireless Headphones", sales: 145, revenue: 87000, growth: "+23%" },
    { name: "Smart Watch", sales: 98, revenue: 58800, growth: "+18%" },
    { name: "Laptop Stand", sales: 87, revenue: 26100, growth: "+12%" },
    { name: "USB Cable", sales: 76, revenue: 11400, growth: "+8%" },
    { name: "Phone Case", sales: 65, revenue: 9750, growth: "+5%" },
  ];

  // Mock data for category performance
  const categoryData = [
    { category: "Electronics", sales: 450, percentage: 45 },
    { category: "Accessories", sales: 320, percentage: 32 },
    { category: "Clothing", sales: 150, percentage: 15 },
    { category: "Home", sales: 80, percentage: 8 },
  ];

  const categoryChartConfig = {
    sales: {
      label: "Sales",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <ScrollArea className="h-screen pb-20">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sales Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Track your sales performance and insights
            </p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {salesMetrics.map((metric, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-orange-500" />
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
                      <TrendingDown className="w-3 h-3 mr-1" />
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
          {/* Sales Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Revenue & Orders Trend
              </CardTitle>
              <CardDescription>Weekly performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={salesChartConfig} className="h-[300px]">
                <AreaChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Sales by Category
              </CardTitle>
              <CardDescription>Product category performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={categoryChartConfig}
                className="h-[300px]"
              >
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="sales"
                    fill="hsl(var(--chart-3))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Best Selling Products
              </CardTitle>
              <CardDescription>
                Top performing products this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {product.sales} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        Rwf {product.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-green-600">{product.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Regional Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Regional Sales
              </CardTitle>
              <CardDescription>Sales distribution by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { region: "Kigali", sales: 450, percentage: 45 },
                  { region: "Northern", sales: 280, percentage: 28 },
                  { region: "Southern", sales: 180, percentage: 18 },
                  { region: "Eastern", sales: 90, percentage: 9 },
                ].map((region, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">
                        {region.region}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{region.sales}</p>
                      <p className="text-xs text-gray-600">
                        {region.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

export default page;
