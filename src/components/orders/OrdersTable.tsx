"use client";
import { FC, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "./data-table";
import { createColumns } from "./columns";
import { AnimatedBackground } from "../ui/animated-background";
import { Input } from "../ui/input";
import {
  ArrowUpDown,
  Download,
  FilterX,
  SearchIcon,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../ui/button";
import TimeFilter from "@/components/ui/time-filter";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useOrders, useOrderAssignmentsBatch } from "@/hooks/useOrders";
import { useTimeFilter } from "@/hooks/useTimeFilter";
import { OrderStatus, Order } from "@/types/orders";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { PAYMENT_METHODS } from "@/lib/services/kpay";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatLocalDate } from "@/lib/format";

interface OrdersTableProps {}

type StatusLabel =
  | "All"
  | "Pending"
  | "Assigned"
  | "Processing"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

const statusLabels: StatusLabel[] = [
  "All",
  "Pending",
  "Assigned",
  "Processing",
  "Delivered",
  "Cancelled",
  "Refunded",
];

const statusMapping = {
  All: undefined,
  Pending: "pending",
  Assigned: "assigned",
  Processing: "processing",
  Delivered: "delivered",
  Cancelled: "cancelled",
  Refunded: "refunded",
} as const;

const OrdersTable: FC<OrdersTableProps> = () => {
  const { useAllOrders, useOrderStats } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState({
    column: "created_at",
    direction: "desc" as "asc" | "desc",
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Use the custom hook for time filter - handles URL sync without infinite loops
  const { timeFilter, setTimeFilter, dateRange, apiDateRange } = useTimeFilter({
    persistToUrl: true,
    defaultPreset: "today",
  });

  const searchParams = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!searchParams) return;
    const method = searchParams.get("payment_method") || undefined;
    setPaymentMethod(method);
  }, [searchParams]);
  const { t } = useLanguage();

  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>(
    {},
  );
  const [showPaid, setShowPaid] = useState<boolean | undefined>();
  const [selectedCity, setSelectedCity] = useState<string>();

  const currentStatus =
    statusFilter === "All"
      ? undefined
      : (statusFilter.toLowerCase() as OrderStatus);

  // Convert visible inclusive dateRange.to to exclusive API dateTo by adding one day
  // Use API-ready date range from the hook (already computed with proper ISO timestamps)
  const queryOptions = {
    filters: {
      search: search || undefined,
      status: currentStatus,
      dateFrom: apiDateRange.dateFrom,
      dateTo: apiDateRange.dateTo,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      city: selectedCity,
      isPaid: showPaid,
      payment_method: paymentMethod || undefined,
    },
    pagination: { page, limit },
    sort,
  };

  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAllOrders({
    ...queryOptions,
  });

  const { data: statsData } = useOrderStats({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    payment_method: paymentMethod,
  });

  // Use the paginated response's total count directly - removed duplicate unpaginated query
  // that was causing excessive API calls and memory usage
  const orders = ordersData?.data || [];
  const totalCount = Number(
    ordersData?.pagination?.total ?? ordersData?.count ?? orders.length ?? 0,
  );

  const orderIds = orders.map((order: Order) => order.id);
  const { data: assignmentsMap = {} } = useOrderAssignmentsBatch(
    orderIds,
    !isLoading && orders.length > 0,
  );

  const columns = createColumns(assignmentsMap);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasMore =
    totalCount > page * limit || (orders.length === limit && totalCount === 0);

  const effectiveTotalPages =
    totalCount > 0 ? totalPages : hasMore ? Math.max(1, page + 1) : 1;

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(totalCount, page * limit);

  const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
  const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
    string | null
  >(null);
  const [ordersScheduleDisabled, setOrdersScheduleDisabled] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/orders-enabled");
        if (!res.ok) throw new Error("Failed to load setting");
        const j = await res.json();
        if (!mounted) return;
        setOrdersEnabled(Boolean(j.enabled));
        setOrdersDisabledMessage(j.message || null);
        setOrdersScheduleDisabled(Boolean(j.scheduleDisabled));
        if (j.nextToggleAt) {
          try {
            const next = new Date(j.nextToggleAt).getTime();
            const now = Date.now();
            const delay = Math.max(0, next - now + 500);
            setTimeout(
              () => {
                if (mounted) {
                  (async () => {
                    try {
                      const r2 = await fetch(
                        "/api/admin/settings/orders-enabled",
                      );
                      if (r2.ok) {
                        const j2 = await r2.json();
                        setOrdersEnabled(Boolean(j2.enabled));
                        setOrdersDisabledMessage(j2.message || null);
                        setOrdersScheduleDisabled(Boolean(j2.scheduleDisabled));
                      }
                    } catch (e) {}
                  })();
                }
              },
              Math.min(delay, 24 * 60 * 60 * 1000),
            );
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Failed to load orders_enabled setting", err);
        if (mounted) setOrdersEnabled(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const { invalidateOrders } = useOrders();

  const handleStatusChange = async (label: (typeof statusLabels)[number]) => {
    setStatusFilter(label);
    setPage(1);

    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching orders:", error);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, effectiveTotalPages));
    setPage(clamped);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const cap = 200;
    const last = Math.min(effectiveTotalPages, cap);
    for (let i = 1; i <= last; i++) pages.push(i);
    return pages;
  };

  const hasActiveFilters = !!(
    priceRange.min ||
    priceRange.max ||
    showPaid !== undefined ||
    selectedCity ||
    (paymentMethod && paymentMethod !== "")
  );

  const clearAllFilters = () => {
    setPriceRange({});
    setShowPaid(undefined);
    setSelectedCity(undefined);
    setPaymentMethod(undefined);
    setPage(1);
  };

  if (isError) {
    return (
      <div className="p-5 rounded-2xl bg-white mt-10">
        <p className="text-red-500">Error loading orders: {error?.message}</p>
      </div>
    );
  }

  const parseNumber = (v: any) => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const countFromStats = (stats: any, label: StatusLabel): number => {
    if (!stats) return 0;
    const mapping = statusMapping[label];
    const mappingStr = String(mapping ?? "").toLowerCase();

    if (Array.isArray(stats)) {
      if (label === "All") {
        const totalLikeKeyRE =
          /^(total|all|summary|orders?_count|order_count|total_orders?)$/i;

        for (const s of stats) {
          if (!s || typeof s !== "object") continue;
          const key = Object.keys(s).find((k) => totalLikeKeyRE.test(k));
          if (key) return parseNumber(s[key]);
        }

        for (const s of stats) {
          if (!s || typeof s !== "object") continue;
          const v =
            s.total ?? s.count ?? s.order_count ?? s.qty ?? s.num ?? s.items;
          if (v != null) return parseNumber(v);
        }

        return 0;
      }

      const found = stats.find((s: any) => {
        if (!s || typeof s !== "object") return false;
        return Object.values(s).some(
          (val: any) => String(val).toLowerCase() === mappingStr,
        );
      });
      if (found) {
        const v =
          found.count ??
          found.total ??
          found.qty ??
          found.value ??
          found.num ??
          found.amount;
        if (v != null) return parseNumber(v);
        const numeric = Object.values(found).find(
          (x: any) =>
            typeof x === "number" ||
            (!isNaN(Number(x)) && String(x).trim() !== ""),
        );
        return parseNumber(numeric);
      }

      for (const s of stats) {
        if (s && typeof s === "object") {
          const key = Object.keys(s).find(
            (k) =>
              k.toLowerCase().includes(mappingStr) &&
              /count|total|qty|value|num|amount/i.test(k),
          );
          if (key) return parseNumber(s[key]);
        }
      }

      return 0;
    }

    if (typeof stats === "object") {
      if (label === "All") {
        const explicitTotalKey = Object.keys(stats).find((k) =>
          /^(total|total_orders|orders?_total|orders?_count|total_count)$/i.test(
            k,
          ),
        );
        if (explicitTotalKey)
          return parseNumber((stats as any)[explicitTotalKey]);

        if ((stats as any).total != null)
          return parseNumber((stats as any).total);

        const isCountKey = (k: string) =>
          /^(pending|assigned|processing|delivered|shipped|cancelled|cancelled_orders|paid|unpaid|external|pending_orders|processing_orders|delivered_orders|shipped_orders|cancelled_orders)$/i.test(
            k,
          );
        const keys = Object.keys(stats).filter(isCountKey);
        if (keys.length)
          return keys.reduce(
            (acc: number, k: string) => acc + parseNumber((stats as any)[k]),
            0,
          );

        return Object.values(stats).reduce(
          (acc: number, v: any) =>
            acc + (typeof v === "number" ? v : Number(v) || 0),
          0,
        );
      }

      const directKey = Object.keys(stats).find(
        (k) => k.toLowerCase() === mappingStr,
      );
      if (directKey) return parseNumber(stats[directKey]);

      const key = Object.keys(stats).find((k) =>
        k.toLowerCase().includes(mappingStr),
      );
      if (key) return parseNumber(stats[key]);
    }

    return 0;
  };

  return (
    <div className="p-5 rounded-2xl bg-white mt-10">
      <div className="flex flex-col gap-5 pb-8">
        {/* Status Tabs */}
        <div className="rounded-lg bg-[#E8F6FB] p-1 relative w-fit">
          <AnimatedBackground
            defaultValue={statusFilter}
            className="rounded-lg bg-white"
            onValueChange={(value) => {
              if (value && statusLabels.includes(value as StatusLabel)) {
                handleStatusChange(value as StatusLabel);
              }
            }}
            transition={{
              ease: "easeInOut",
              duration: 0.2,
            }}
          >
            {statusLabels.map((label, index) => {
              let count = 0;

              if (label === "All") {
                // Use statsData total or fall back to paginated totalCount
                const statsTotal =
                  (statsData as any)?.total_orders ??
                  (statsData as any)?.totalOrders ??
                  (statsData as any)?.total;

                count = parseNumber(
                  statsTotal != null
                    ? statsTotal
                    : (totalCount ?? orders.length ?? 0),
                );
              } else {
                if (statsData) {
                  try {
                    count = countFromStats(statsData, label);
                  } catch (e) {
                    count = 0;
                  }
                }

                if (!count) {
                  count = orders.filter((order: Order) => {
                    const expectedStatus = statusMapping[label];
                    return order.status === expectedStatus;
                  }).length;
                }
              }

              return (
                <button
                  key={index}
                  data-id={label}
                  type="button"
                  aria-label={`${label} view`}
                  onClick={() => handleStatusChange(label as any)}
                  className={`inline-flex h-9 px-4 items-center transition-all active:scale-[0.98] rounded-lg text-sm font-medium ${
                    statusFilter === label
                      ? "text-zinc-900"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span className="mr-1.5">{label}</span>
                  <span
                    className={`${
                      statusFilter === label
                        ? "text-[#F26823]"
                        : "text-zinc-500"
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
              onChange={(v) => {
                setTimeFilter(v);
                setPage(1);
              }}
            />
          </div>

          {/* City Filter */}
          <Select
            value={selectedCity || "all"}
            onValueChange={(value) => {
              setSelectedCity(value === "all" ? undefined : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(() => {
                const cities: string[] = Array.from(
                  new Set(
                    orders
                      .map((order: Order) => order.delivery_city)
                      .filter(
                        (city: string | null | undefined): city is string =>
                          Boolean(city),
                      ),
                  ),
                );
                return cities.map((city: string) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px] max-w-[400px] relative">
            <Input
              className="w-full h-9 pl-3 pr-10 bg-neutral-100 border-none rounded-lg"
              placeholder="Search..."
              type="search"
              value={search}
              onChange={handleSearchChange}
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

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Price Range (RWF)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={priceRange.min || ""}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          min: e.target.valueAsNumber,
                        }))
                      }
                      placeholder="Min"
                      className="h-9"
                    />
                    <Input
                      type="number"
                      value={priceRange.max || ""}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          max: e.target.valueAsNumber,
                        }))
                      }
                      placeholder="Max"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Status</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paid-filter"
                      checked={showPaid}
                      onCheckedChange={(checked) => {
                        setShowPaid(
                          checked === "indeterminate" ? undefined : checked,
                        );
                        setPage(1);
                      }}
                    />
                    <label
                      htmlFor="paid-filter"
                      className="text-sm cursor-pointer"
                    >
                      Show only paid orders
                    </label>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <Select
                    value={sort.column}
                    onValueChange={(value) => {
                      setSort((prev) => ({
                        column: value,
                        direction: prev.direction,
                      }));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="total">Order Total</SelectItem>
                      <SelectItem value="customer_first_name">
                        Customer Name
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Direction */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Direction</Label>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-between"
                    onClick={() => {
                      setSort((prev) => ({
                        ...prev,
                        direction: prev.direction === "asc" ? "desc" : "asc",
                      }));
                      setPage(1);
                    }}
                  >
                    <span>
                      {sort.direction === "asc" ? "Ascending" : "Descending"}
                    </span>
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <Select
                    value={paymentMethod || "all"}
                    onValueChange={(v) => {
                      setPaymentMethod(v === "all" ? undefined : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(
                        Object.keys(
                          PAYMENT_METHODS,
                        ) as (keyof typeof PAYMENT_METHODS)[]
                      ).map((method) => (
                        <SelectItem key={method} value={method}>
                          {(PAYMENT_METHODS as any)[method].icon}{" "}
                          {t(`payment.method.${method}.name`) ||
                            (PAYMENT_METHODS as any)[method].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Button */}
          <Button variant="outline" size="sm" className="h-9 px-3">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-text-primary text-xl font-bold">Order List</h3>
            <p className="text-text-secondary text-sm">
              Track orders list across your store.
            </p>
            {paymentMethod && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1 rounded text-sm">
                  <span>
                    {(PAYMENT_METHODS as any)[paymentMethod]?.icon || ""}
                  </span>
                  <span className="font-medium">
                    {t(`payment.method.${paymentMethod}.name`) || paymentMethod}
                  </span>
                  <button
                    className="ml-3 text-xs text-orange-500 underline"
                    onClick={() => {
                      setPaymentMethod(undefined);
                      setPage(1);
                    }}
                  >
                    Clear
                  </button>
                </span>
              </div>
            )}
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 rounded-lg">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-2 text-slate-600">Loading orders...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <DataTable columns={columns} data={orders} />

            {/* Pagination */}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1);
                    }}
                    className={
                      page === 1
                        ? "pointer-events-none opacity-50"
                        : "hover:bg-orange-50"
                    }
                  />
                </PaginationItem>
                {getPageNumbers()
                  .slice(0, 5)
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(p);
                        }}
                        className={
                          p === page
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "hover:bg-orange-50"
                        }
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                {page + 2 < effectiveTotalPages && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasMore) handlePageChange(page + 1);
                    }}
                    className={
                      hasMore
                        ? "hover:bg-orange-50"
                        : "pointer-events-none opacity-50"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTable;
