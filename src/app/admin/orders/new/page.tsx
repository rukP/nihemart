"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Download, Search, Filter, Loader2, Package, Bell, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/orders/data-table"
import { useOrders } from '@/hooks/useOrders'
import { columns } from "@/components/orders/columns"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const AdminNewOrdersPage: React.FC = () => {
  const { useAllOrders } = useOrders()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: ordersData, isLoading, isError, error } = useAllOrders({
    filters: {
      status: 'pending', // Only show pending (new) orders
      search: search || undefined,
    },
    pagination: { page, limit },
    sort: { column: 'created_at', direction: 'desc' },
  })

  const orders = ordersData?.data || []
  const totalCount = ordersData?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // Get page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  // Calculate stats for new orders
  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at)
    const today = new Date()
    return orderDate.toDateString() === today.toDateString()
  }).length

  const totalValue = orders.reduce((sum, order) => sum + order.total, 0)

  if (isError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading New Orders</h3>
            <p className="text-gray-600">{error?.message || 'Failed to load orders. Please try again.'}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="h-6 w-6 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">New Orders</h1>
          <Badge variant="secondary" className="bg-orange-100 text-orange-600">
            {totalCount} pending
          </Badge>
        </div>
        <p className="text-gray-600">
          Manage and process new incoming orders that require attention.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Total New Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
            <p className="text-sm text-gray-500">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Today&apos;s Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{todayOrders}</div>
            <p className="text-sm text-gray-500">Orders placed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalValue.toLocaleString()} RWF
            </div>
            <p className="text-sm text-gray-500">Pending orders value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                New Orders List
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Process these orders to move them to the next stage.
              </p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders, customers..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
              </div>
              
              {/* Export Button */}
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-3">Loading new orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {search ? 'No orders found' : 'No new orders'}
              </h3>
              <p className="text-gray-500 mb-4">
                {search 
                  ? 'Try adjusting your search terms'
                  : 'All caught up! No pending orders at the moment.'
                }
              </p>
              {search && (
                <Button variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={orders} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); handlePageChange(page - 1); }} 
                          className={page === 1 ? 'pointer-events-none opacity-50' : ''} 
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink 
                            href="#" 
                            isActive={p === page}
                            onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      {page + 2 < totalPages && (
                        <PaginationItem>
                          <span className="px-3 py-1">...</span>
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); handlePageChange(page + 1); }} 
                          className={page === totalPages ? 'pointer-events-none opacity-50' : ''} 
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} orders
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-800">
            ← Back to all orders
          </Link>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline">
            Bulk Actions
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminNewOrdersPage