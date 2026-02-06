'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/orders';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { DataTable } from '@/components/orders/data-table';
import { ManageRefundDialog } from '@/components/orders/ManageRefundDialog';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { AssignRiderDialog } from '@/components/orders/AssignRiderDialog';
import { CustomerDetailsDialog } from '@/components/orders/CustomerDetailsDialog';
import { RefundByAdminDialog } from '@/components/orders/RefundByAdminDialog';
import { LabelOrderDialog } from '@/components/orders/LabelOrderDialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

import type { OrderStatus } from '@/types/orders';
import { formatLocalDate, parseLocalDate } from '@/lib/format';

export default function WebsiteOrdersPage() {
  const { useAllOrders } = useOrders();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Filters: keep only status and a date selector with modes (today / all / custom)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(
    undefined
  );
  const todayStr = formatLocalDate(new Date());
  const [dateMode, setDateMode] = useState<'today' | 'all' | 'custom'>('today');
  const [dateFrom, setDateFrom] = useState<string | undefined>(todayStr);
  const [dateTo, setDateTo] = useState<string | undefined>(todayStr);

  // Keep UI and queries in sync when mode changes
  useEffect(() => {
    if (dateMode === 'today') {
      const t = formatLocalDate(new Date());
      setDateFrom(t);
      setDateTo(t);
      setPage(1);
    } else if (dateMode === 'all') {
      setDateFrom(undefined);
      setDateTo(undefined);
      setPage(1);
    }
    // For custom, do not overwrite existing dates (user will set them)
  }, [dateMode]);

  // Convert visible inclusive dateTo to exclusive apiDateTo
  const apiDateTo = dateTo
    ? (() => {
        const d = parseLocalDate(dateTo)!;
        d.setDate(d.getDate() + 1);
        return formatLocalDate(d);
      })()
    : undefined;

  // Paginated website orders (respecting selected date range)
  const { data: ordersResponse, isLoading } = useAllOrders({
    filters: {
      isExternal: false,
      status: statusFilter || undefined,
      dateFrom,
      dateTo: apiDateTo,
    },
    pagination: { page, limit },
    sort: { column: 'created_at', direction: 'desc' },
  });

  // Fetch all website orders for metrics (high limit) using same selected date range
  const { data: allWebsiteOrdersResponse } = useAllOrders({
    filters: { isExternal: false, dateFrom, dateTo: apiDateTo },
    pagination: { page: 1, limit: 10000 },
  });

  // Orders array for current page
  const orders = Array.isArray(ordersResponse)
    ? ordersResponse
    : ordersResponse?.data || [];

  // Determine an authoritative total count (prefer unpaginated response used for metrics)
  const authoritativeCount = Array.isArray(allWebsiteOrdersResponse)
    ? allWebsiteOrdersResponse.length
    : (allWebsiteOrdersResponse?.pagination?.total ??
      allWebsiteOrdersResponse?.count ??
      (Array.isArray(ordersResponse)
        ? ordersResponse.length
        : (ordersResponse?.pagination?.total ??
          ordersResponse?.count ??
          orders.length ??
          0)));

  const totalCount = Number(authoritativeCount || 0);

  // If count is available, use it; otherwise, if current page is full, assume there may be more pages
  const hasMore =
    totalCount > page * limit ||
    (orders.length === limit &&
      (!allWebsiteOrdersResponse ||
        (Array.isArray(allWebsiteOrdersResponse)
          ? false
          : allWebsiteOrdersResponse.count === 0)) &&
      (!ordersResponse ||
        (Array.isArray(ordersResponse) ? false : ordersResponse.count === 0)));

  const effectiveTotalPages =
    totalCount > 0
      ? Math.max(1, Math.ceil(totalCount / limit))
      : hasMore
        ? Math.max(1, page + 1)
        : 1;

  // Clamp current page if authoritative counts change and reduce available pages
  useEffect(() => {
    if (page > effectiveTotalPages) setPage(effectiveTotalPages);
  }, [effectiveTotalPages]);

  const rangeStart =
    totalCount === 0
      ? orders.length === 0
        ? 0
        : (page - 1) * limit + 1
      : (page - 1) * limit + 1;
  const rangeEnd = Math.min(
    totalCount > 0 ? totalCount : page * limit,
    page * limit
  );

  // Map backend Order -> table row
  type WebsiteOrderRow = {
    id: string;
    order_number?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
    delivery_address: string;
    delivery_city: string;
    delivery_notes?: string;
    order_date: string;
    delivered_at?: string | null;
    rider_name?: string | null;
    status: OrderStatus;
    total: number;
    payment_method?: string;
    is_paid?: boolean;
  };

  const ordersData: WebsiteOrderRow[] = orders
    .map((o: Order) => ({
      id: o.id,
      order_number: o.order_number || undefined,
      customer_name: (() => {
        const name = `${o.customer_first_name || ''} ${
          o.customer_last_name || ''
        }`.trim();
        return (
          name ||
          (o.customer_email ? o.customer_email.split('@')[0] : 'Customer')
        );
      })(),
      customer_email: o.customer_email || undefined,
      customer_phone: o.customer_phone || '',
      delivery_address: o.delivery_address,
      delivery_city: o.delivery_city,
      delivery_notes: o.delivery_notes || undefined,
      order_date: o.created_at,
      delivered_at: o.delivered_at || null,
      rider_name: (() => {
        const a = (o as any).assignments;
        if (a && Array.isArray(a) && a.length > 0 && a[0].rider) {
          return a[0].rider.full_name || null;
        }
        if (o.rider) return o.rider.full_name || null;
        return null;
      })(),
      status: o.status,
      total: o.total,
      payment_method: o.payment_method || undefined,
      is_paid: o.is_paid,
    }))
    .filter(Boolean);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= effectiveTotalPages) setPage(newPage);
  };

  // Admin helpers / state
  const { useRequestRefundOrder, updateOrderStatus, cancelOrder } = useOrders();
  const _requestRefundOrder = useRequestRefundOrder();
  const [showManageRefund, setShowManageRefund] = useState(false);
  const [showRefundByAdmin, setShowRefundByAdmin] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(
    null
  );
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [orderBeingCancelled, setOrderBeingCancelled] = useState<Order | null>(
    null
  );
  const { hasRole } = useAuth();
  const isAdmin = hasRole && hasRole('admin');

  const columns: ColumnDef<WebsiteOrderRow>[] = [
    {
      accessorKey: 'order_number',
      header: 'ORDER',
      cell: ({ row }) => (
        <span className="text-text-primary">
          #{row.getValue('order_number') || row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'order_date',
      header: 'DATE',
      cell: ({ row }) =>
        format(new Date(row.getValue('order_date')), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'delivered_at',
      header: 'DELIVERY',
      cell: ({ row }) => {
        const d = row.getValue('delivered_at');
        return d ? format(new Date(String(d)), 'MMM d, yyyy') : '-';
      },
    },
    {
      accessorKey: 'customer_name',
      header: 'CUSTOMER',
      cell: ({ row }) => (
        <UserAvatarProfile
          user={{
            fullName: row.original.customer_name,
            subTitle: row.original.customer_phone,
          }}
          showInfo
        />
      ),
    },
    {
      accessorKey: 'rider_name',
      header: 'RIDER',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.getValue('rider_name') || 'Unassigned'}
        </div>
      ),
    },
    {
      accessorKey: 'delivery_city',
      header: 'CITY',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('delivery_city')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            className={cn('capitalize font-semibold', {
              'bg-green-500/10 text-green-500': status === 'delivered',
              'bg-yellow-500/10 text-yellow-500':
                status === 'pending' || status === 'processing',
              'bg-red-500/10 text-red-500': status === 'cancelled',
            })}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'total',
      header: 'TOTAL',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue<number>('total').toLocaleString()} RWF
        </div>
      ),
    },
    {
      accessorKey: 'payment_method',
      header: 'PAYMENT',
      cell: ({ row }) => (
        <div className="text-sm capitalize">
          {row.getValue('payment_method') ||
            (row.original.is_paid ? 'Paid' : 'Unpaid')}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        // Removed unused isUpdating state to fix hooks-in-cell error
        // Status changes are now handled directly without local loading state

        const handleCancelOrder = async () => {
          setIsCancelling(true);
          try {
            await cancelOrder.mutateAsync(order.id);
            setShowCancelAlert(false);
          } catch (_err: any) {
            // Error toast is handled by the hook
          } finally {
            setIsCancelling(false);
          }
        };

        const _handleStatusChange = async (newStatus: OrderStatus) => {
          try {
            await updateOrderStatus.mutateAsync({
              id: order.id,
              status: newStatus,
            });
          } catch (_error) {
            console.error('Failed to update order status:', _error);
          }
        };

        const handleAssignRider = () => {
          setAssignOrderId(order.id);
          setShowAssignDialog(true);
        };

        const handleViewOrderDetails = async () => {
          try {
            const resp = await fetch(
              `/api/orders/get?id=${encodeURIComponent(order.id)}`
            );
            const json = await resp.json();
            const fetched = json?.order || null;
            if (!fetched) throw new Error('Order not found');
            setSelectedOrderDetail(fetched as Order);
            setShowOrderDetails(true);
          } catch (_e) {
            console.error('Failed to fetch order details:', _e);
          }
        };

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(order.id)}
                >
                  Copy order ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder({
                      ...order,
                      customer_first_name: order.customer_name.split(' ')[0],
                      customer_last_name: order.customer_name
                        .split(' ')
                        .slice(1)
                        .join(' '),
                      customer_email: order.customer_email || '',
                      customer_phone: order.customer_phone,
                      created_at: order.order_date,
                      updated_at: order.order_date,
                      subtotal: order.total,
                    } as any as Order);
                    setShowCustomerDetails(true);
                  }}
                >
                  View customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewOrderDetails}>
                  View order details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const resp = await fetch(
                        `/api/orders/get?id=${encodeURIComponent(order.id)}`
                      );
                      const json = await resp.json();
                      const fetched = json?.order || null;
                      if (!fetched) throw new Error('Order not found');
                      setSelectedOrder(fetched as Order);
                      setShowManageRefund(true);
                    } catch (_err) {
                      console.error('Manage refund failed:', _err);
                    }
                  }}
                >
                  Manage refund
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const resp = await fetch(
                          `/api/orders/get?id=${encodeURIComponent(order.id)}`
                        );
                        const json = await resp.json();
                        const fetched = json?.order || null;
                        if (!fetched) throw new Error('Order not found');
                        setSelectedOrder(fetched as Order);
                        setShowRefundByAdmin(true);
                      } catch (_err) {
                        console.error('Refund by admin failed:', _err);
                      }
                    }}
                  >
                    Refund By Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {order.status === 'pending' && (
                  <DropdownMenuItem onClick={handleAssignRider}>
                    Assign to rider
                  </DropdownMenuItem>
                )}
                {(order.status === 'assigned' ||
                  order.status === 'processing') && (
                  <DropdownMenuItem onClick={handleAssignRider}>
                    Change rider
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {isAdmin &&
                  (order.status === 'pending' ||
                    order.status === 'processing') && (
                    <DropdownMenuItem
                      onClick={() => {
                        setOrderBeingCancelled({
                          ...order,
                          customer_first_name:
                            order.customer_name.split(' ')[0],
                          customer_last_name: order.customer_name
                            .split(' ')
                            .slice(1)
                            .join(' '),
                          customer_email: order.customer_email || '',
                          created_at: order.order_date,
                          updated_at: order.order_date,
                          subtotal: order.total,
                        } as any as Order);
                        setShowCancelAlert(true);
                      }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      Cancel Order
                    </DropdownMenuItem>
                  )}
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const resp = await fetch(
                          `/api/orders/get?id=${encodeURIComponent(order.id)}`
                        );
                        const json = await resp.json();
                        const fetched = json?.order || null;
                        if (!fetched) throw new Error('Order not found');
                        setSelectedOrder(fetched as Order);
                        setShowLabelDialog(true);
                      } catch (_err) {
                        console.error('Label order failed:', _err);
                      }
                    }}
                  >
                    Label Order
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <CustomerDetailsDialog
              open={showCustomerDetails && selectedOrder?.id === order.id}
              onOpenChange={(open: boolean) => {
                setShowCustomerDetails(open);
                if (!open) setSelectedOrder(null);
              }}
              customer={{
                firstName:
                  selectedOrder?.customer_first_name ||
                  order.customer_name.split(' ')[0],
                lastName:
                  selectedOrder?.customer_last_name ||
                  order.customer_name.split(' ').slice(1).join(' '),
                email:
                  selectedOrder?.customer_email || order.customer_email || '',
                phone:
                  selectedOrder?.customer_phone || order.customer_phone || '',
              }}
            />

            {selectedOrderDetail && (
              <OrderDetailsDialog
                open={showOrderDetails && selectedOrderDetail?.id === order.id}
                onOpenChange={(open: boolean) => {
                  setShowOrderDetails(open);
                  if (!open) setSelectedOrderDetail(null);
                }}
                order={selectedOrderDetail}
              />
            )}

            {selectedOrder && (
              <ManageRefundDialog
                open={showManageRefund && selectedOrder?.id === order.id}
                onOpenChange={(open: boolean) => {
                  setShowManageRefund(open);
                  if (!open) setSelectedOrder(null);
                }}
                order={selectedOrder}
              />
            )}

            {isAdmin && selectedOrder && (
              <RefundByAdminDialog
                open={showRefundByAdmin && selectedOrder?.id === order.id}
                onOpenChange={(open: boolean) => {
                  setShowRefundByAdmin(open);
                  if (!open) setSelectedOrder(null);
                }}
                order={selectedOrder}
              />
            )}

            <AssignRiderDialog
              open={showAssignDialog && assignOrderId === order.id}
              onOpenChange={(open: boolean) => {
                setShowAssignDialog(open);
                if (!open) setAssignOrderId(null);
              }}
              orderId={assignOrderId ?? ''}
            />

            {isAdmin && selectedOrder && (
              <LabelOrderDialog
                open={showLabelDialog && selectedOrder?.id === order.id}
                onOpenChange={(open: boolean) => {
                  setShowLabelDialog(open);
                  if (!open) setSelectedOrder(null);
                }}
                order={selectedOrder}
              />
            )}

            <AlertDialog
              open={showCancelAlert && orderBeingCancelled?.id === order.id}
              onOpenChange={(open: boolean) => {
                setShowCancelAlert(open);
                if (!open) setOrderBeingCancelled(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel order #{order.id}? This
                    action cannot be undone and will set the order status to
                    "cancelled".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isCancelling}>
                    No, keep order
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isCancelling ? 'Cancelling...' : 'Yes, cancel order'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      },
    },
  ];

  return (
    <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
      <div className="px-5 sm:px-10 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#023337]">
              Website Orders
            </h1>
            <p className="text-gray-600">
              Manage orders placed directly through the website (excluding
              external/manual orders)
            </p>
          </div>
        </div>

        {/* Website orders metrics */}
        <div className="mb-6">
          {(() => {
            const allOrders = (
              Array.isArray(allWebsiteOrdersResponse)
                ? allWebsiteOrdersResponse
                : allWebsiteOrdersResponse?.data || []
            ) as Order[];
            const total = Array.isArray(allWebsiteOrdersResponse)
              ? allWebsiteOrdersResponse.length
              : (allWebsiteOrdersResponse?.pagination?.total ??
                allWebsiteOrdersResponse?.count ??
                allOrders.length);
            const pending = allOrders.filter(
              o => o.status === 'pending'
            ).length;
            const processing = allOrders.filter(
              o => o.status === 'processing'
            ).length;
            const delivered = allOrders.filter(
              o => o.status === 'delivered'
            ).length;
            const shipped = allOrders.filter(
              o => o.status === 'shipped'
            ).length;
            const _cancelled = allOrders.filter(
              o => o.status === 'cancelled'
            ).length;

            const newOrders = pending + processing;
            const completed = delivered + shipped;
            const completedValue = allOrders
              .filter(o => o.status === 'delivered' || o.status === 'shipped')
              .reduce((sum, o) => sum + Number(o.total || 0), 0);

            // Total value of all orders in the selected period
            const totalValue = allOrders.reduce(
              (sum, o) => sum + Number(o.total || 0),
              0
            );

            const periodLabel =
              dateMode === 'today'
                ? 'Today'
                : dateMode === 'all'
                  ? 'All time'
                  : dateFrom && dateTo
                    ? `${format(
                        new Date(dateFrom),
                        'MMM d, yyyy'
                      )} - ${format(new Date(dateTo), 'MMM d, yyyy')}`
                    : 'Custom range';

            const metrics = [
              {
                title: 'Total Website Orders',
                value: total.toLocaleString(),
                period: periodLabel,
              },
              {
                title: 'New',
                value: newOrders.toLocaleString(),
                period: `${periodLabel} • Pending / Processing`,
              },
              {
                title: 'Completed',
                value: completed.toLocaleString(),
                secondary: `${completedValue.toLocaleString()} RWF`,
                period: `${periodLabel} • Delivered`,
              },
              {
                title: 'Total Orders Value (selected period)',
                value: `${totalValue.toLocaleString()} RWF`,
                period: periodLabel,
              },
            ];

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="relative">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="h-5 bg-gray-200 rounded w-28 animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : metrics.map(m => (
                      <Card key={m.title} className="relative">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <h3 className="text-lg text-[#23272E] font-semibold">
                            {m.title}
                          </h3>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 flex items-end gap-2">
                            <div className="text-3xl font-bold text-[#023337]">
                              {m.value}
                            </div>
                            {m.secondary && (
                              <div className="text-sm text-muted-foreground ml-2">
                                {m.secondary}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {m.period}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </div>
            );
          })()}
        </div>

        {/* Filters: date selector (today / all / custom) + status */}
        <div className="bg-white p-4 rounded-lg mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm">Date</label>
              <select
                aria-label="Date range"
                value={dateMode}
                onChange={e => {
                  setDateMode(e.target.value as 'today' | 'all' | 'custom');
                  setPage(1);
                }}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="today">Today</option>
                <option value="all">All time</option>
                <option value="custom">Custom range</option>
              </select>
              {dateMode === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={dateFrom || ''}
                    onChange={e => {
                      setDateFrom(e.target.value || undefined);
                      setPage(1);
                    }}
                    className="max-w-[150px]"
                  />
                  <Input
                    type="date"
                    value={dateTo || ''}
                    onChange={e => {
                      setDateTo(e.target.value || undefined);
                      setPage(1);
                    }}
                    className="max-w-[150px]"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm">Status</label>
              <select
                aria-label="Order status filter"
                title="Order status filter"
                value={statusFilter || 'all'}
                onChange={e => {
                  const v = e.target.value;
                  setStatusFilter(v === 'all' ? undefined : (v as OrderStatus));
                  setPage(1);
                }}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="delivered">Delivered</option>
                <option value="shipped">Shipped</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="text-sm text-muted-foreground">
                Showing {rangeStart}-{rangeEnd} of {totalCount}
              </div>
              <select
                value={limit}
                onChange={e => {
                  const v = Number(e.target.value) || 50;
                  setLimit(v);
                  setPage(1);
                }}
                className="rounded border px-2 py-1 text-sm"
                aria-label="Rows per page"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <Button variant="outline">Export</Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg">
          <DataTable columns={columns} data={ordersData} />
        </div>

        {/* No dialogs here - they are handled inline with each row action */}

        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    handlePageChange(page - 1);
                  }}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const maxVisible = 5;
                const tp = effectiveTotalPages;

                if (tp <= maxVisible) {
                  for (let i = 1; i <= tp; i++) pages.push(i);
                } else {
                  // Always show first page
                  pages.push(1);

                  // Show leading ellipsis when current page is sufficiently far from start
                  if (page > 3) pages.push('ellipsis');

                  // Show pages around current page
                  const start = Math.max(2, page - 1);
                  const end = Math.min(tp - 1, page + 1);
                  for (let i = start; i <= end; i++) pages.push(i);

                  // Show trailing ellipsis when current page is sufficiently far from end
                  if (page < tp - 2) pages.push('ellipsis');

                  // Always show last page
                  if (tp > 1) pages.push(tp);
                }

                return pages.map((p, idx) => {
                  if (p === 'ellipsis') {
                    return (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={e => {
                          e.preventDefault();
                          handlePageChange(p as number);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                });
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    handlePageChange(page + 1);
                  }}
                  className={
                    page === effectiveTotalPages
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </ScrollArea>
  );
}
