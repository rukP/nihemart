'use client';

import { useMemo, useState, useEffect } from 'react';
import { DataTable } from './data-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Phone,
  MapPin,
  X,
  Search,
  Filter,
  ChevronDown,
  Users,
  DollarSign,
  ShoppingBag,
  UserCog,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { createCustomerColumns, type Customer } from './customer-columns';
import { useUsers } from '@/hooks/useUsers';
import { type SortBy, type AppRole } from '@/lib/api/users';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../ui/select';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ROLELABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  stock_manager: 'Stock Manager',
  staff: 'Staff',
  rider: 'Rider',
  user: 'User',
};

export function CustomerTable() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [viewCustomerModalOpened, setViewCustomerModalOpened] =
    useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    setOrderCountFilter,
    setSpendFilter,
    resetFilters,
    setSearch,
    roleCounts,
  } = useUsers();

  const [searchQuery, setSearchQuery] = useState('');

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewCustomerModalOpened(true);
  };

  const handleCloseModal = () => {
    setViewCustomerModalOpened(false);
  };

  // Map users to Customer type
  const customers: Customer[] = users.map(u => ({
    id: u.id,
    name: (u as any).full_name || u.fullName || u.email,
    email: u.email,
    phone: u.phone || '',
    location: (u as any).city || '',
    orderCount: u.orderCount || 0,
    totalSpend: u.totalSpend || 0,
    status: 'Active',
    role: u.roles && u.roles.length > 0 ? u.roles[0] : 'user',
    totalOrders: u.orderCount || 0,
    completedOrders: (u as any).completedOrders || 0,
    cancelledOrders: (u as any).cancelledOrders || 0,
    registeredDate: (u as any).created_at || u.createdAt || '',
  }));

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchQuery || '');
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, setSearch, setPage]);

  const filteredBySearch = useMemo(() => customers, [customers]);

  const columns = useMemo(
    () =>
      createCustomerColumns(
        handleViewCustomer,
        async (customerId: string, makeAdmin?: boolean) => {
          const role = makeAdmin ? 'admin' : 'user';
          await updateUserRole(customerId, role as AppRole);
          toast.success(`User role updated to ${role}`);
        },
        async (customerId: string) => {
          await deleteUser(customerId, false);
          toast.success('User deleted successfully');
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

  const activeFilterCount = [
    filters.role,
    filters.fromDate || filters.toDate,
    filters.minOrders !== null || filters.maxOrders !== null,
    filters.minSpend !== null || filters.maxSpend !== null,
    searchQuery,
  ].filter(Boolean).length;

  return (
    <>
      <Card className="border-0 shadow-sm mt-5">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  User Management
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Manage and monitor all users in your system
                  {hasActiveFilters && (
                    <span className="ml-2">
                      • {filteredCount ?? 0} of {totalCount ?? 0} users
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    resetFilters();
                    setPage(1);
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or role..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-11"
              />
            </div>

            {/* Filters Section */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {activeFilterCount}
                      </Badge>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      resetFilters();
                      setPage(1);
                    }}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Clear all
                  </Button>
                )}
              </div>

              <CollapsibleContent className="space-y-4 pt-4">
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sort By</Label>
                    <Select
                      value={filters.sortBy || 'recent'}
                      onValueChange={v => {
                        console.log('[CustomerTable] Sort changed to:', v);
                        setSortBy(v as SortBy);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">
                          Newest Registered
                        </SelectItem>
                        <SelectItem value="oldest">
                          Oldest Registered
                        </SelectItem>
                        <SelectItem value="most_orders">Most Orders</SelectItem>
                        <SelectItem value="highest_spend">
                          Highest Spend
                        </SelectItem>
                        <SelectItem value="lowest_spend">
                          Lowest Spend
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Role</Label>
                    <Select
                      value={filters.role || 'all'}
                      onValueChange={v => {
                        setRoleFilter(v === 'all' ? null : (v as AppRole));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {Object.entries(roleCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([role, count]) => (
                            <SelectItem key={role} value={role}>
                              {ROLELABELS[role] || role} ({count})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Registration Date
                    </Label>
                    <Select
                      value={
                        filters.fromDate || filters.toDate ? 'custom' : 'all'
                      }
                      onValueChange={v => {
                        if (v === 'all') {
                          setDateRange(null, null);
                          setPage(1);
                        } else if (v === 'today') {
                          const t = new Date();
                          const start = new Date(
                            t.getFullYear(),
                            t.getMonth(),
                            t.getDate()
                          );
                          const end = new Date(start);
                          end.setDate(end.getDate() + 1);
                          setDateRange(start, end);
                          setPage(1);
                        } else if (v === 'week') {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - 7);
                          setDateRange(start, end);
                          setPage(1);
                        } else if (v === 'month') {
                          const end = new Date();
                          const start = new Date();
                          start.setMonth(end.getMonth() - 1);
                          setDateRange(start, end);
                          setPage(1);
                        }
                      }}
                    >
                      <SelectTrigger>
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

                  {/* Order Count Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Order Count</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minOrders ?? ''}
                        onChange={e => {
                          const val = e.target.value
                            ? Number(e.target.value)
                            : null;
                          setOrderCountFilter(val, filters.maxOrders ?? null);
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxOrders ?? ''}
                        onChange={e => {
                          const val = e.target.value
                            ? Number(e.target.value)
                            : null;
                          setOrderCountFilter(filters.minOrders ?? null, val);
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Total Spend Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Total Spend (RWF)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minSpend ?? ''}
                        onChange={e => {
                          const val = e.target.value
                            ? Number(e.target.value)
                            : null;
                          setSpendFilter(val, filters.maxSpend ?? null);
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxSpend ?? ''}
                        onChange={e => {
                          const val = e.target.value
                            ? Number(e.target.value)
                            : null;
                          setSpendFilter(filters.minSpend ?? null, val);
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Per Page */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Per Page</Label>
                    <Select
                      value={String(limit)}
                      onValueChange={v => {
                        setLimit(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {filters.role && (
                      <Badge variant="secondary" className="gap-1">
                        Role: {ROLELABELS[filters.role] || filters.role}
                        <button
                          onClick={() => setRoleFilter(null)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          title="Clear role filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {(filters.fromDate || filters.toDate) && (
                      <Badge variant="secondary" className="gap-1">
                        Date Range
                        <button
                          onClick={() => setDateRange(null, null)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          title="Clear date range filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {(filters.minOrders !== null ||
                      filters.maxOrders !== null) && (
                      <Badge variant="secondary" className="gap-1">
                        Orders: {filters.minOrders ?? 'Any'} -{' '}
                        {filters.maxOrders ?? 'Any'}
                        <button
                          onClick={() => setOrderCountFilter(null, null)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          title="Clear order count filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {(filters.minSpend !== null ||
                      filters.maxSpend !== null) && (
                      <Badge variant="secondary" className="gap-1">
                        Spend: RWF {filters.minSpend ?? 'Any'} -{' '}
                        {filters.maxSpend ?? 'Any'}
                        <button
                          onClick={() => setSpendFilter(null, null)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          title="Clear spend filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: {searchQuery}
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          title="Clear search query"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-red-500 mb-2">Error loading users</div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No users found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'No users in the system yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="border-t">
                <DataTable columns={columns} data={filteredBySearch} />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-medium text-foreground">
                    {(page - 1) * limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(page * limit, filteredCount ?? 0)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-foreground">
                    {filteredCount ?? 0}
                  </span>{' '}
                  users
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        className={
                          page === 1 ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                    {(() => {
                      const pages: (number | 'ellipsis')[] = [];
                      const maxVisible = 5;

                      if (totalPages <= maxVisible) {
                        // Show all pages if total is small
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Always show first page
                        pages.push(1);

                        if (page > 3) {
                          pages.push('ellipsis');
                        }

                        // Show pages around current page
                        const start = Math.max(2, page - 1);
                        const end = Math.min(totalPages - 1, page + 1);

                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPages) {
                            pages.push(i);
                          }
                        }

                        if (page < totalPages - 2) {
                          pages.push('ellipsis');
                        }

                        // Always show last page
                        if (totalPages > 1) {
                          pages.push(totalPages);
                        }
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
                                setPage(p);
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
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        className={
                          page === totalPages
                            ? 'pointer-events-none opacity-50'
                            : ''
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xl font-semibold">
                    {getInitials(selectedCustomer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedCustomer.email}
                  </p>
                  {selectedCustomer.registeredDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Registered:{' '}
                      {new Date(
                        selectedCustomer.registeredDate
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {selectedCustomer.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {selectedCustomer.location || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <UserCog className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge variant="outline" className="mt-1">
                      {ROLELABELS[selectedCustomer.role || 'user'] ||
                        selectedCustomer.role ||
                        'User'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Orders
                    </p>
                    <p className="font-medium text-lg">
                      {selectedCustomer.totalOrders}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Stats */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Order Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCustomer.totalOrders}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Total Orders
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedCustomer.completedOrders}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedCustomer.cancelledOrders}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Cancelled</div>
                  </div>
                </div>
              </div>

              {/* Total Spend */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">
                      {new Intl.NumberFormat('en-RW', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(selectedCustomer.totalSpend)}{' '}
                      RWF
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-green-600 opacity-50" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
