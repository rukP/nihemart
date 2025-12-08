"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import useRiders, {
  useAssignOrder,
  useRiderAssignments,
} from "@/hooks/useRiders";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import dynamic from "next/dynamic";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/riders/data-table";
import { TableFilters } from "@/components/admin/table-filters";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { PlusCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AssignOrderToRiderDialog = dynamic(
  () => import("@/components/riders/AssignOrderToRiderDialog")
);
const EditMediaDialog = dynamic(
  () => import("@/components/riders/EditRiderMediaDialog")
);
const EditRiderDialog = dynamic(
  () => import("@/components/riders/EditRiderDialog")
);
const RiderDetailsDialog = dynamic(
  () => import("@/components/riders/RiderDetailsDialog")
);

const RidersPage = () => {
  const { hasRole, session } = (useAuth as any)?.() || {
    hasRole: undefined,
    session: undefined,
  };
  const { data, isLoading, isError, refetch } = useRiders();
  const assign = useAssignOrder();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRiderId, setActiveRiderId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [mediaDialog, setMediaDialog] = useState<{
    open: boolean;
    rider: any | null;
  }>({ open: false, rider: null });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    riderId: string | null;
  }>({ open: false, riderId: null });
  const [editRiderDialog, setEditRiderDialog] = useState<{
    open: boolean;
    rider: any | null;
  }>({ open: false, rider: null });

  // confirmation dialogs state
  const [confirmToggle, setConfirmToggle] = useState<{
    open: boolean;
    riderId?: string;
    newState?: boolean;
  }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    riderId?: string;
  }>({ open: false });

  const riders = data || [];

  const openAssignDialog = (riderId: string) => {
    setActiveRiderId(riderId);
    setDialogOpen(true);
  };

  const onAssigned = () => {
    toast.success("Order assigned");
    refetch();
  };

  // metrics and filters state
  const totalRiders = riders.length;
  const activeRiders = riders.filter((r: any) => r.active).length;
  const vehiclesList = Array.from(
    new Set(riders.map((r: any) => r.vehicle).filter(Boolean))
  );
  const vehicles = vehiclesList.length;

  // Filters (client-side) to mirror OrdersTable UX
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Disabled" | "Inactive"
  >("All");
  const [vehicleFilter, setVehicleFilter] = useState<string | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const limit = 10; // fixed page size to match admin/orders

  // fetch top rider (who has the most successful deliveries)
  const [topRider, setTopRider] = useState<any | null>(null);
  const fetchTopRider = async () => {
    try {
      const res = await fetch("/api/admin/riders/top-amount");
      if (!res.ok) {
        console.error("Top rider API failed:", res.status, res.statusText);
        throw new Error("Failed to fetch top rider");
      }
      const d = await res.json();
      console.log("Top rider data received:", d);
      // API returns { topRiderId, topAmount, deliveryCount }
      if (d && d.topRiderId) {
        // fetch rider details
        const r = riders.find((x: any) => x.id === d.topRiderId);
        if (r) {
          setTopRider({
            ...r,
            deliveredCount: d.deliveryCount || d.topAmount,
          });
        } else {
          // fallback to server API to fetch rider row by id
          const rr = await fetch(
            `/api/admin/riders?rid=${encodeURIComponent(d.topRiderId)}`
          );
          if (rr.ok) {
            const jr = await rr.json();
            setTopRider({
              ...(jr.rider || {}),
              deliveredCount: d.deliveryCount || d.topAmount,
            });
          } else {
            setTopRider({
              id: d.topRiderId,
              deliveredCount: d.deliveryCount || d.topAmount,
            });
          }
        }
      } else {
        setTopRider(null);
      }
    } catch (err) {
      console.error("fetchTopRider error", err);
      setTopRider(null);
    }
  };

  // Fetch top rider once after the riders data has been loaded. Use a ref to
  // ensure we don't refetch repeatedly when `riders` array identity changes.
  const topRiderFetchedRef = React.useRef(false);
  useEffect(() => {
    if (topRiderFetchedRef.current) return;
    if (!riders || riders.length === 0) return;
    topRiderFetchedRef.current = true;
    fetchTopRider();
  }, [riders]);

  // Helper components and table columns must be defined in component scope (not inside JSX)
  // Local state to hold the latest assignment per rider for the current page.
  const [latestAssignmentsMap, setLatestAssignmentsMap] = useState<
    Record<string, any>
  >({});
  const [earningsMap, setEarningsMap] = useState<Record<string, number>>({});

  // Fetch batched latest assignment for the riders currently shown on the page.
  const fetchLatestAssignmentsForPage = async (riderIds: string[]) => {
    if (!riderIds || riderIds.length === 0) {
      // Nothing to fetch — do not update state to avoid triggering re-renders
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/rider-assignments?ids=${encodeURIComponent(
          riderIds.join(",")
        )}`
      );
      if (!res.ok) {
        console.error("Failed to fetch batched assignments", res.status);
        return;
      }
      const json = await res.json();
      setLatestAssignmentsMap(json.assignments || {});
    } catch (err) {
      console.error("fetchLatestAssignmentsForPage error", err);
    }
  };

  const EarningsCell = ({ row }: any) => {
    const riderId = row.original.id;
    const amt = earningsMap[riderId] || 0;
    console.log(
      `EarningsCell for rider ${riderId}:`,
      amt,
      "earningsMap:",
      earningsMap
    );
    return (
      <div className="text-sm font-medium">{amt.toLocaleString()} RWF</div>
    );
  };

  // Removed AddressCell per request

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "full_name",
      header: "RIDER",
      cell: ({ row }) => {
        const name = String(row.getValue("full_name") || "Unnamed");
        const phone = String(row.original.phone || "");
        const imageUrl = String(row.original.image_url || "");
        return (
          <UserAvatarProfile
            user={{ fullName: name, subTitle: phone, imageUrl }}
            showInfo
          />
        );
      },
    },
    {
      accessorKey: "vehicle",
      header: "VEHICLE",
    },
    {
      accessorKey: "active",
      header: "STATUS",
      cell: ({ row }) => {
        const active = row.getValue("active");
        return (
          <Badge
            className={
              active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }
          >
            {active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      id: "earnings",
      header: "EARNINGS",
      cell: ({ row }) => <EarningsCell row={row} />,
    },
    {
      accessorKey: "location",
      header: "LOCATION",
      cell: ({ row }) => (
        <div className="text-sm text-text-secondary max-w-sm truncate">
          {String(row.original.location || "—")}
        </div>
      ),
    },
    // Address column removed per request
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const rider = row.original;
        return (
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
                onClick={() =>
                  setDetailsDialog({ open: true, riderId: rider.id })
                }
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openAssignDialog(rider.id)}
                disabled={rider.active === false}
              >
                {rider.active === false
                  ? "Cannot assign (inactive)"
                  : "Assign to order"}
              </DropdownMenuItem>
              {/* 'Edit image/location' replaced by full 'Edit Rider' action */}
              {hasRole && hasRole("admin") && (
                <DropdownMenuItem
                  onClick={() => setEditRiderDialog({ open: true, rider })}
                >
                  Edit Rider
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setConfirmToggle({
                    open: true,
                    riderId: rider.id,
                    newState: !rider.active,
                  })
                }
              >
                {rider.active ? "Disable rider" : "Enable rider"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setConfirmDelete({ open: true, riderId: rider.id })
                }
              >
                Delete rider
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(rider.id)}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // derive filtered and paginated list
  const uniqueVehicles = useMemo(
    () => ["all", ...vehiclesList.filter(Boolean)],
    [vehiclesList]
  );

  const filteredRiders = useMemo(() => {
    let list = (riders || []).slice();
    // search by name or phone
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r: any) => {
        return (
          String(r.full_name || "")
            .toLowerCase()
            .includes(q) ||
          String(r.phone || "")
            .toLowerCase()
            .includes(q)
        );
      });
    }
    // status filter
    if (statusFilter && statusFilter !== "All") {
      const wantActive = statusFilter === "Active";
      list = list.filter((r: any) => Boolean(r.active) === wantActive);
    }
    // vehicle filter
    if (vehicleFilter && vehicleFilter !== "all") {
      list = list.filter(
        (r: any) => String(r.vehicle) === String(vehicleFilter)
      );
    }
    return list;
  }, [riders, search, statusFilter, vehicleFilter]);

  const totalCount = filteredRiders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRiders.slice(start, start + limit);
  }, [filteredRiders, page]);

  // When the visible page of riders changes, fetch their latest assignments in bulk.
  useEffect(() => {
    const ids = paginated.map((r: any) => r.id).filter(Boolean);
    fetchLatestAssignmentsForPage(ids);
  }, [paginated]);

  // Fetch earnings map once after load and whenever refetch is triggered
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/riders/earnings");
        if (!res.ok) {
          console.error("Earnings API failed:", res.status, res.statusText);
          return;
        }
        const j = await res.json();
        console.log("Earnings data received:", j);
        setEarningsMap(j.earnings || {});
      } catch (e) {
        console.error("Earnings fetch error:", e);
      }
    })();
  }, [refetch]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(totalCount, page * limit);

  // Note: DataTable component for riders creates its own react-table instance
  // when passed `columns` and `data`. We pass `paginated` below.

  if (isLoading) return <div className="p-6">Loading riders...</div>;
  if (isError)
    return <div className="p-6 text-red-500">Failed to load riders.</div>;

  return (
    <div className="bg-surface-secondary h-[calc(100vh-5rem)] overflow-auto">
      <div className="px-5 sm:px-10 py-10 max-w-full">
        {/* Header styled like OrdersMetrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2 mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-[#023337]">Rider List</h1>
            <p className="text-zinc-500 sm:hidden">
              Track riders list across your store.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/riders/new">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Rider
              </Button>
            </Link>
            <Link href="/admin/riders/import">
              <Button variant="outline">Import Riders</Button>
            </Link>
          </div>
        </div>

        {/* Top Rider card + other Metrics Cards styled like OrdersMetrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 max-w-full">
          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">
                Top Rider
              </h3>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        refetch && refetch();
                        fetchTopRider();
                      }}
                    >
                      Refresh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {topRider ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <UserAvatarProfile
                      user={{
                        fullName: topRider.full_name || "Unnamed",
                        subTitle: topRider.phone || "",
                      }}
                      showInfo
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {topRider.deliveredCount || 0} successful deliveries
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </CardContent>
          </Card>
          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">
                Total Riders
              </h3>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => refetch && refetch()}>
                      Refresh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">
                  {totalRiders}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+0%</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Last 7 days
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">
                Active Riders
              </h3>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => refetch && refetch()}>
                      Refresh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">
                  {activeRiders}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+0%</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Last 7 days
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">Vehicles</h3>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => refetch && refetch()}>
                      Refresh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">
                  {vehicles}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>0%</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Last 7 days
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-5 rounded-2xl bg-white mt-6">
          {/* Header similar to OrdersTable */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-text-primary text-xl font-bold">Riders</h3>
              <p className="text-text-secondary">
                Manage your riders and assignments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch && refetch();
                  fetchTopRider();
                }}
              >
                Refresh
              </Button>
              <Link href="/admin/riders/new">
                <Button className="bg-orange-600 text-white">Add Rider</Button>
              </Link>
            </div>
          </div>

          {/* Filters (re-using TableFilters component) */}
          <TableFilters
            searchTerm={search}
            onSearchChange={(t) => {
              setSearch(t);
              setPage(1);
            }}
            categoryFilter={vehicleFilter || "all"}
            onCategoryChange={(v) => {
              setVehicleFilter(v === "all" ? undefined : v);
              setPage(1);
            }}
            uniqueCategories={uniqueVehicles}
            statusFilter={statusFilter.toLowerCase()}
            onStatusChange={(v) => {
              // v can be 'all' or 'active'|'disabled'|'inactive'
              const mapped =
                v === "all"
                  ? "All"
                  : v === "active"
                    ? "Active"
                    : v === "inactive"
                      ? "Inactive"
                      : "Disabled";
              setStatusFilter(mapped as any);
              setPage(1);
            }}
            uniqueStatuses={["all", "active", "disabled", "inactive"]}
          />

          {/* Table wrapper: make horizontally scrollable on small screens similar to OrdersTable */}
          <div className="overflow-x-auto">
            <div className="flex flex-col gap-4">
              <DataTable columns={columns} data={paginated} />

              {/* Pagination controls (move inside min-w container so it stays visible on small screens) */}
              <div className="mt-0 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {rangeStart} - {rangeEnd} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.max(1, page - 1));
                    }}
                    className={
                      page === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({
                      length: Math.max(1, Math.min(5, totalPages)),
                    }).map((_, i) => {
                      const p = Math.min(totalPages, Math.max(1, page - 2 + i));
                      const key = `${p}-${i}`;
                      return (
                        <Button
                          size="sm"
                          key={key}
                          variant={p === page ? "default" : "ghost"}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.min(totalPages, page + 1));
                    }}
                    className={
                      page === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {activeRiderId && (
          <AssignOrderToRiderDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setActiveRiderId(null);
            }}
            riderId={activeRiderId}
            onAssigned={onAssigned}
          />
        )}

        {mediaDialog.open && (
          <EditMediaDialog
            open={mediaDialog.open}
            rider={mediaDialog.rider}
            token={session?.access_token}
            onClose={() => setMediaDialog({ open: false, rider: null })}
            onSaved={() => {
              setMediaDialog({ open: false, rider: null });
              refetch && refetch();
            }}
          />
        )}

        {editRiderDialog.open && (
          <EditRiderDialog
            open={editRiderDialog.open}
            rider={editRiderDialog.rider}
            token={session?.access_token}
            onClose={() => setEditRiderDialog({ open: false, rider: null })}
            onSaved={() => {
              setEditRiderDialog({ open: false, rider: null });
              refetch && refetch();
            }}
          />
        )}

        {detailsDialog.open && (
          <RiderDetailsDialog
            open={detailsDialog.open}
            riderId={detailsDialog.riderId as string}
            onOpenChange={(o) =>
              !o && setDetailsDialog({ open: false, riderId: null })
            }
          />
        )}

        {/* Toggle active mutation */}
        <ToggleActiveController
          confirm={confirmToggle}
          setConfirm={setConfirmToggle}
          qc={qc}
          refetch={refetch}
        />

        {/* Delete mutation */}
        <DeleteRiderController
          confirm={confirmDelete}
          setConfirm={setConfirmDelete}
          qc={qc}
          refetch={refetch}
        />
      </div>
    </div>
  );
};

function RidersPageWrapper() {
  return (
    <ProtectedRoute requiredSection="riders">
      <RidersPage />
    </ProtectedRoute>
  );
}

export default RidersPageWrapper;

// Controller component: handles toggling active state with confirmation dialog
function ToggleActiveController({ confirm, setConfirm, qc, refetch }: any) {
  const mutation = useMutation({
    mutationFn: async ({ riderId, newState }: any) => {
      const res = await fetch("/api/admin/update-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, updates: { active: newState } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update rider");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["riders"] });
      refetch && refetch();
      toast.success("Rider updated");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.message || "Failed to update rider");
    },
  });

  const riderId = confirm?.riderId;

  return (
    <AlertDialog open={!!confirm?.open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mutation.status === "pending"
              ? "Updating rider..."
              : "Change rider status"}
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Are you sure you want to {confirm?.newState ? "enable" : "disable"}{" "}
            this rider?
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirm({ open: false })}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!riderId) return;
              const newState = !!confirm?.newState;
              mutation.mutate({ riderId, newState });
              setConfirm({ open: false });
            }}
          >
            {mutation.status === "pending" ? "Updating..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Controller component: handles deleting rider with confirmation
function DeleteRiderController({ confirm, setConfirm, qc, refetch }: any) {
  const mutation = useMutation({
    mutationFn: async ({ riderId }: any) => {
      const res = await fetch("/api/admin/delete-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete rider");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["riders"] });
      refetch && refetch();
      toast.success("Rider deleted");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.message || "Failed to delete rider");
    },
  });

  const riderId = confirm?.riderId;

  return (
    <AlertDialog open={!!confirm?.open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mutation.status === "pending"
              ? "Deleting rider..."
              : "Delete rider"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Rider and related data will be
            removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirm({ open: false })}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!riderId) return;
              mutation.mutate({ riderId });
              setConfirm({ open: false });
            }}
          >
            {mutation.status === "pending" ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
