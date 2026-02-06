'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTransactionStats } from '@/hooks/useTransactions';
import { toast } from 'sonner';

interface TransactionMetric {
  title: string;
  value: number;
  change: number;
  isPositive: boolean;
  period: string;
  isCurrency?: boolean;
}

import { useSearchParams } from 'next/navigation';
import { parseLocalDate } from '@/lib/format';

export default function TransactionsMetrics() {
  // Read date filters from URL so metrics follow the TimeFilter state
  const searchParams = useSearchParams();
  const preset = searchParams?.get('preset');
  const fromParam = searchParams?.get('from');
  const toParam = searchParams?.get('to');
  const statusParam = searchParams?.get('status');
  const paymentMethodParam = searchParams?.get('payment_method');
  const sourceParam = searchParams?.get('source');

  const computedRange = (() => {
    // If no params are provided, default to TODAY
    if (!preset && !fromParam && !toParam) {
      const t = new Date();
      const start = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (preset === 'all') {
      // Explicitly request an effectively "all time" range so the API returns totals
      const start = new Date(1970, 0, 1);
      const end = new Date();
      end.setDate(end.getDate() + 1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (preset === 'today') {
      // Prefer provided 'from' if present, otherwise compute today (local)
      const start = fromParam
        ? parseLocalDate(fromParam)!
        : new Date(new Date().setHours(0, 0, 0, 0));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (preset === 'custom' && fromParam && toParam) {
      const start = parseLocalDate(fromParam)!;
      const end = parseLocalDate(toParam)!;
      // convert inclusive to exclusive end
      end.setDate(end.getDate() + 1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    return {} as any;
  })();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useTransactionStats({
    ...computedRange,
    status: statusParam || undefined,
    payment_method: paymentMethodParam || undefined,
    source: sourceParam || undefined,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Transaction statistics refreshed');
    } catch (_error) {
      toast.error('Failed to refresh statistics');
    }
  };

  // Don't show error if we have stats data - just show empty stats
  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          <Card className="relative">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-500 mb-2">
                  Failed to load transaction statistics
                </p>
                <Button onClick={handleRefresh} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const periodLabel = (() => {
    if (preset === 'all') return 'All time';
    if (preset === 'today') return 'Today';
    if (preset === 'custom' && fromParam && toParam) {
      const s = parseLocalDate(fromParam)!;
      const e = parseLocalDate(toParam)!; // inclusive end as shown to users
      return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
    }
    if (computedRange && computedRange.startDate && computedRange.endDate) {
      const s = new Date(computedRange.startDate);
      const e = new Date(computedRange.endDate);
      e.setDate(e.getDate() - 1);
      const today = new Date();
      const localToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      if (s.toDateString() === localToday.toDateString()) return 'Today';
      return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
    }
    return 'All time';
  })();

  const transactionMetrics: TransactionMetric[] = [
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      change: stats?.revenueChange || 0,
      isPositive: (stats?.revenueChange || 0) >= 0,
      period: periodLabel,
      isCurrency: true,
    },
    {
      title: 'Completed Transactions',
      value: stats?.completedTransactions || 0,
      change: stats?.completedChange || 0,
      isPositive: (stats?.completedChange || 0) >= 0,
      period: periodLabel,
    },
    {
      title: 'Failed Transactions',
      value: stats?.failedTransactions || 0,
      change: stats?.failedChange || 0,
      // Lower failures is positive
      isPositive: (stats?.failedChange || 0) <= 0,
      period: periodLabel,
    },
    {
      title: 'Pending Transactions',
      value: stats?.pendingTransactions || 0,
      change: stats?.pendingChange || 0,
      isPositive: (stats?.pendingChange || 0) <= 0,
      period: periodLabel,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {transactionMetrics.map((metric, index) => (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">
                {metric.title}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      {metric.isCurrency ? 'Rwf ' : ''}
                      {metric.isCurrency
                        ? metric.value.toLocaleString()
                        : metric.value}
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between gap-1">
                <span>{metric.period}</span>
                {!isLoading && (
                  <div
                    className={`flex items-center gap-1 ${
                      metric.isPositive ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {metric.isPositive ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
