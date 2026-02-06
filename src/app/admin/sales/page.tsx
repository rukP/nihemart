'use client';

import { FC, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import {
  getSalesMetrics,
  getSalesChartData,
  getSalesByCategory,
  getTopProducts,
  getSalesByRegion,
} from '@/lib/api/sales';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="sales">
      <SalesContent />
    </ProtectedRoute>
  );
};

function SalesContent() {
  const router = useRouter();
  const [dateRange, _setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch sales metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['sales-metrics', dateRange.from, dateRange.to],
    queryFn: () => getSalesMetrics(dateRange.from, dateRange.to),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['sales-chart', dateRange.from, dateRange.to],
    queryFn: () => getSalesChartData(dateRange.from, dateRange.to, 'day'),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch category data
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['sales-categories', dateRange.from, dateRange.to],
    queryFn: () => getSalesByCategory(dateRange.from, dateRange.to),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch top products
  const { data: topProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ['sales-top-products', dateRange.from, dateRange.to],
    queryFn: () => getTopProducts(dateRange.from, dateRange.to, 5),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch regional data
  const { data: regionalData, isLoading: regionalLoading } = useQuery({
    queryKey: ['sales-regions', dateRange.from, dateRange.to],
    queryFn: () => getSalesByRegion(dateRange.from, dateRange.to),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const salesMetrics = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Revenue',
        value: `RWF ${metrics.totalRevenue.toLocaleString()}`,
        change: '+0%',
        isPositive: true,
        icon: DollarSign,
        period: `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`,
      },
      {
        title: 'Total Orders',
        value: metrics.totalOrders.toLocaleString(),
        change: '+0%',
        isPositive: true,
        icon: ShoppingCart,
        period: `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`,
      },
      {
        title: 'Active Customers',
        value: metrics.totalCustomers.toLocaleString(),
        change: '+0%',
        isPositive: true,
        icon: Users,
        period: `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`,
      },
      {
        title: 'Refunds',
        value: `RWF ${metrics.refunds.toLocaleString()}`,
        change: '-0%',
        isPositive: metrics.refunds === 0,
        icon: TrendingDown,
        period: `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`,
      },
    ];
  }, [metrics, dateRange]);

  const salesChartConfig: ChartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(142, 76%, 36%)',
    },
    orders: {
      label: 'Orders',
      color: 'hsl(221, 83%, 53%)',
    },
  };

  const categoryChartConfig: ChartConfig = {
    sales: {
      label: 'Sales',
      color: 'hsl(47, 96%, 53%)',
    },
  };

  const handleExport = () => {
    router.push('/admin/sales/reports');
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchMetrics()}
              disabled={metricsLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
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
                {metricsLoading ? (
                  <div className="text-2xl font-bold text-gray-900 animate-pulse">
                    Loading...
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </div>
                    <div className="flex items-center text-xs text-gray-600 mt-1">
                      <span
                        className={`flex items-center ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}
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
                  </>
                )}
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
              <CardDescription>Daily performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : chartData && chartData.length > 0 ? (
                <ChartContainer config={salesChartConfig} className="h-[300px]">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={value => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="hsl(142, 76%, 36%)"
                      fill="hsl(142, 76%, 36%)"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stackId="2"
                      stroke="hsl(221, 83%, 53%)"
                      fill="hsl(221, 83%, 53%)"
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

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Sales by Category
              </CardTitle>
              <CardDescription>Product category performance</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : categoryData && categoryData.length > 0 ? (
                <ChartContainer
                  config={categoryChartConfig}
                  className="h-[300px]"
                >
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoryName" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(47, 96%, 53%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No category data available
                </div>
              )}
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
                Top performing products in this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="h-16 bg-gray-100 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : topProductsData && topProductsData.length > 0 ? (
                <div className="space-y-4">
                  {topProductsData.map((product, _index) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.productName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.unitsSold} units sold · {product.orders}{' '}
                            orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          RWF {product.revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Avg: RWF {product.averagePrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No product data available
                </div>
              )}
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
              {regionalLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : regionalData && regionalData.length > 0 ? (
                <div className="space-y-4">
                  {regionalData.slice(0, 4).map((region, index) => (
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
                        <p className="text-sm font-semibold">
                          {region.orders} orders
                        </p>
                        <p className="text-xs text-gray-600">
                          {region.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No regional data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

export default page;
