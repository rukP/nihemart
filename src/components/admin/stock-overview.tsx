'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Package, AlertTriangle, ShoppingCart, Truck, TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchProductsForStockManagement } from '@/integrations/supabase/stock'
import { useOrders } from '@/hooks/useOrders'
import { useRouter } from 'next/navigation'

const stockChartConfig = {
  inStock: {
    label: "In Stock",
    color: "hsl(142, 76%, 36%)",
  },
  lowStock: {
    label: "Low Stock",
    color: "hsl(38, 92%, 50%)",
  },
  outOfStock: {
    label: "Out of Stock",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig

const ordersChartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig

export default function StockOverview({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const router = useRouter()
  const { useOrderStats } = useOrders()
  const { data: orderStats } = useOrderStats()

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-stock-overview'],
    queryFn: async () => {
      // Fetch all products for overview (no pagination needed for summary stats)
      const result = await fetchProductsForStockManagement(); // Large limit for overview
      return result
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - more frequent updates for accurate data
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnReconnect: true,
    refetchInterval: 10 * 60 * 1000, // Background refetch every 10 minutes
    refetchIntervalInBackground: true,
  })

  const products = productsData || [];

  const ordersQuery = useOrders().useAllOrders()
  const orders = ordersQuery.data?.data || []

  // Calculate real metrics
  const metrics = (() => {
    const totalProducts = products.length
    let totalVariations = 0
    let inStockVariations = 0
    let lowStockVariations = 0
    let outOfStockVariations = 0

    products.forEach(product => {
      if (product.variations.length > 0) {
        // Product has variations
        totalVariations += product.variations.length
        inStockVariations += product.variations.filter(v => v.stock > 0).length
        lowStockVariations += product.variations.filter(v => v.stock > 0 && v.stock <= 10).length
        outOfStockVariations += product.variations.filter(v => v.stock <= 0).length
      } else {
        // Product without variations - count as 1 item
        totalVariations += 1
        const stock = product.stock || 0
        if (stock > 0) {
          if (stock <= 10) {
            lowStockVariations += 1
          } else {
            inStockVariations += 1
          }
        } else {
          outOfStockVariations += 1
        }
      }
    })

    const totalStockValue = products.reduce((total, product) => {
      if (product.variations.length > 0) {
        return total + product.variations.reduce((varTotal, variation) => {
          return varTotal + ((variation.price || 0) * variation.stock);
        }, 0);
      } else {
        return total + ((product.price || 0) * (product.stock || 0));
      }
    }, 0);

    return {
      totalProducts,
      totalVariations,
      inStockVariations,
      lowStockVariations,
      outOfStockVariations,
      totalStockValue
    }
  })()

  // Prepare chart data for stock levels (current data)
  const stockChartData = [
    { month: 'Current', inStock: metrics.inStockVariations, lowStock: metrics.lowStockVariations, outOfStock: metrics.outOfStockVariations },
  ]

  // Prepare orders chart data from real data - show fulfillment rate over time
  const ordersChartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fulfillmentCounts: Record<string, { total: number, fulfilled: number }> = {};

    orders.forEach((order: any) => {
      const date = new Date(order.created_at);
      const month = monthNames[date.getMonth()];
      if (!fulfillmentCounts[month]) {
        fulfillmentCounts[month] = { total: 0, fulfilled: 0 };
      }
      fulfillmentCounts[month].total += 1;
      if (order.status === 'delivered') {
        fulfillmentCounts[month].fulfilled += 1;
      }
    });

    return monthNames.map(month => ({
      month,
      orders: fulfillmentCounts[month]?.fulfilled || 0
    }));
  }, [orders])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <Card className="bg-white border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
            <Package className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.totalVariations} variations</p>
          </CardContent>
        </Card>

        {/* In Stock */}
        <Card className="bg-white border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Stock</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.inStockVariations}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.totalVariations > 0 ? Math.round((metrics.inStockVariations / metrics.totalVariations) * 100) : 0}% available
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="bg-white border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.lowStockVariations}</div>
            <p className="text-xs text-gray-500 mt-1">Need restocking</p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card className="bg-white border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.outOfStockVariations}</div>
            <p className="text-xs text-gray-500 mt-1">Unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels Chart */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">Stock Levels Trend</CardTitle>
              <div className="text-lg font-bold mt-2 text-orange-600">
                {metrics.inStockVariations + metrics.lowStockVariations} Active
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
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
            <ChartContainer config={stockChartConfig}>
              <BarChart
                accessibilityLayer
                data={stockChartData}
                height={200}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: '#888' }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="inStock" fill="var(--color-inStock)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lowStock" fill="var(--color-lowStock)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="outOfStock" fill="var(--color-outOfStock)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">Order Fulfillment</CardTitle>
                 <div className="text-lg font-bold mt-2 text-blue-600">
                   {orders.filter((order: any) => order.status === 'delivered').length} Completed
                 </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
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
            <ChartContainer config={ordersChartConfig}>
              <AreaChart
                accessibilityLayer
                data={ordersChartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
                height={200}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: '#888' }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Area
                  dataKey="orders"
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500 rounded-full">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Stock</h3>
                <p className="text-sm text-gray-600">Update inventory levels</p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => onTabChange?.('stock-levels')}
            >
              Go to Stock Levels
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-full">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Process Orders</h3>
                <p className="text-sm text-gray-600">Handle customer orders</p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => onTabChange?.('orders')}
            >
              Go to Orders
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
                <h3 className="font-semibold text-gray-900">View History</h3>
                <p className="text-sm text-gray-600">Audit trail & reports</p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => onTabChange?.('history')}
            >
              Go to History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}