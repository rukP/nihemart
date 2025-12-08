"use client";

import { useMemo, useState, useEffect } from "react";
import { DataTable } from "./data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createCustomerColumns, type Customer } from "./customer-columns";
import { useUsers, type SortBy } from "@/hooks/useUsers";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function CustomerTable() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [viewCustomerModalOpened, setViewCustomerModalOpened] =
    useState<boolean>(false);

  // Fetch initial data (server-side filtering)
  const {
    users,
    loading,
    error,
    page,
    limit,
    setPage,
    setLimit,
    totalCount,
    filteredCount,
    updateUserRole,
    deleteUser,
    filters,
    setSortBy,
    setRoleFilter,
    setDateRange,
    resetFilters,
    setSearch,
    roleCounts,
  } = useUsers();

  // Local state for search query
  const [searchQuery, setSearchQuery] = useState("");

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewCustomerModalOpened(true);
  };

  const handleCloseModal = () => {
    setViewCustomerModalOpened(false);
  };

  // Map users to Customer type for DataTable - show ALL users
  const customers: Customer[] = users.map((u) => ({
    id: u.id,
    name: u.full_name || u.email,
    email: u.email,
    phone: u.phone || "",
    location: (u as any).city || "",
    orderCount: u.orderCount || 0,
    totalSpend: u.totalSpend || 0,
    status: "Active",
    role: u.role,
    totalOrders: u.orderCount || 0,
    completedOrders: (u as any).completedOrders || 0,
    cancelledOrders: (u as any).cancelledOrders || 0,
    registeredDate: u.created_at,
  }));

  // When searchQuery changes, update server-side filter
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchQuery || "");
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, setSearch, setPage]);

  // Use the filtered data from the server (don't filter again client-side)
  const filteredBySearch = useMemo(() => customers, [customers]);

  const columns = useMemo(
    () =>
      createCustomerColumns(
        handleViewCustomer,
        async (customerId: string, makeAdmin?: boolean) => {
          // Toggle role
          const role = makeAdmin ? "admin" : "user";
          await updateUserRole(customerId, role as any);
        },
        async (customerId: string) => {
          // Soft delete user
          await deleteUser(customerId, false);
        }
      ),
    [handleViewCustomer, updateUserRole, deleteUser]
  );

  const hasActiveFilters = Boolean(
    filters.role ||
      filters.fromDate ||
      filters.toDate ||
      filters.minOrders !== null ||
      filters.maxOrders !== null ||
      filters.minSpend !== null ||
      filters.maxSpend !== null ||
      searchQuery
  );

  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / limit));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="w-full flex flex-col gap-4">
            {/* Title and Search Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">
                  User Management
                </CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {filteredCount ?? 0} of {totalCount ?? 0} users
                  {hasActiveFilters && " (filtered)"}
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sort By */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                    Sort By
                  </Label>
                  <Select
                    value={filters.sortBy || "recent"}
                    onValueChange={(v) => setSortBy(v as SortBy)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Newest Registered</SelectItem>
                      <SelectItem value="oldest">Oldest Registered</SelectItem>
                      <SelectItem value="time_registered_desc">
                        Time (Newest)
                      </SelectItem>
                      <SelectItem value="time_registered_asc">
                        Time (Oldest)
                      </SelectItem>
                      <SelectItem value="most_orders">Most Orders</SelectItem>
                      <SelectItem value="highest_spend">
                        Highest Spend
                      </SelectItem>
                      <SelectItem value="lowest_spend">Lowest Spend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Filter */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                    Role
                  </Label>
                  <Select
                    value={filters.role || "all"}
                    onValueChange={(v) =>
                      setRoleFilter(v === "all" ? null : (v as any))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Roles ({totalCount ?? 0})
                      </SelectItem>
                      {Object.entries(roleCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([role, count]) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)} (
                            {count})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                    Registration Date
                  </Label>
                  <Select
                    value={
                      filters.fromDate || filters.toDate ? "custom" : "all"
                    }
                    onValueChange={(v) => {
                      if (v === "all") {
                        setDateRange(null, null);
                      } else if (v === "today") {
                        const t = new Date();
                        const start = new Date(
                          t.getFullYear(),
                          t.getMonth(),
                          t.getDate()
                        );
                        const end = new Date(start);
                        end.setDate(end.getDate() + 1);
                        setDateRange(start, end);
                      } else if (v === "week") {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - 6);
                        setDateRange(start, end);
                      } else if (v === "month") {
                        const end = new Date();
                        const start = new Date();
                        start.setMonth(end.getMonth() - 1);
                        setDateRange(start, end);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Per Page */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                    Per Page
                  </Label>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      setLimit(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Range */}
              {filters.fromDate || filters.toDate ? (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-blue-900">
                      Selected Range:
                    </span>
                    {filters.fromDate && (
                      <span className="text-xs text-blue-800">
                        From {new Date(filters.fromDate).toLocaleDateString()}
                      </span>
                    )}
                    {filters.toDate && (
                      <span className="text-xs text-blue-800">
                        To {new Date(filters.toDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      resetFilters();
                      setPage(1);
                    }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading customers...</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No customers found
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={filteredBySearch} />
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        className={
                          page === 1 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                    {Array.from({
                      length: Math.min(totalPages, 5),
                    }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <Dialog open={viewCustomerModalOpened} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Customer Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {getInitials(selectedCustomer?.name ?? "")}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedCustomer?.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedCustomer?.email}
                  </p>
                  {selectedCustomer?.registeredDate && (
                    <p className="text-gray-500 text-xs">
                      Registered:{" "}
                      {new Date(
                        selectedCustomer.registeredDate
                      ).toLocaleDateString("en-RW", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Customer Info
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedCustomer?.phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedCustomer?.location || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium">Role:</span>
                    <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {selectedCustomer?.role || "user"}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Order Overview
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCustomer?.totalOrders}
                    </div>
                    <div className="text-xs text-blue-600">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedCustomer?.completedOrders}
                    </div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedCustomer?.cancelledOrders}
                    </div>
                    <div className="text-xs text-red-600">Cancelled</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Total Spend
                </h4>
                <div className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat("en-RW", {
                    style: "currency",
                    currency: "RWF",
                    maximumFractionDigits: 0,
                  }).format(selectedCustomer?.totalSpend ?? 0)}
                </div>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </>
  );
}
