'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAllStockHistory, StockHistoryWithDetails, fetchProductsForStockManagement, StockProduct } from '@/integrations/supabase/stock'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

export default function StockHistoryPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(50)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stock-history-all', search, dateFrom, dateTo, selectedProduct, selectedUser, page],
    queryFn: () => fetchAllStockHistory({
      search,
      productId: selectedProduct || undefined,
      userId: selectedUser || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit,
      offset: (page - 1) * limit
    })
  })

  const { data: products } = useQuery<StockProduct[]>({
    queryKey: ['products-for-stock-history'],
    queryFn: () => fetchProductsForStockManagement('')
  })

  const history = data?.data || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalChanges = history.length
    const additions = history.filter(h => h.change > 0).length
    const reductions = history.filter(h => h.change < 0).length
    const totalAdded = history.filter(h => h.change > 0).reduce((sum, h) => sum + h.change, 0)
    const totalReduced = Math.abs(history.filter(h => h.change < 0).reduce((sum, h) => sum + h.change, 0))

    return {
      totalChanges,
      additions,
      reductions,
      totalAdded,
      totalReduced
    }
  }, [history])

  const handleExport = () => {
    // Simple CSV export
    const csvData = history.map(item => ({
      Date: format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss'),
      Product: item.product?.name || 'Unknown',
      Variation: item.variation?.name || 'Default',
      Change: item.change,
      'New Quantity': item.new_quantity,
      Reason: item.reason || '',
      User: item.user?.full_name || 'Unknown'
    }))

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <ScrollArea className="h-screen pb-20">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Stock History
                </h1>
                {user && (
                  <p className="text-sm text-gray-600 mt-1">
                    Welcome back, {user.user_metadata?.full_name || user.email}
                  </p>
                )}
              </div>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                Audit Trail
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="bg-white border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Changes</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.totalChanges}</div>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock Additions</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.additions}</div>
                <p className="text-xs text-gray-500 mt-1">+{metrics.totalAdded} units</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock Reductions</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.reductions}</div>
                <p className="text-xs text-gray-500 mt-1">-{metrics.totalReduced} units</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Change</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", {
                  'text-green-600': (metrics.totalAdded - metrics.totalReduced) > 0,
                  'text-red-600': (metrics.totalAdded - metrics.totalReduced) < 0,
                  'text-gray-600': (metrics.totalAdded - metrics.totalReduced) === 0
                })}>
                  {metrics.totalAdded - metrics.totalReduced > 0 ? '+' : ''}{metrics.totalAdded - metrics.totalReduced}
                </div>
                <p className="text-xs text-gray-500 mt-1">units</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Unique Products</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(history.map(h => h.product?.id).filter(Boolean)).size}
                </div>
                <p className="text-xs text-gray-500 mt-1">Modified</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-600" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search reasons..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All products</SelectItem>
                      {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    placeholder="From date"
                    className="pl-10"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    placeholder="To date"
                    className="pl-10"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSearch('')
                      setDateFrom('')
                      setDateTo('')
                      setSelectedProduct('')
                      setSelectedUser('')
                      setPage(1)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear Filters
                  </Button>
                  {user && (
                    <Button
                      onClick={() => {
                        setSelectedUser(user.id)
                        setPage(1)
                      }}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      <User className="w-4 h-4 mr-2" />
                      My Changes
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Stock Change History
                </CardTitle>
                <div className="text-sm text-gray-500">
                  Showing {history.length} of {totalCount} entries
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No stock history found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Variation</TableHead>
                        <TableHead className="font-semibold">Change</TableHead>
                        <TableHead className="font-semibold">New Quantity</TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item: StockHistoryWithDetails) => (
                        <TableRow key={item.id} className="border-b hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.variation?.name || 'Default'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-2 font-semibold", getChangeColor(item.change))}>
                              {getChangeIcon(item.change)}
                              {item.change > 0 ? '+' : ''}{item.change}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.new_quantity}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={item.reason || 'No reason provided'}>
                              {item.reason || 'No reason provided'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-2", {
                              "font-semibold text-orange-600": item.user?.id === user?.id
                            })}>
                              <User className="h-4 w-4 text-gray-400" />
                              {/* {item.user?. || 'Unknown User'} */}
                              {item.user?.id === user?.id && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  You
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}