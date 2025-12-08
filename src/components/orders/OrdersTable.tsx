"use client";
import { FC, useEffect, useState } from "react";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { AnimatedBackground } from "../ui/animated-background";
import { Input } from "../ui/input";
import {
   ArrowUpDown,
   Download,
   FilterX,
   ListFilter,
   SearchIcon,
   Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
   Pagination,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
} from "@/components/ui/pagination";
import { useOrders } from "@/hooks/useOrders";
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

interface OrdersTableProps {}

type StatusLabel =
   | "All"
   | "Pending"
   | "Processing"
   | "Delivered"
   | "Cancelled"
   | "Refunded";

const statusLabels: StatusLabel[] = [
   "All",
   "Pending",
   "Processing",
   "Delivered",
   "Cancelled",
   "Refunded",
];

const statusMapping = {
   All: undefined,
   Pending: "pending",
   Processing: "processing",
   Delivered: "delivered",
   Cancelled: "cancelled",
   Refunded: "refunded",
} as const;

const OrdersTable: FC<OrdersTableProps> = () => {
   const { useAllOrders, useOrderStats } = useOrders();
   const { data: statsData } = useOrderStats();
   const [search, setSearch] = useState("");
   const [statusFilter, setStatusFilter] = useState("All");
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(50);
   const [sort, setSort] = useState({
      column: "created_at",
      direction: "desc" as "asc" | "desc",
   });

   // Additional filters
   const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(
      {}
   );
   const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>(
      {}
   );
   const [showPaid, setShowPaid] = useState<boolean | undefined>();
   const [selectedCity, setSelectedCity] = useState<string>();

   // Convert status label to the correct format for the API
   const statusValue = ((): OrderStatus | undefined => {
      if (statusFilter === "All") return undefined;
      return statusFilter.toLowerCase() as OrderStatus;
   })();

   // Get orders with current filters
   const currentStatus =
      statusFilter === "All"
         ? undefined
         : (statusFilter.toLowerCase() as OrderStatus);

   // Query options
   const queryOptions = {
      filters: {
         search: search || undefined,
         status: currentStatus,
         dateFrom: dateRange.from,
         dateTo: dateRange.to,
         priceMin: priceRange.min,
         priceMax: priceRange.max,
         city: selectedCity,
         isPaid: showPaid,
      },
      pagination: { page, limit },
      sort,
   };

   console.log(
      "Querying orders with options:",
      JSON.stringify(queryOptions, null, 2)
   );

   const {
      data: ordersData,
      isLoading,
      isError,
      error,
      refetch,
   } = useAllOrders({
      ...queryOptions,
   });

   // Also fetch all orders without pagination to get an authoritative total count
   // This is used to ensure the 'All' status shows the real total (unique orders)
   const { data: allOrdersUnpaginated } = useAllOrders({
      filters: queryOptions.filters,
      // no pagination so the integration returns the full count
   });

   const orders = ordersData?.data || [];
   // Prefer the unpaginated authoritative count when available; fall back to
   // the paginated response's count, then the loaded array length.
   const authoritativeCount =
      allOrdersUnpaginated?.count ?? ordersData?.count ?? orders.length ?? 0;
   const totalCount = Number(authoritativeCount || 0);
   const totalPages = Math.max(1, Math.ceil(totalCount / limit));
   // Fallback: if authoritative counts are missing or 0 but current page is
   // full (orders.length === limit), assume there may be more pages. This
   // avoids disabling Next when the DB count isn't available or accurate.
   const hasMore =
      totalCount > page * limit || // authoritative says more
      (orders.length === limit &&
         (allOrdersUnpaginated?.count ?? ordersData?.count ?? 0) === 0);

   // If authoritative count is missing (0) but we detect that current page
   // is full (hasMore), expose an extra page so users can navigate forward.
   const effectiveTotalPages =
      totalCount > 0 ? totalPages : hasMore ? Math.max(1, page + 1) : 1;

   const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
   const rangeEnd = Math.min(totalCount, page * limit);

   // Debug: log authoritative and fallback counts to diagnose mismatches
   console.log("OrdersTable counts:", {
      paginated_totalCount: totalCount,
      unpaginated_totalCount: allOrdersUnpaginated?.count,
      statsDataSummary: statsData,
      loadedOrdersLength: orders.length,
      sampleOrderIds: orders.slice(0, 10).map((o) => o.id),
   });

   // Fetch orders_enabled to show banner in admin list
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
                  setTimeout(() => {
                     if (mounted) {
                        // re-run fetch to pick up schedule changes
                        (async () => {
                           try {
                              const r2 = await fetch(
                                 "/api/admin/settings/orders-enabled"
                              );
                              if (r2.ok) {
                                 const j2 = await r2.json();
                                 setOrdersEnabled(Boolean(j2.enabled));
                                 setOrdersDisabledMessage(j2.message || null);
                                 setOrdersScheduleDisabled(
                                    Boolean(j2.scheduleDisabled)
                                 );
                              }
                           } catch (e) {}
                        })();
                     }
                  }, Math.min(delay, 24 * 60 * 60 * 1000));
               } catch (e) {}
            }
         } catch (err) {
            console.warn("Failed to load orders_enabled setting", err);
            // Leave as `null` so the UI treats missing/admin setting as schedule-controlled (auto)
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
   // Define filter change handler
   const handleStatusChange = async (label: (typeof statusLabels)[number]) => {
      console.log("Status change initiated:", label);

      // Update the status filter
      setStatusFilter(label);

      // Reset page and other filters
      setPage(1);
      setDateRange({});
      setPriceRange({});
      setShowPaid(undefined);
      setSelectedCity(undefined);

      try {
         // Force a refetch with the new status
         await refetch();
      } catch (error) {
         console.error("Error refetching orders:", error);
      }
   };

   const handlePageChange = (newPage: number) => {
      const clamped = Math.max(1, Math.min(newPage, effectiveTotalPages));
      setPage(clamped);
   };

   // Simple page range calculation for pagination
   const getPageNumbers = () => {
      const pages: number[] = [];
      // Show all pages by default per request, but cap to avoid rendering thousands.
      const cap = 200; // safety cap
      const last = Math.min(effectiveTotalPages, cap);
      for (let i = 1; i <= last; i++) pages.push(i);
      return pages;
   };

   if (isError) {
      return (
         <div className="p-5 rounded-2xl bg-white mt-10">
            <p className="text-red-500">
               Error loading orders: {error?.message}
            </p>
         </div>
      );
   }

   return (
      <div className="p-5 rounded-2xl bg-white mt-10">
         <div className="flex gap-5 justify-between flex-col 2xl:flex-row pb-8">
            <div className="hidden md:block rounded-[8px] h-fit py-2 px-3 bg-[#E8F6FB] p-[2px] relative">
               <AnimatedBackground
                  defaultValue={statusFilter}
                  className="rounded-lg bg-white dark:bg-zinc-700"
                  onValueChange={(value) => {
                     if (value && statusLabels.includes(value as StatusLabel)) {
                        console.log("Triggering status change:", value);
                        handleStatusChange(value as StatusLabel);
                     }
                  }}
                  transition={{
                     ease: "easeInOut",
                     duration: 0.2,
                  }}
               >
                  {statusLabels.map((label, index) => {
                     const mapping = statusMapping[label];

                     const parseNumber = (v: any) => {
                        if (v == null) return 0;
                        if (typeof v === "number") return v;
                        const n = Number(v);
                        return Number.isFinite(n) ? n : 0;
                     };

                     const countFromStats = (stats: any): number => {
                        if (!stats) return 0;
                        const mappingStr = String(mapping ?? "").toLowerCase();

                        // If it's an array, try multiple heuristics
                        if (Array.isArray(stats)) {
                           // If label is All, try to find an explicit summary/total entry
                           if (label === "All") {
                              // Look for an object that explicitly represents a total/summary
                              const totalLikeKeyRE =
                                 /^(total|all|summary|orders?_count|order_count|total_orders?)$/i;

                              for (const s of stats) {
                                 if (!s || typeof s !== "object") continue;
                                 // Prefer an explicit 'total' or 'summary' key
                                 const key = Object.keys(s).find((k) =>
                                    totalLikeKeyRE.test(k)
                                 );
                                 if (key) return parseNumber(s[key]);
                              }

                              // If none found, try common numeric keys on a single summary object
                              for (const s of stats) {
                                 if (!s || typeof s !== "object") continue;
                                 const v =
                                    s.total ??
                                    s.count ??
                                    s.order_count ??
                                    s.qty ??
                                    s.num ??
                                    s.items;
                                 if (v != null) return parseNumber(v);
                              }

                              // As a last resort, avoid summing multiple buckets (which can double-count across time)
                              // and instead return 0 so the UI falls back to server count or loaded orders length.
                              return 0;
                           }

                           // try to find an element where any string value matches mappingStr
                           const found = stats.find((s: any) => {
                              if (!s || typeof s !== "object") return false;
                              return Object.values(s).some(
                                 (val: any) =>
                                    String(val).toLowerCase() === mappingStr
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
                              // otherwise pick any numeric property
                              const numeric = Object.values(found).find(
                                 (x: any) =>
                                    typeof x === "number" ||
                                    (!isNaN(Number(x)) &&
                                       String(x).trim() !== "")
                              );
                              return parseNumber(numeric);
                           }

                           // fallback: try to find an object that has a key containing the mapping
                           for (const s of stats) {
                              if (s && typeof s === "object") {
                                 const key = Object.keys(s).find(
                                    (k) =>
                                       k.toLowerCase().includes(mappingStr) &&
                                       /count|total|qty|value|num|amount/i.test(
                                          k
                                       )
                                 );
                                 if (key) return parseNumber(s[key]);
                              }
                           }

                           return 0;
                        }

                        // If it's an object map
                        if (typeof stats === "object") {
                           if (label === "All") {
                              // Prefer an explicit total-like key if present (avoid double-counting)
                              const explicitTotalKey = Object.keys(stats).find(
                                 (k) =>
                                    /^(total|total_orders|orders?_total|orders?_count|total_count)$/i.test(
                                       k
                                    )
                              );
                              if (explicitTotalKey)
                                 return parseNumber(
                                    (stats as any)[explicitTotalKey]
                                 );

                              // If no explicit total found, try common numeric keys on a single summary object
                              if ((stats as any).total != null)
                                 return parseNumber((stats as any).total);

                              // Fallback: sum bucket-like keys but exclude any key that looks like an overall total
                              const isCountKey = (k: string) =>
                                 /^(pending|processing|delivered|shipped|cancelled|cancelled_orders|paid|unpaid|external|pending_orders|processing_orders|delivered_orders|shipped_orders|cancelled_orders)$/i.test(
                                    k
                                 );
                              const keys =
                                 Object.keys(stats).filter(isCountKey);
                              if (keys.length)
                                 return keys.reduce(
                                    (acc: number, k: string) =>
                                       acc + parseNumber((stats as any)[k]),
                                    0
                                 );

                              // Last resort: sum numeric-looking values (safe fallback)
                              return Object.values(stats).reduce(
                                 (acc: number, v: any) =>
                                    acc +
                                    (typeof v === "number"
                                       ? v
                                       : Number(v) || 0),
                                 0
                              );
                           }

                           // direct key match (case-insensitive)
                           const directKey = Object.keys(stats).find(
                              (k) => k.toLowerCase() === mappingStr
                           );
                           if (directKey) return parseNumber(stats[directKey]);

                           // partial match
                           const key = Object.keys(stats).find((k) =>
                              k.toLowerCase().includes(mappingStr)
                           );
                           if (key) return parseNumber(stats[key]);
                        }

                        return 0;
                     };

                     let count = 0;

                     // If this is the 'All' label, use a deterministic authoritative source
                     if (label === "All") {
                        // Prefer explicit statsData total first
                        const statsTotal =
                           (statsData as any)?.total_orders ??
                           (statsData as any)?.totalOrders ??
                           (statsData as any)?.total;

                        // Compute a deduplicated count from available data as a robust fallback
                        const unpaginatedData =
                           allOrdersUnpaginated?.data ?? [];
                        const paginatedData = ordersData?.data ?? [];
                        const combined = [...unpaginatedData, ...paginatedData];
                        const dedupCount = new Set(
                           combined.map((o: any) => o?.id)
                        ).size;

                        const preferredAll =
                           statsTotal != null
                              ? parseNumber(statsTotal)
                              : dedupCount > 0
                              ? dedupCount
                              : allOrdersUnpaginated?.count ??
                                totalCount ??
                                orders.length ??
                                0;

                        count = parseNumber(preferredAll);
                     } else {
                        if (statsData) {
                           try {
                              count = countFromStats(statsData);
                           } catch (e) {
                              count = 0;
                           }
                        }

                        // Fallback to counting from loaded orders if stats didn't yield a number
                        if (!count) {
                           count = orders.filter((order) => {
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
                           className={`inline-flex h-10 px-2 items-center text-zinc-800 transition-transform active:scale-[0.98] ${
                              statusFilter === label ? "text-orange-500" : ""
                           } dark:text-zinc-50 group`}
                        >
                           <span className="font-semibold mr-2">{label}</span>
                           <span className="text-[#F26823] transition-all">
                              ({count})
                           </span>
                        </button>
                     );
                  })}
               </AnimatedBackground>
            </div>
            <div className="flex gap-2 items-center max-[500px]:flex-wrap">
               <div className="relative max-[500px]:w-full">
                  <Input
                     className="peer pe-10 border-none shadow-none h-10 sm:h-12 md:min-w-80 md:text-base bg-neutral-100 rounded-xl px-4"
                     placeholder="Search product, customer, etc..."
                     type="search"
                     value={search}
                     onChange={handleSearchChange}
                  />
                  <div className="text-muted-foreground/80 !cursor-pointer absolute inset-y-0 end-0 flex items-center justify-center pe-3 peer-disabled:opacity-50">
                     <SearchIcon
                        size={20}
                        className="text-black"
                     />
                  </div>
               </div>
               <Popover>
                  <PopoverTrigger asChild>
                     <Button
                        variant={"outline"}
                        className="px-3 h-10 sm:h-12 relative"
                     >
                        <ListFilter className="text-neutral-600" />
                        {(!!dateRange.from ||
                           !!dateRange.to ||
                           !!priceRange.min ||
                           !!priceRange.max ||
                           showPaid !== undefined ||
                           !!selectedCity) && (
                           <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                     </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <h4 className="font-medium">Filters</h4>
                              {(!!dateRange.from ||
                                 !!dateRange.to ||
                                 !!priceRange.min ||
                                 !!priceRange.max ||
                                 showPaid !== undefined ||
                                 !!selectedCity) && (
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-orange-500"
                                    onClick={() => {
                                       setDateRange({});
                                       setPriceRange({});
                                       setShowPaid(undefined);
                                       setSelectedCity(undefined);
                                       setPage(1);
                                    }}
                                 >
                                    <FilterX className="h-4 w-4 mr-1" />
                                    Clear all
                                 </Button>
                              )}
                           </div>
                           <div className="border-t" />
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                           <Label>Date Range</Label>
                           <div className="grid grid-cols-2 gap-2">
                              <Input
                                 type="date"
                                 value={dateRange.from || ""}
                                 onChange={(e) =>
                                    setDateRange((prev) => ({
                                       ...prev,
                                       from: e.target.value,
                                    }))
                                 }
                                 placeholder="From"
                              />
                              <Input
                                 type="date"
                                 value={dateRange.to || ""}
                                 onChange={(e) =>
                                    setDateRange((prev) => ({
                                       ...prev,
                                       to: e.target.value,
                                    }))
                                 }
                                 placeholder="To"
                              />
                           </div>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-2">
                           <Label>Price Range (RWF)</Label>
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
                              />
                           </div>
                        </div>

                        {/* City Filter */}
                        <div className="space-y-2">
                           <Label>City</Label>
                           <Select
                              value={selectedCity || "all"}
                              onValueChange={(value) => {
                                 setSelectedCity(
                                    value === "all" ? undefined : value
                                 );
                                 setPage(1);
                              }}
                           >
                              <SelectTrigger>
                                 <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="all">All Cities</SelectItem>
                                 {[
                                    ...new Set(
                                       orders
                                          .map((order) => order.delivery_city)
                                          .filter((city): city is string =>
                                             Boolean(city)
                                          )
                                    ),
                                 ].map((city) => (
                                    <SelectItem
                                       key={city}
                                       value={city}
                                    >
                                       {city}
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>

                        {/* Payment Status */}
                        <div className="space-y-2">
                           <Label>Payment Status</Label>
                           <div className="flex items-center space-x-2">
                              <Checkbox
                                 id="paid"
                                 checked={showPaid}
                                 onCheckedChange={(checked) => {
                                    setShowPaid(
                                       checked === "indeterminate"
                                          ? undefined
                                          : checked
                                    );
                                    setPage(1);
                                 }}
                              />
                              <label
                                 htmlFor="paid"
                                 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                 Show only paid orders
                              </label>
                           </div>
                        </div>
                     </div>
                  </PopoverContent>
               </Popover>

               <Popover>
                  <PopoverTrigger asChild>
                     <Button
                        variant={"outline"}
                        className="px-3 h-10 sm:h-12"
                     >
                        <ArrowUpDown className="text-neutral-600" />
                     </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                     <div className="space-y-1">
                        {[
                           { label: "Date", column: "created_at" },
                           { label: "Order Total", column: "total" },
                           {
                              label: "Customer Name",
                              column: "customer_first_name",
                           },
                        ].map((sortOption) => (
                           <Button
                              key={sortOption.column}
                              variant="ghost"
                              className="w-full justify-start gap-2"
                              onClick={() => {
                                 setSort((prev) => ({
                                    column: sortOption.column,
                                    direction:
                                       prev.column === sortOption.column &&
                                       prev.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                 }));
                                 setPage(1);
                              }}
                           >
                              {sortOption.label}
                              {sort.column === sortOption.column && (
                                 <ArrowUpDown className="h-4 w-4" />
                              )}
                           </Button>
                        ))}
                     </div>
                  </PopoverContent>
               </Popover>
            </div>
         </div>
         <div className="flex flex-col sm:flex-row justify-between mb-3">
            <div className="flex flex-col">
               <h3 className="text-text-primary text-xl font-bold">
                  Order List
               </h3>
               <p className="text-text-secondary">
                  Track orders list across your store.
               </p>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
               <Download className="h-4 w-4 mr-2" />
               Export
            </Button>
         </div>
         {isLoading ? (
            <div className="flex justify-center items-center py-12">
               <Loader2 className="h-8 w-8 animate-spin" />
               <span className="ml-2">Loading orders...</span>
            </div>
         ) : (
            <div className="space-y-4">
               <DataTable
                  columns={columns}
                  data={orders}
               />

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
                              page === 1 ? "pointer-events-none opacity-50" : ""
                           }
                        />
                     </PaginationItem>
                     {getPageNumbers().map((p) => (
                        <PaginationItem key={p}>
                           <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={(e) => {
                                 e.preventDefault();
                                 handlePageChange(p);
                              }}
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
                              hasMore ? "" : "pointer-events-none opacity-50"
                           }
                        />
                     </PaginationItem>
                  </PaginationContent>
               </Pagination>
            </div>
         )}
      </div>
   );
};

export default OrdersTable;
