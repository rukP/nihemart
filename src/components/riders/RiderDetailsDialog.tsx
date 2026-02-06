'use client';
import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronRight, Plus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { addFeeAdjustment } from '@/lib/api/riders';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  riderId: string;
  onOpenChange: (open: boolean) => void;
};

export default function RiderDetailsDialog({
  open,
  riderId,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rider, setRider] = React.useState<any>(null);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [feeAdjustments, setFeeAdjustments] = React.useState<any[]>([]);
  const [timeframe, setTimeframe] = React.useState<string>('all'); // default to all time to show all data
  const [dateRange, setDateRange] = React.useState<{
    from?: string;
    to?: string;
  }>(() => ({}));
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [addFeeOpen, setAddFeeOpen] = React.useState(false);
  const [feeAmount, setFeeAmount] = React.useState('');
  const [feeReason, setFeeReason] = React.useState('');
  const [feeTransactionDate, setFeeTransactionDate] = React.useState<Date>(
    new Date()
  );
  const [feeCalendarOpen, setFeeCalendarOpen] = React.useState(false);
  const [isSubmittingFee, setIsSubmittingFee] = React.useState(false);

  React.useEffect(() => {
    if (!open || !riderId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { authorizedAPI } = await import('@/lib/api');
        const { getFeeAdjustments } = await import('@/lib/api/riders');
        const [res, adjustments] = await Promise.all([
          authorizedAPI.get(`/riders/${riderId}/details?limit=1000`),
          getFeeAdjustments(riderId, 1000).catch(() => []), // Fetch fee adjustments
        ]);
        setRider((res.data as any)?.rider);
        setAssignments((res.data as any)?.assignments || []);
        setFeeAdjustments(adjustments || []);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, riderId]);

  // helper: parse date-ish values
  const parseDate = (v: any) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  // compute filtered assignments by timeframe OR explicit date range if provided
  const filteredAssignments = React.useMemo(() => {
    if (!assignments || assignments.length === 0) return [] as any[];

    // Parse explicit start and end dates from string inputs (if provided)
    const explicitStart = dateRange.from ? new Date(dateRange.from) : null;
    const explicitEnd = dateRange.to ? new Date(dateRange.to) : null;

    // Helpers to compute start/end bounds for timeframe-based filters
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = (() => {
      const d = new Date(now);
      // Monday as start of week: if today is Sunday (0), we go back 6 days
      const diff = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const computeStartForTimeframe = (tf: string) => {
      if (tf === 'all') return null;
      if (tf === 'today') return startOfToday;
      if (tf === 'week') return startOfWeek;
      if (tf === 'last7') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      const n = Number(tf);
      if (!isNaN(n) && n > 0) {
        const d = new Date(now);
        d.setDate(d.getDate() - n);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      return null;
    };

    const startBound = explicitStart
      ? (() => {
          const s = new Date(explicitStart);
          s.setHours(0, 0, 0, 0);
          return s;
        })()
      : computeStartForTimeframe(timeframe);
    const endBound = explicitEnd
      ? (() => {
          const e = new Date(explicitEnd);
          e.setHours(23, 59, 59, 999);
          return e;
        })()
      : new Date();

    const inRange = (d?: Date | null) => {
      if (!d) return false;
      if (startBound && d < startBound) return false;
      if (endBound && d > endBound) return false;
      // if both bounds null (all time), everything with a date is included
      return true;
    };

    return assignments.filter((a: any) => {
      // Check for assignment timestamps (both camelCase and snake_case)
      const ts =
        parseDate(a.assignedAt) ||
        parseDate(a.assigned_at) ||
        parseDate(a.respondedAt) ||
        parseDate(a.responded_at) ||
        parseDate(a.deliveredAt) ||
        parseDate(a.delivered_at) ||
        parseDate(a.completedAt) ||
        parseDate(a.completed_at) ||
        parseDate(a.updatedAt) ||
        parseDate(a.updated_at) ||
        parseDate(a.createdAt) ||
        parseDate(a.created_at) ||
        parseDate(a.orders?.createdAt) ||
        parseDate(a.orders?.created_at) ||
        parseDate(a.order?.createdAt) ||
        parseDate(a.order?.created_at) ||
        parseDate(a.orders?.updatedAt) ||
        parseDate(a.orders?.updated_at) ||
        parseDate(a.order?.updatedAt) ||
        parseDate(a.order?.updated_at) ||
        parseDate(a.orders?.deliveredAt) ||
        parseDate(a.orders?.delivered_at) ||
        parseDate(a.order?.deliveredAt) ||
        parseDate(a.order?.delivered_at) ||
        null;
      if (!ts) return false;
      return inRange(ts);
    });
  }, [assignments, timeframe, dateRange]);

  // Filter fee adjustments based on date range (same logic as assignments)
  const filteredFeeAdjustments = React.useMemo(() => {
    const hasExplicit = Boolean(dateRange.from || dateRange.to);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = (() => {
      const d = new Date(now);
      const diff = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    let adjStart: Date | null = null;
    let adjEnd: Date | null = new Date();

    if (hasExplicit) {
      if (dateRange.from) {
        adjStart = new Date(dateRange.from);
        adjStart.setHours(0, 0, 0, 0);
      }
      if (dateRange.to) {
        adjEnd = new Date(dateRange.to);
        adjEnd.setHours(23, 59, 59, 999);
      }
    } else {
      if (timeframe === 'all') adjStart = null;
      else if (timeframe === 'today') {
        adjStart = startOfToday;
      } else if (timeframe === 'week') {
        adjStart = startOfWeek;
      } else if (timeframe === 'last7') {
        adjStart = new Date();
        adjStart.setDate(adjStart.getDate() - 7);
        adjStart.setHours(0, 0, 0, 0);
      } else {
        const n = Number(timeframe);
        if (!isNaN(n) && n > 0) {
          adjStart = new Date();
          adjStart.setDate(adjStart.getDate() - n);
          adjStart.setHours(0, 0, 0, 0);
        }
      }
    }

    return feeAdjustments.filter((adjustment: any) => {
      const adjDate = parseDate(
        adjustment.transactionDate ||
          adjustment.transaction_date ||
          adjustment.createdAt ||
          adjustment.created_at
      );
      if (!adjDate) return false;
      if (adjStart && adjDate < adjStart) return false;
      if (adjEnd && adjDate > adjEnd) return false;
      return true;
    });
  }, [feeAdjustments, timeframe, dateRange]);

  const metrics = React.useMemo(() => {
    const m = { assigned: 0, delivered: 0, rejected: 0, totalEarnings: 0 };

    // Calculate earnings from filtered assignments
    for (const a of filteredAssignments) {
      const s = (a.status || '').toString().toLowerCase();
      if (s === 'assigned') m.assigned++;
      else if (s === 'accepted' || s === 'completed' || s === 'delivered') {
        m.delivered++;
        // Calculate earnings for completed deliveries
        const o = a.orders || a.order || null;

        // The delivery fee is stored in order.tax field
        // This is the standard field used across the system for rider earnings
        const deliveryFee = o?.tax ?? 0;
        const feeNum =
          typeof deliveryFee === 'string'
            ? parseFloat(deliveryFee)
            : Number(deliveryFee || 0);

        if (!isNaN(feeNum) && feeNum > 0) {
          m.totalEarnings += feeNum;
        }
      } else if (s === 'rejected' || s === 'declined' || s === 'cancelled')
        m.rejected++;
    }

    // Add earnings from filtered fee adjustments (already filtered by date range)
    // Include both positive (bonuses) and negative (deductions) amounts
    for (const adjustment of filteredFeeAdjustments) {
      const amount = Number(adjustment.amount || 0);
      if (!isNaN(amount)) {
        m.totalEarnings += amount; // Can be positive or negative
      }
    }

    return m;
  }, [filteredAssignments, filteredFeeAdjustments]);

  const activeFilterLabel = React.useMemo(() => {
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from || '…';
      const to = dateRange.to || 'Now';
      return `${from} — ${to}`;
    }
    switch (timeframe) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This week';
      case 'last7':
        return 'Past 7 days';
      case '30':
        return 'Last 30 days';
      case '365':
        return 'Last year';
      default:
        return 'All time';
    }
  }, [timeframe, dateRange]);

  // Show only first 5 deliveries unless "View More" is clicked
  const displayedAssignments = showAll
    ? filteredAssignments
    : filteredAssignments.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rider Details</DialogTitle>
          <DialogDescription>
            View rider performance metrics, earnings, and delivery history
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="p-4">Loading...</div>
        ) : error ? (
          <div className="p-4 text-red-600">{error}</div>
        ) : rider ? (
          <div className="space-y-6 p-2">
            <div className="flex items-center justify-between">
              <UserAvatarProfile
                user={{
                  fullName: rider.fullName || rider.full_name || 'Unnamed',
                  subTitle: rider.phone || rider.vehicle || '',
                  imageUrl: rider.imageUrl || rider.image_url || undefined,
                }}
                showInfo
              />
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {rider.location || '—'}
                </div>
                <Button
                  onClick={() => setAddFeeOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Fee
                </Button>
              </div>
            </div>

            {/* Filters Section - Moved to top */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm text-gray-700">Filters</h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Timeframe Select */}
                <div className="flex-1">
                  <Select
                    value={timeframe}
                    onValueChange={val => {
                      // switching to any named timeframe clears a custom date range
                      setTimeframe(val);
                      if (val !== 'range') setDateRange({});
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="last7">Past 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Picker */}
                <div className="flex-1">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateRange.from && dateRange.to ? (
                          <span className="text-sm">
                            {`${dateRange.from} — ${dateRange.to}`}
                          </span>
                        ) : dateRange.from ? (
                          <span className="text-sm">
                            {`${dateRange.from} — Now`}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Select date range
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      className="w-auto p-4"
                      align="start"
                    >
                      <div className="space-y-3">
                        <div>
                          <label
                            htmlFor="filter-start"
                            className="block text-sm font-medium text-gray-700 mb-1.5"
                          >
                            Start Date
                          </label>
                          <input
                            id="filter-start"
                            title="Start date"
                            type="date"
                            placeholder="YYYY-MM-DD"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={dateRange.from || ''}
                            onChange={e =>
                              setDateRange(prev => ({
                                ...prev,
                                from: e.target.value || undefined,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="filter-end"
                            className="block text-sm font-medium text-gray-700 mb-1.5"
                          >
                            End Date
                          </label>
                          <input
                            id="filter-end"
                            title="End date"
                            type="date"
                            placeholder="YYYY-MM-DD (optional)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={dateRange.to || ''}
                            onChange={e =>
                              setDateRange(prev => ({
                                ...prev,
                                to: e.target.value || undefined,
                              }))
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use current date
                          </p>
                        </div>
                        <div className="flex items-center gap-2 justify-end pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDateRange({});
                              setTimeframe('week');
                              setCalendarOpen(false);
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              // Validate date range
                              if (dateRange.from && dateRange.to) {
                                const f = new Date(dateRange.from);
                                const t = new Date(dateRange.to);
                                if (f > t) {
                                  toast.error(
                                    'Start date must be before end date'
                                  );
                                  return;
                                }
                              }
                              // Mark that a custom range is active
                              setTimeframe('range');
                              setCalendarOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Active Filter Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <div>
                Showing:{' '}
                <span className="font-semibold text-gray-800">
                  {activeFilterLabel}
                </span>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTimeframe('week');
                    setDateRange({});
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-xs font-medium text-blue-700 mb-1">
                  Currently Assigned
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {metrics.assigned}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="text-xs font-medium text-green-700 mb-1">
                  Completed Deliveries
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {metrics.delivered}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <div className="text-xs font-medium text-red-700 mb-1">
                  Declined / Rejected
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {metrics.rejected}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="text-xs font-medium text-orange-700 mb-1">
                  Total Earnings
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {metrics.totalEarnings.toLocaleString()} RWF
                </div>
              </div>
            </div>

            {/* Fee Adjustments Section */}
            {filteredFeeAdjustments && filteredFeeAdjustments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Fee Adjustments
                  </h4>
                  <span className="text-sm text-gray-500">
                    {filteredFeeAdjustments.length} adjustment
                    {filteredFeeAdjustments.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="divide-y rounded-lg border bg-white">
                  {filteredFeeAdjustments.map((adj: any) => {
                    const amount = Number(adj.amount || 0);
                    const isNegative = amount < 0;
                    const transDate = adj.transactionDate
                      ? new Date(adj.transactionDate)
                      : adj.createdAt
                        ? new Date(adj.createdAt)
                        : null;

                    return (
                      <div
                        key={adj.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`font-semibold ${
                                  isNegative ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {isNegative ? '-' : '+'}
                                {Math.abs(amount).toLocaleString()} RWF
                              </div>
                              {transDate && (
                                <span className="text-xs text-gray-500">
                                  {format(transDate, 'MMM dd, yyyy')}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {adj.reason || 'Manual fee adjustment'}
                            </div>
                            {adj.admin?.email && (
                              <div className="text-xs text-gray-400 mt-1">
                                Added by: {adj.admin.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Deliveries Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">
                  Recent Deliveries
                </h4>
                <span className="text-sm text-gray-500">
                  {filteredAssignments.length} total
                </span>
              </div>

              <div className="divide-y rounded-lg border bg-white">
                {filteredAssignments.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No deliveries found for the selected period.
                  </div>
                )}
                {displayedAssignments.map((a: any) => {
                  const o = a.orders || a.order || null;

                  // The delivery fee is stored in order.tax field
                  const deliveryFee = o?.tax ?? 0;
                  const feeNum =
                    typeof deliveryFee === 'string'
                      ? parseFloat(deliveryFee)
                      : Number(deliveryFee || 0);

                  return (
                    <div
                      key={a.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-1">
                          Order #
                          {o?.orderNumber ||
                            o?.order_number ||
                            o?.id ||
                            a.orderId ||
                            a.order_id}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {o?.deliveryAddress ||
                            o?.delivery_address ||
                            o?.deliveryCity ||
                            o?.delivery_city ||
                            a.location ||
                            '—'}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 ml-4">
                        {isNaN(feeNum) || feeNum <= 0
                          ? '-'
                          : feeNum.toLocaleString()}{' '}
                        RWF
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View More Button */}
              {filteredAssignments.length > 5 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                    className="gap-2"
                  >
                    {showAll
                      ? 'Show Less'
                      : `View More (${filteredAssignments.length - 5} more)`}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        showAll ? 'rotate-90' : ''
                      }`}
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>

      {/* Add Fee Dialog */}
      <AlertDialog open={addFeeOpen} onOpenChange={setAddFeeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Fee Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Add a manual transport fee that was paid outside the system.
              Select the transaction date to ensure it appears correctly in the
              rider's earnings history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount (RWF)</Label>
              <Input
                id="fee-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={feeAmount}
                onChange={e => setFeeAmount(e.target.value)}
                disabled={isSubmittingFee}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-transaction-date">Transaction Date</Label>
              <Popover open={feeCalendarOpen} onOpenChange={setFeeCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !feeTransactionDate && 'text-muted-foreground'
                    )}
                    disabled={isSubmittingFee}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {feeTransactionDate ? (
                      format(feeTransactionDate, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={feeTransactionDate}
                    onSelect={date => {
                      setFeeTransactionDate(date || new Date());
                      setFeeCalendarOpen(false);
                    }}
                    disabled={date => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                When did this transaction actually occur? This affects when the
                fee appears in earnings reports.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-reason">Reason</Label>
              <Textarea
                id="fee-reason"
                placeholder="Enter reason for this fee adjustment"
                value={feeReason}
                onChange={e => setFeeReason(e.target.value)}
                disabled={isSubmittingFee}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingFee}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!feeAmount || parseFloat(feeAmount) <= 0) {
                  toast.error('Please enter a valid amount');
                  return;
                }
                if (!feeReason.trim()) {
                  toast.error('Please enter a reason');
                  return;
                }
                if (!feeTransactionDate) {
                  toast.error('Please select a transaction date');
                  return;
                }
                setIsSubmittingFee(true);
                try {
                  await addFeeAdjustment(riderId, {
                    amount: parseFloat(feeAmount),
                    reason: feeReason.trim(),
                    transactionDate: feeTransactionDate.toISOString(),
                  });
                  toast.success('Fee added successfully');
                  setAddFeeOpen(false);
                  setFeeAmount('');
                  setFeeReason('');
                  setFeeTransactionDate(new Date());
                  // Refresh the dialog data
                  const { authorizedAPI } = await import('@/lib/api');
                  const { getFeeAdjustments } =
                    await import('@/lib/api/riders');
                  const [res, adjustments] = await Promise.all([
                    authorizedAPI.get(`/riders/${riderId}/details?limit=1000`),
                    getFeeAdjustments(riderId, 1000).catch(() => []),
                  ]);
                  setRider((res.data as any)?.rider);
                  setAssignments((res.data as any)?.assignments || []);
                  setFeeAdjustments(adjustments || []);
                } catch (error: any) {
                  toast.error(error?.message || 'Failed to add fee');
                } finally {
                  setIsSubmittingFee(false);
                }
              }}
              disabled={isSubmittingFee}
            >
              {isSubmittingFee ? 'Adding...' : 'Add Fee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
