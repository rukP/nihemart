"use client";

import { FC, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  MapPin,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useQuery } from "@tanstack/react-query";
import {
  getSalesReport,
  type SalesReportOptions,
} from "@/lib/api/sales";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const COLORS = [
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(47, 96%, 53%)",
  "hsl(25, 95%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 100%, 70%)",
  "hsl(142, 71%, 45%)",
];

export default function SalesReportsPage() {
  return (
    <ProtectedRoute requiredSection="sales">
      <SalesReportsContent />
    </ProtectedRoute>
  );
}

function SalesReportsContent() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const reportOptions: SalesReportOptions = {
    dateFrom,
    dateTo,
    groupBy,
    includeCategories: true,
    includeProducts: true,
    includeRegions: true,
    limit: 20,
  };

  const {
    data: report,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sales-report", dateFrom, dateTo, groupBy],
    queryFn: () => getSalesReport(reportOptions),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const handleExportCSV = () => {
    if (!report) {
      toast.error("No report data available");
      return;
    }

    // Create CSV content
    let csv = "Sales Report\n\n";
    csv += `Period: ${format(dateFrom, "MMM dd, yyyy")} - ${format(dateTo, "MMM dd, yyyy")}\n\n`;
    csv += "Metrics\n";
    csv += `Total Revenue,${report.metrics.totalRevenue}\n`;
    csv += `Total Orders,${report.metrics.totalOrders}\n`;
    csv += `Average Order Value,${report.metrics.averageOrderValue.toFixed(2)}\n`;
    csv += `Total Customers,${report.metrics.totalCustomers}\n`;
    csv += `Refunds,${report.metrics.refunds}\n`;
    csv += `Net Revenue,${report.metrics.netRevenue}\n\n`;

    if (report.topProducts && report.topProducts.length > 0) {
      csv += "Top Products\n";
      csv += "Product Name,Revenue,Orders,Units Sold,Average Price\n";
      report.topProducts.forEach((product) => {
        csv += `${product.productName},${product.revenue},${product.orders},${product.unitsSold},${product.averagePrice.toFixed(2)}\n`;
      });
      csv += "\n";
    }

    if (report.categories && report.categories.length > 0) {
      csv += "Sales by Category\n";
      csv += "Category,Revenue,Orders,Units Sold,Percentage\n";
      report.categories.forEach((cat) => {
        csv += `${cat.categoryName},${cat.revenue},${cat.orders},${cat.unitsSold},${cat.percentage.toFixed(2)}%\n`;
      });
      csv += "\n";
    }

    if (report.regions && report.regions.length > 0) {
      csv += "Sales by Region\n";
      csv += "Region,Revenue,Orders,Customers,Percentage\n";
      report.regions.forEach((region) => {
        csv += `${region.region},${region.revenue},${region.orders},${region.customers},${region.percentage.toFixed(2)}%\n`;
      });
    }

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Report exported successfully");
  };

  const chartConfig: ChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(142, 76%, 36%)",
    },
    orders: {
      label: "Orders",
      color: "hsl(221, 83%, 53%)",
    },
  };

  const quickDateRanges = [
    {
      label: "Today",
      from: new Date(),
      to: new Date(),
    },
    {
      label: "Last 7 Days",
      from: subDays(new Date(), 7),
      to: new Date(),
    },
    {
      label: "Last 30 Days",
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    {
      label: "This Month",
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    },
    {
      label: "Last Month",
      from: startOfMonth(subDays(new Date(), 30)),
      to: endOfMonth(subDays(new Date(), 30)),
    },
    {
      label: "This Week",
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    },
  ];

  return (
    <div className="h-screen pb-20">
      <div className="bg-gray-50 p-4 sm:p-6 w-full">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Sales Reports
                </h1>
                <p className="text-sm text-gray-600">
                  Comprehensive sales analysis and insights
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleExportCSV}
                disabled={!report || isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Report Filters</CardTitle>
              <CardDescription>
                Select date range and grouping options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quick Select
                  </label>
                  <Select
                    onValueChange={(value) => {
                      const range = quickDateRanges.find((r) => r.label === value);
                      if (range) {
                        setDateFrom(range.from);
                        setDateTo(range.to);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Quick select" />
                    </SelectTrigger>
                    <SelectContent>
                      {quickDateRanges.map((range) => (
                        <SelectItem key={range.label} value={range.label}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    From Date
                  </label>
                  <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(dateFrom, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => {
                          if (date) {
                            setDateFrom(date);
                            setDateFromOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    To Date
                  </label>
                  <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(dateTo, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => {
                          if (date) {
                            setDateTo(date);
                            setDateToOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Group By
                  </label>
                  <Select
                    value={groupBy}
                    onValueChange={(value) =>
                      setGroupBy(value as "day" | "week" | "month")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
              <span className="ml-2">Loading report...</span>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Metrics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      RWF {report.metrics.totalRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Gross revenue</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Net Revenue
                    </CardTitle>
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      RWF {report.metrics.netRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      After refunds
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                    <ShoppingCart className="h-5 w-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {report.metrics.totalOrders}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      AOV: RWF{" "}
                      {report.metrics.averageOrderValue.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Customers
                    </CardTitle>
                    <Package className="h-5 w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {report.metrics.totalCustomers}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Unique customers</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue & Orders Trend</CardTitle>
                    <CardDescription>
                      {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}ly
                      performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.chartData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <AreaChart data={report.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) =>
                              format(new Date(value), groupBy === "month" ? "MMM" : groupBy === "week" ? "MMM dd" : "MMM dd")
                            }
                          />
                          <YAxis />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(142, 76%, 36%)"
                            fill="hsl(142, 76%, 36%)"
                            fillOpacity={0.6}
                          />
                          <Area
                            type="monotone"
                            dataKey="orders"
                            stroke="hsl(221, 83%, 53%)"
                            fill="hsl(221, 83%, 53%)"
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Revenue distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.categories && report.categories.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <PieChart>
                          <Pie
                            data={report.categories.slice(0, 6)}
                            dataKey="revenue"
                            nameKey="categoryName"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {report.categories.slice(0, 6).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No category data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Products Table */}
              {report.topProducts && report.topProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>
                      Best performing products in this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right">
                              Avg Price
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.topProducts.map((product) => (
                            <TableRow key={product.productId}>
                              <TableCell className="font-medium">
                                {product.productName}
                              </TableCell>
                              <TableCell className="text-right">
                                RWF {product.revenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.orders}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.unitsSold}
                              </TableCell>
                              <TableCell className="text-right">
                                RWF {product.averagePrice.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Categories Table */}
              {report.categories && report.categories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>
                      Detailed category performance breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.categories.map((category) => (
                            <TableRow key={category.categoryId}>
                              <TableCell className="font-medium">
                                {category.categoryName}
                              </TableCell>
                              <TableCell className="text-right">
                                RWF {category.revenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {category.orders}
                              </TableCell>
                              <TableCell className="text-right">
                                {category.unitsSold}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">
                                  {category.percentage.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Regions Table */}
              {report.regions && report.regions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Region</CardTitle>
                    <CardDescription>
                      Geographic sales distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Customers</TableHead>
                            <TableHead className="text-right">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.regions.map((region, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-orange-500" />
                                  {region.region}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                RWF {region.revenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {region.orders}
                              </TableCell>
                              <TableCell className="text-right">
                                {region.customers}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">
                                  {region.percentage.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No report data available. Try adjusting your filters.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
