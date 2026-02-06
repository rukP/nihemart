'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable } from '@/components/orders/data-table';
import TimeFilter from '@/components/ui/time-filter';
import { useTimeFilter } from '@/hooks/useTimeFilter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/format';
import { Loader2 } from 'lucide-react';

export default function RefundsHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <RefundsHistoryContent />
    </Suspense>
  );
}

function RefundsHistoryContent() {
  // Use the custom hook for time filter - handles URL sync without infinite loops
  const { timeFilter, setTimeFilter, apiDateRange } = useTimeFilter({
    persistToUrl: true,
    defaultPreset: 'today',
  });

  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const df = apiDateRange.dateFrom;
      const dt = apiDateRange.dateTo;
      const [itemsRes, ordersRes] = await Promise.all([
        fetch(
          `/api/admin/refunds?limit=100&page=1${df ? `&dateFrom=${df}` : ''}${dt ? `&dateTo=${dt}` : ''}`
        ),
        fetch(
          `/api/admin/refunds?type=orders&limit=100&page=1${df ? `&dateFrom=${df}` : ''}${dt ? `&dateTo=${dt}` : ''}`
        ),
      ]);
      if (!itemsRes.ok) throw new Error('Failed to fetch item refunds');
      if (!ordersRes.ok) throw new Error('Failed to fetch order refunds');
      const itemsJson = await itemsRes.json();
      const ordersJson = await ordersRes.json();
      setItems(itemsJson.data || []);
      setOrders(ordersJson.data || []);
    } catch (err: any) {
      console.error('Failed to fetch refund history:', err);
      toast.error(err?.message || 'Failed to load refund history');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when date range changes (apiDateRange is stable, changes only on real filter changes)
  useEffect(() => {
    fetchHistory();
  }, [apiDateRange.dateFrom, apiDateRange.dateTo]);

  const itemColumns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      {
        id: 'product',
        header: 'PRODUCT',
        cell: ({ row }: any) =>
          row.original.product?.name || row.original.product_name || '-',
      },
      {
        id: 'order',
        header: 'ORDER',
        cell: ({ row }: any) =>
          row.original.order?.order_number || row.original.order_id || '-',
      },
      { accessorKey: 'quantity', header: 'QTY' },
      { accessorKey: 'refund_status', header: 'STATUS' },
      {
        id: 'reason',
        header: 'REASON',
        cell: ({ row }: any) => row.original.refund_reason || '-',
      },
    ],
    []
  );

  const orderColumns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      {
        id: 'order_number',
        header: 'ORDER',
        cell: ({ row }: any) => row.original.order_number || row.original.id,
      },
      {
        id: 'customer',
        header: 'CUSTOMER',
        cell: ({ row }: any) =>
          `${row.original.customer_first_name || ''} ${
            row.original.customer_last_name || ''
          }`,
      },
      {
        accessorKey: 'total',
        header: 'AMOUNT',
        cell: ({ row }: any) => `${row.getValue('total') || 0} RWF`,
      },
      { accessorKey: 'refund_status', header: 'STATUS' },
      {
        id: 'reason',
        header: 'REASON',
        cell: ({ row }: any) => row.original.refund_reason || '-',
      },
    ],
    []
  );

  return (
    <ScrollArea className="h-screen pb-20">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">
              Refund History
            </div>
            <div className="flex items-center gap-4">
              <div>
                <TimeFilter
                  value={timeFilter}
                  onChange={v => setTimeFilter(v)}
                />
              </div>

              {/* Visible active dates for clarity */}
              <div className="text-sm text-slate-600">
                {timeFilter?.from
                  ? `From: ${formatLocalDate(timeFilter.from)}`
                  : 'From: —'}
                {' \u00A0\u00A0'}
                {timeFilter?.to
                  ? `To: ${formatLocalDate(new Date(new Date(timeFilter.to).setDate(new Date(timeFilter.to).getDate() - 1)))}`
                  : 'To: —'}
              </div>

              <Button
                aria-label="Export refund CSVs"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={async () => {
                  try {
                    setExporting(true);
                    // Use the same date range as fetchHistory
                    const df = apiDateRange.dateFrom;
                    const dt = apiDateRange.dateTo;

                    const [itemsRes, ordersRes] = await Promise.all([
                      fetch(
                        `/api/admin/refunds?limit=1000&page=1${df ? `&dateFrom=${df}` : ''}${dt ? `&dateTo=${dt}` : ''}`
                      ),
                      fetch(
                        `/api/admin/refunds?type=orders&limit=1000&page=1${df ? `&dateFrom=${df}` : ''}${dt ? `&dateTo=${dt}` : ''}`
                      ),
                    ]);

                    if (!itemsRes.ok)
                      throw new Error(
                        'Failed to fetch item refunds for export'
                      );
                    if (!ordersRes.ok)
                      throw new Error(
                        'Failed to fetch order refunds for export'
                      );

                    const itemsJson = await itemsRes.json();
                    const ordersJson = await ordersRes.json();

                    const { arrayToCsv, downloadCsv } =
                      await import('@/lib/export');

                    const itemsCols = [
                      { key: 'id', header: 'ID' },
                      {
                        key: 'product_name',
                        header: 'Product',
                        transform: (r: any) =>
                          r.product?.name || r.product_name || '',
                      },
                      {
                        key: 'order_id',
                        header: 'Order',
                        transform: (r: any) =>
                          r.order?.order_number || r.order_id || '',
                      },
                      { key: 'quantity', header: 'Quantity' },
                      { key: 'refund_status', header: 'Status' },
                      { key: 'refund_reason', header: 'Reason' },
                      {
                        key: 'refund_requested_at',
                        header: 'Requested At',
                      },
                    ];

                    const orderCols = [
                      { key: 'id', header: 'ID' },
                      {
                        key: 'order_number',
                        header: 'Order Number',
                      },
                      {
                        key: 'customer',
                        header: 'Customer',
                        transform: (r: any) => {
                          const name =
                            `${r.customer_first_name || ''} ${r.customer_last_name || ''}`.trim();
                          return (
                            name ||
                            (r.customer_email
                              ? r.customer_email.split('@')[0]
                              : 'Customer')
                          );
                        },
                      },
                      { key: 'total', header: 'Amount' },
                      { key: 'refund_status', header: 'Status' },
                      { key: 'refund_reason', header: 'Reason' },
                      {
                        key: 'refund_requested_at',
                        header: 'Requested At',
                      },
                    ];

                    const itemsData = itemsJson.data || [];
                    const ordersData = ordersJson.data || [];

                    const fromLabel = df || 'all';
                    const toLabel = dt || 'all';

                    const itemsCsv = arrayToCsv(itemsData, itemsCols);
                    downloadCsv(
                      `refunds-items-${fromLabel}-${toLabel}.csv`,
                      itemsCsv
                    );

                    const ordersCsv = arrayToCsv(ordersData, orderCols);
                    downloadCsv(
                      `refunds-orders-${fromLabel}-${toLabel}.csv`,
                      ordersCsv
                    );

                    toast.success('Export ready — CSV files downloaded');
                  } catch (err: any) {
                    console.error('Export failed', err);
                    toast.error(err?.message || 'Export failed');
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white mt-2">
            <h3 className="text-lg font-semibold mb-4">Item Refund History</h3>
            <DataTable
              columns={itemColumns as any}
              data={items as any}
              loading={loading}
            />
          </div>

          <div className="p-5 rounded-2xl bg-white mt-6">
            <h3 className="text-lg font-semibold mb-4">Order Refund History</h3>
            <DataTable
              columns={orderColumns as any}
              data={orders as any}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
