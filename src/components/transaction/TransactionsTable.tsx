'use client';

import { FC, useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DataTable } from './data-table';
import { columns } from './columns';
import { AnimatedBackground } from '../ui/animated-background';
import { Input } from '../ui/input';
import {
  ArrowUpDown,
  Download,
  FilterX,
  SearchIcon,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../ui/button';
import TimeFilter from '@/components/ui/time-filter';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useTransactions, useTransactionCounts } from '@/hooks/useTransactions';
import { useTimeFilter } from '@/hooks/useTimeFilter';
import { toast } from 'sonner';
import { TransactionQueryOptions } from '@/types/transactions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAYMENTMETHODS } from '@/lib/services/kpay';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransactionsTableProps {}

const statusFilters = ['All', 'Pending', 'Completed', 'Failed', 'Timeout'];
const statusMapping: Record<string, string | undefined> = {
  All: undefined,
  Pending: 'pending',
  Completed: 'completed',
  Failed: 'failed',
  Timeout: 'timeout',
};

const TransactionsTable: FC<TransactionsTableProps> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, _setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Use the custom hook for time filter - handles URL sync without infinite loops
  const { timeFilter, setTimeFilter, apiDateRange } = useTimeFilter({
    persistToUrl: true,
    defaultPreset: 'today',
  });

  const initialPaymentMethod = searchParams?.get('payment_method') || undefined;
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(
    initialPaymentMethod
  );
  const initialSource = searchParams?.get('source') || undefined;
  const [sourceFilter, setSourceFilter] = useState<
    'website' | 'external' | 'all' | undefined
  >((initialSource as 'website' | 'external' | 'all') || 'all');

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return '';
    if (method === 'cash_on_delivery')
      return t('payment.method.cash_on_delivery.name') || 'Cash on Delivery';
    if ((PAYMENTMETHODS as any)[method])
      return (
        t(`payment.method.${method}.name`) ||
        (PAYMENTMETHODS as any)[method].name
      );
    return method;
  };

  const limit = 20;

  // Helper to update URL params for filters
  const updateUrlParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === 'all' ||
        value === 'All' ||
        value === ''
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Use API-ready date range from the hook
  const queryOptions: TransactionQueryOptions = useMemo(() => {
    return {
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      status: statusMapping[activeFilter] as
        | 'pending'
        | 'completed'
        | 'failed'
        | 'timeout'
        | 'all'
        | undefined,
      sortBy,
      sortOrder,
      startDate: apiDateRange.dateFrom,
      endDate: apiDateRange.dateTo,
      payment_method: paymentMethod || undefined,
      source: sourceFilter && sourceFilter !== 'all' ? sourceFilter : undefined,
    } as TransactionQueryOptions;
  }, [
    currentPage,
    searchTerm,
    activeFilter,
    sortBy,
    sortOrder,
    apiDateRange,
    paymentMethod,
    sourceFilter,
  ]);

  const { data, isLoading, error, refetch } = useTransactions(queryOptions);
  const { data: countsData } = useTransactionCounts({
    startDate: queryOptions.startDate,
    endDate: queryOptions.endDate,
    payment_method: paymentMethod,
    source: sourceFilter && sourceFilter !== 'all' ? sourceFilter : undefined,
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || {
    page: 1,
    limit,
    total: 0,
    pages: 1,
  };

  // Sync currentPage with pagination data if it becomes invalid
  useEffect(() => {
    if (pagination.pages > 0 && currentPage > pagination.pages) {
      setCurrentPage(1);
    }
  }, [pagination.pages, currentPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = async (filter: string) => {
    console.log('Status change initiated:', filter);
    setActiveFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
    setSearchTerm(''); // Clear search when changing filter

    // Update URL params to sync with metrics
    updateUrlParams({
      status: filter === 'All' ? undefined : statusMapping[filter],
    });

    try {
      // Force a refetch with the new filter
      await refetch();
    } catch (_error) {
      console.error('Error refetching transactions:', _error);
    }
  };

  const handleSort = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleExport = async () => {
    try {
      toast.info('Export functionality coming soon!');
    } catch (_error) {
      toast.error('Failed to export data');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
    }
  };

  const getFilterCount = (filter: string) => {
    if (!countsData) return 0;

    switch (filter) {
      case 'All':
        return countsData.all || 0;
      case 'Pending':
        return countsData.pending || 0;
      case 'Completed':
        return countsData.completed || 0;
      case 'Failed':
        return countsData.failed || 0;
      case 'Timeout':
        return countsData.timeout || 0;
      default:
        return 0;
    }
  };

  // Calculate which page numbers to display
  const getPageNumbers = () => {
    const totalPages = pagination.pages;
    const current = currentPage;
    const pagesToShow = 5;

    if (totalPages <= pagesToShow) {
      // Show all pages if total is less than or equal to pagesToShow
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Calculate start and end page numbers
    let start = Math.max(1, current - Math.floor(pagesToShow / 2));
    const end = Math.min(totalPages, start + pagesToShow - 1);

    // Adjust start if we're near the end
    if (end - start < pagesToShow - 1) {
      start = Math.max(1, end - pagesToShow + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const hasActiveFilters = !!(
    searchTerm ||
    activeFilter !== 'All' ||
    (paymentMethod && paymentMethod !== '') ||
    (sourceFilter && sourceFilter !== 'all')
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveFilter('All');
    setPaymentMethod(undefined);
    setSourceFilter('all');
    setCurrentPage(1);

    // Clear URL params
    updateUrlParams({
      status: undefined,
      payment_method: undefined,
      source: undefined,
    });
  };

  // Don't show error if we have empty data - just show empty state
  if (error && (!data || transactions.length === 0)) {
    return (
      <div className="p-5 rounded-2xl bg-white mt-10">
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">Failed to load transactions</p>
          <p className="text-gray-500 text-sm mb-4">
            There was an error loading the transaction data.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white mt-10">
      <div className="flex flex-col gap-5 pb-8">
        {/* Status Tabs */}
        <div className="rounded-lg bg-[#E8F6FB] p-1 relative w-fit">
          <AnimatedBackground
            defaultValue={activeFilter}
            className="rounded-lg bg-white"
            onValueChange={value => {
              if (value && statusFilters.includes(value)) {
                console.log('Filter change triggered:', value);
                handleFilterChange(value);
              }
            }}
            transition={{
              ease: 'easeInOut',
              duration: 0.2,
            }}
          >
            {statusFilters.map((label, index) => {
              const count = getFilterCount(label);
              return (
                <button
                  key={index}
                  data-id={label}
                  type="button"
                  aria-label={`${label} view`}
                  className={`inline-flex h-9 px-4 items-center transition-all active:scale-[0.98] rounded-lg text-sm font-medium ${
                    activeFilter === label
                      ? 'text-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span className="mr-1.5">{label}</span>
                  <span
                    className={`${
                      activeFilter === label
                        ? 'text-[#F26823]'
                        : 'text-zinc-500'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </AnimatedBackground>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Filter */}
          <div className="w-auto">
            <TimeFilter
              value={timeFilter}
              onChange={v => {
                setTimeFilter(v);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px] max-w-[400px] relative">
            <Input
              className="w-full h-9 pl-3 pr-10 bg-neutral-100 border-none rounded-lg"
              placeholder="Search..."
              type="search"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
            />
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          </div>

          {/* Advanced Filters Button */}
          <Popover
            open={showAdvancedFilters}
            onOpenChange={setShowAdvancedFilters}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 relative">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Advanced Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-orange-500"
                      onClick={clearAllFilters}
                    >
                      <FilterX className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <div className="text-sm text-slate-600">
                    {sortBy === 'created_at' ? 'Date Created' : 'Amount'}
                  </div>
                </div>

                {/* Sort Direction */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Direction</Label>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-between"
                    onClick={handleSort}
                  >
                    <span>
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </span>
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <Select
                    value={paymentMethod || 'all'}
                    onValueChange={v => {
                      const newValue = v === 'all' ? undefined : v;
                      setPaymentMethod(newValue);
                      setCurrentPage(1);

                      // Update URL params
                      updateUrlParams({
                        payment_method: newValue,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(
                        Object.keys(
                          PAYMENTMETHODS
                        ) as (keyof typeof PAYMENTMETHODS)[]
                      ).map(method => (
                        <SelectItem key={method} value={method}>
                          <span className="mr-2">
                            {(PAYMENTMETHODS as any)[method].icon}
                          </span>
                          {t(`payment.method.${method}.name`) ||
                            (PAYMENTMETHODS as any)[method].name}
                        </SelectItem>
                      ))}
                      <SelectItem value="cash_on_delivery">
                        {t('payment.method.cash_on_delivery.name') ||
                          'Cash on Delivery'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Source */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Order Source</Label>
                  <Select
                    value={sourceFilter || 'all'}
                    onValueChange={v => {
                      const newValue =
                        v === 'all' ? 'all' : (v as 'website' | 'external');
                      setSourceFilter(newValue);
                      setCurrentPage(1);

                      // Update URL params
                      updateUrlParams({
                        source: newValue === 'all' ? undefined : newValue,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="website">Website Orders</SelectItem>
                      <SelectItem value="external">External Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={handleSort}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-text-primary text-xl font-bold">
              Transaction List
            </h3>
            <p className="text-text-secondary text-sm">
              Track payment transactions across your store.
              {!isLoading &&
                ` Showing ${transactions.length} of ${pagination.total} transactions.`}
            </p>
            {paymentMethod && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1 rounded text-sm">
                  <span>
                    {(PAYMENTMETHODS as any)[paymentMethod]?.icon || ''}
                  </span>
                  <span className="font-medium">
                    {getPaymentMethodLabel(paymentMethod)}
                  </span>
                  <button
                    className="ml-3 text-xs text-orange-500 underline"
                    onClick={() => {
                      setPaymentMethod(undefined);
                      setCurrentPage(1);
                    }}
                  >
                    Clear
                  </button>
                </span>
              </div>
            )}
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 rounded-lg"
            onClick={handleExport}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-2 text-slate-600">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl">
            <p className="text-gray-500 text-lg mb-2">No transactions found</p>
            <p className="text-gray-400 text-sm mb-4">
              {searchTerm
                ? 'Try adjusting your search terms or filters'
                : 'Transactions will appear here once customers start making purchases'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearAllFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <DataTable columns={columns} data={transactions} />

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-slate-600">
                  Page{' '}
                  <span className="font-semibold text-slate-900">
                    {currentPage}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-900">
                    {pagination.pages}
                  </span>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
                        className={
                          currentPage === 1
                            ? 'pointer-events-none opacity-50'
                            : 'hover:bg-orange-50 cursor-pointer'
                        }
                      />
                    </PaginationItem>

                    {/* First page */}
                    {getPageNumbers()[0] > 1 && (
                      <>
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={e => {
                              e.preventDefault();
                              handlePageChange(1);
                            }}
                            className="hover:bg-orange-50 cursor-pointer"
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {getPageNumbers()[0] > 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                      </>
                    )}

                    {/* Page numbers */}
                    {getPageNumbers().map(pageNum => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                          className={
                            pageNum === currentPage
                              ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                              : 'hover:bg-orange-50 cursor-pointer'
                          }
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {/* Last page */}
                    {getPageNumbers()[getPageNumbers().length - 1] <
                      pagination.pages && (
                      <>
                        {getPageNumbers()[getPageNumbers().length - 1] <
                          pagination.pages - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={e => {
                              e.preventDefault();
                              handlePageChange(pagination.pages);
                            }}
                            className="hover:bg-orange-50 cursor-pointer"
                          >
                            {pagination.pages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                        className={
                          currentPage === pagination.pages
                            ? 'pointer-events-none opacity-50'
                            : 'hover:bg-orange-50 cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsTable;
