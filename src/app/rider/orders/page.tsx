"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  useMyRiderProfile,
  useMyAssignments,
  useRespondToAssignment,
} from "@/hooks/useRiders";
import { useOrders } from "@/hooks/useOrders";
import { fetchOrderById } from "@/lib/api/orders";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import {
  MoreHorizontal,
  Search,
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  Filter,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const Page = () => {
  const { user, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const respond = useRespondToAssignment();

  const { data: rider, isLoading: loadingRider } = useMyRiderProfile();
  const {
    data: assignments,
    isLoading,
    refetch: refetchAssignments,
  } = useMyAssignments();
  const { markTransportOnly } = useOrders();

  // Orders top date filter: Today | All time | Custom
  const [ordersTopFilter, setOrdersTopFilter] = useState<string>("today");
  const [ordersTopDateRange, setOrdersTopDateRange] = useState<{
    from?: string;
    to?: string;
  }>({});
  const [tempOrdersRange, setTempOrdersRange] = useState<{
    from?: string;
    to?: string;
  }>({});
  const [ordersPopoverOpen, setOrdersPopoverOpen] = useState<boolean>(false);

  // Transport Only dialog state
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [transportOrderId, setTransportOrderId] = useState<string | null>(null);
  const [isTransporting, setIsTransporting] = useState(false);

  // Robust parse for YYYY-MM-DD date inputs
  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(value + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const getDateRangeForOrdersFilter = (
    filter: string,
  ): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (filter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (filter === "all") {
      const start = new Date(0);
      return { start, end };
    }

    // default for custom when no range provided: last 7 days
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  };

  // Filter assignments according to ordersTopFilter / ordersTopDateRange
  const ordersFilteredAssignments = useMemo(() => {
    const { start, end } = getDateRangeForOrdersFilter(ordersTopFilter);
    const startDate = parseDate(ordersTopDateRange.from);
    const endDate = parseDate(ordersTopDateRange.to);

    const actualStart = startDate || start;
    const actualEnd = endDate
      ? (() => {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          return e;
        })()
      : end;

    return (assignments || []).filter((a: any) => {
      const order = a.order || a.orders || null;
      const timestamps = [
        a.assignedAt || a.assigned_at,
        a.deliveredAt || a.delivered_at,
        a.completedAt || a.completed_at,
        a.updatedAt || a.updated_at,
        a.createdAt || a.created_at,
        order?.deliveredAt || order?.delivered_at,
        order?.completedAt || order?.completed_at,
        order?.updatedAt || order?.updated_at,
        order?.createdAt || order?.created_at,
      ]
        .map(parseDate)
        .filter(Boolean) as Date[];
      const ts = timestamps[0];
      if (!ts) return false;

      return ts >= actualStart && ts <= actualEnd;
    });
  }, [assignments, ordersTopFilter, ordersTopDateRange]);

  // Cache for order details when assignment does not include joined order data
  const [orderMap, setOrderMap] = useState<Record<string, any>>({});
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  // Handler to respond to assignments (accepted/rejected/completed)
  const handleRespond = async (
    assignmentId: string,
    status: "accepted" | "rejected" | "completed",
  ) => {
    try {
      await respond.mutateAsync({ assignmentId, status });
      // Provide a nice toast for success
      if (status === "accepted")
        toast.success("Assignment accepted successfully!");
      else if (status === "rejected") toast.success("Assignment rejected");
      else if (status === "completed")
        toast.success("Order marked as delivered!");
    } catch (err: any) {
      console.error(err);
      const msg =
        (err && err.error && (err.error.message || err.error)) ||
        err?.message ||
        (typeof err === "string" ? err : null) ||
        "Failed to respond to assignment";
      toast.error(String(msg));
    }
  };

  // Prepare table data and columns in stable hooks to avoid changing hook order
  const data = useMemo(() => {
    return (ordersFilteredAssignments || []).map((a: any) => {
      // Backend returns assignment with order included
      let order: any = null;
      if (a.order) order = a.order;
      if (!order && a.orders) order = a.orders; // Fallback for old format
      if (typeof order === "string") {
        try {
          order = JSON.parse(order);
        } catch (e) {}
      }
      if (Array.isArray(order)) order = order[0] || null;
      if (!order && orderMap[a.orderId]) order = orderMap[a.orderId];
      if (!order && orderMap[a.order_id]) order = orderMap[a.order_id]; // Fallback

      // Check both camelCase (from Prisma) and snake_case (legacy) formats
      const deliveryAddress = order?.deliveryAddress || order?.delivery_address;
      const deliveryCity = order?.deliveryCity || order?.delivery_city;
      const location =
        (deliveryAddress && deliveryCity
          ? `${deliveryAddress}, ${deliveryCity}`
          : deliveryAddress || deliveryCity) ||
        a.location ||
        a.address ||
        "-";
      let deliveryFee: number | null = null;
      if (order) {
        // Get delivery fee from order.tax field
        if (typeof order.tax === "number") deliveryFee = order.tax;
      }
      if (deliveryFee == null) {
        // Fallback to assignment data if available
        if (typeof a.delivery_fee === "number") deliveryFee = a.delivery_fee;
        else if (typeof a.fee === "number") deliveryFee = a.fee;
      }

      // Extract label information if available
      const label =
        order?.is_labeled && order?.label_number && order?.location_code
          ? `L-${order.label_number} | ${order.location_code}${
              order?.order_count ? ` | #${order.order_count}` : ""
            }`
          : null;

      return {
        assignment: a,
        order,
        orderNumber: order?.orderNumber
          ? `#${order.orderNumber}`
          : order?.order_number
            ? `#${order.order_number}`
            : `#${a.orderId || a.order_id}`,
        label,
        location,
        deliveryFee,
        status: a.status,
        assignedAt: a.assignedAt || a.assigned_at,
      };
    });
  }, [ordersFilteredAssignments, orderMap]);

  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter((row: any) => {
      const text =
        `${row.orderNumber} ${row.location} ${row.status}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [data, search]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<any>();
    return [
      // selection column
      {
        id: "select",
        header: ({ table }: any) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v: any) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }: any) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v: any) => row.toggleSelected(!!v)}
          />
        ),
        enableSorting: false,
        size: 50,
      },
      columnHelper.accessor("orderNumber", {
        header: t("rider.orders.order"),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-gray-900">
                  {info.getValue()}
                </span>
                {row.label && (
                  <span className="text-xs font-semibold text-orange-600">
                    {row.label}
                  </span>
                )}
              </div>
            </div>
          );
        },
        size: 150,
      }),
      columnHelper.accessor("location", {
        header: t("rider.orders.deliveryLocation"),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 max-w-xs truncate">
              {info.getValue()}
            </span>
          </div>
        ),
        size: 250,
      }),
      columnHelper.accessor("deliveryFee", {
        header: t("rider.orders.deliveryFee"),
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className="font-semibold text-gray-900">
              {v != null ? `RWF ${Number(v).toLocaleString()}` : "-"}
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("status", {
        header: t("rider.orders.actions"),
        cell: (info) => {
          const row = info.row.original;
          const a = row.assignment;

          if (a.status === "assigned") {
            return (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespond(a.id, "accepted")}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={respond.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t("rider.orders.accept")}
                </Button>
                <Button
                  onClick={() => handleRespond(a.id, "rejected")}
                  size="sm"
                  variant="destructive"
                  disabled={respond.isPending}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t("rider.orders.reject")}
                </Button>
              </div>
            );
          }

          if (a.status === "accepted") {
            return (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespond(a.id, "completed")}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={respond.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t("rider.orders.markDelivered")}
                </Button>

                <Button
                  onClick={() => {
                    const orderId =
                      a.orderId || a.order_id || (a.order && a.order.id);
                    if (!orderId) {
                      toast.error("Order id not available");
                      return;
                    }
                    setTransportOrderId(orderId);
                    setTransportDialogOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  disabled={(markTransportOnly as any).isLoading}
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Transport Only
                </Button>
              </div>
            );
          }

          // Status badges for completed states
          // Detect transport-only: assignment completed + order cancelled + product subtotal zeroed
          const order =
            row.order || (row.assignment && row.assignment.order) || null;
          const isTransportOnly =
            a.status === "completed" &&
            ((order &&
              order.status === "cancelled" &&
              (Number(order.subtotal || 0) === 0 ||
                Number(order.total || 0) === Number(order.tax || 0))) ||
              (a.notes &&
                String(a.notes).toLowerCase().includes("transport_only")));

          const statusConfig = {
            rejected: {
              color: "bg-red-100 text-red-700",
              label: t("rider.orders.rejected"),
            },
            completed: {
              color: isTransportOnly
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-700",
              label: isTransportOnly
                ? "Transport Only"
                : t("rider.orders.delivered"),
            },
          };

          const config = statusConfig[a.status as keyof typeof statusConfig];

          if (config) {
            return (
              <Badge className={`${config.color} hover:${config.color}`}>
                {config.label}
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="text-gray-600">
              {a.status}
            </Badge>
          );
        },
        size: 200,
      }),
      columnHelper.display({
        id: "actions",
        header: () => null,
        cell: (info) => {
          const row = info.row.original;
          const a = row.assignment;
          const order = row.order;
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      const orderId = a.orderId || a.order_id;
                      let o = order || orderMap[orderId];
                      if (!o && orderId) {
                        try {
                          o = await fetchOrderById(orderId);
                          if (o)
                            setOrderMap((p) => ({
                              ...p,
                              [orderId]: o,
                            }));
                        } catch (e) {}
                      }
                      if (o) setViewOrder(o);
                    }}
                  >
                    {t("rider.orders.viewDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (
                        typeof navigator !== "undefined" &&
                        navigator.clipboard
                      )
                        navigator.clipboard.writeText(a.order_id || "");
                      toast.success("Order ID copied to clipboard");
                    }}
                  >
                    {t("rider.orders.copyOrderId")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 60,
      }),
    ];
  }, [handleRespond, orderMap, respond.isPending]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  useEffect(() => {
    if (!assignments || assignments.length === 0) return;

    const missingIds = assignments
      .map((a: any) => a.orderId || a.order_id)
      .filter((id: any) => id && !orderMap[id]);

    if (missingIds.length === 0) return;

    let canceled = false;

    (async () => {
      try {
        const results = await Promise.all(
          missingIds.map((id: string) => fetchOrderById(id).catch(() => null)),
        );
        if (canceled) return;
        setOrderMap((prev) => {
          const next = { ...prev };
          missingIds.forEach((id: string, idx: number) => {
            const res = results[idx];
            if (res) next[id] = res;
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to fetch assignment orders:", err);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [assignments]);

  // Stats calculation (based on selected order date filter)
  const stats = useMemo(() => {
    const total = ordersFilteredAssignments?.length || 0;
    const assigned =
      ordersFilteredAssignments?.filter((a: any) => a.status === "assigned")
        .length || 0;
    const accepted =
      ordersFilteredAssignments?.filter((a: any) => a.status === "accepted")
        .length || 0;
    const completed =
      ordersFilteredAssignments?.filter((a: any) => a.status === "completed")
        .length || 0;
    return { total, assigned, accepted, completed };
  }, [ordersFilteredAssignments]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">
              Please sign in to view your assigned orders.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingRider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="text-gray-600">Loading rider profile...</span>
        </div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Rider Profile</h2>
            <p className="text-gray-600">
              No rider profile found for your account. Please contact an
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <ScrollArea className="h-[calc(100vh-2rem)]">
        <div className="mx-auto p-6">
          <div className="mb-6">
            <Link
              href="/rider"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Date filter for Orders */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Date:</span>
              <div className="flex items-center rounded-md border bg-white shadow-sm p-1">
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    ordersTopFilter === "today"
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setOrdersTopFilter("today");
                    setOrdersTopDateRange({});
                  }}
                >
                  Today
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    ordersTopFilter === "all"
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setOrdersTopFilter("all");
                    setOrdersTopDateRange({});
                  }}
                >
                  All time
                </button>
                <Popover
                  open={ordersPopoverOpen}
                  onOpenChange={(open) => {
                    setOrdersPopoverOpen(open);
                    if (open) setTempOrdersRange({ ...ordersTopDateRange });
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        ordersTopFilter === "custom" ||
                        (ordersTopDateRange.from && ordersTopDateRange.to)
                          ? "bg-orange-100 text-orange-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setOrdersTopFilter("custom")}
                    >
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-2 w-64">
                      <div>
                        <label
                          htmlFor="orders-from"
                          className="block text-xs text-gray-500 mb-1"
                        >
                          From
                        </label>
                        <input
                          id="orders-from"
                          type="date"
                          className="w-full rounded-md border px-3 py-2"
                          value={tempOrdersRange.from || ""}
                          onChange={(e) =>
                            setTempOrdersRange((prev) => ({
                              ...prev,
                              from: e.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="orders-to"
                          className="block text-xs text-gray-500 mb-1"
                        >
                          To
                        </label>
                        <input
                          id="orders-to"
                          type="date"
                          className="w-full rounded-md border px-3 py-2"
                          value={tempOrdersRange.to || ""}
                          onChange={(e) =>
                            setTempOrdersRange((prev) => ({
                              ...prev,
                              to: e.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setTempOrdersRange({});
                            setOrdersTopDateRange({});
                            setOrdersPopoverOpen(false);
                            setOrdersTopFilter("today");
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setOrdersPopoverOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            setOrdersTopDateRange({
                              ...tempOrdersRange,
                            });
                            setOrdersTopFilter("custom");
                            setOrdersPopoverOpen(false);
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

            <div className="text-sm text-gray-500">
              Showing:{" "}
              <span className="font-medium text-gray-700">
                {ordersTopFilter === "all"
                  ? "All time"
                  : ordersTopFilter === "today"
                    ? "Today"
                    : ordersTopDateRange.from && ordersTopDateRange.to
                      ? `${ordersTopDateRange.from} — ${ordersTopDateRange.to}`
                      : "Custom"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.assigned}
                    </p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.accepted}
                    </p>
                    <p className="text-sm text-gray-500">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.completed}
                    </p>
                    <p className="text-sm text-gray-500">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    {t("rider.orders.assignedTitle")}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("rider.orders.assignedDesc")}
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("rider.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    <span className="text-gray-600">
                      {t("rider.orders.loading")}
                    </span>
                  </div>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {search
                      ? t("rider.orders.noMatching")
                      : t("rider.orders.noAssigned")}
                  </h3>
                  <p className="text-gray-500">
                    {search
                      ? t("rider.orders.trySearch")
                      : t("rider.orders.newAssignments")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View - hidden on md and up */}
                  <div className="md:hidden space-y-3">
                    {filteredData.map((row: any, idx: number) => {
                      const a = row.assignment;
                      const order = row.order;

                      return (
                        <Card
                          key={idx}
                          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Order Number & Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Package className="w-4 h-4 text-orange-600" />
                                </div>
                                <span className="font-bold text-gray-900">
                                  {row.orderNumber}
                                </span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const orderId = a.orderId || a.order_id;
                                      let o = order || orderMap[orderId];
                                      if (!o && orderId) {
                                        try {
                                          o = await fetchOrderById(orderId);
                                          if (o)
                                            setOrderMap((p) => ({
                                              ...p,
                                              [orderId]: o,
                                            }));
                                        } catch (e) {}
                                      }
                                      if (o) setViewOrder(o);
                                    }}
                                  >
                                    {t("rider.orders.viewDetails")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const orderId = a.orderId || a.order_id;
                                      if (
                                        typeof navigator !== "undefined" &&
                                        navigator.clipboard
                                      )
                                        navigator.clipboard.writeText(
                                          orderId || "",
                                        );
                                      toast.success(
                                        "Order ID copied to clipboard",
                                      );
                                    }}
                                  >
                                    {t("rider.orders.copyOrderId")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600 line-clamp-2">
                                {row.location}
                              </span>
                            </div>

                            {/* Delivery Fee */}
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">
                                {t("rider.orders.deliveryFee")}
                              </span>
                              <span className="font-bold text-gray-900">
                                {row.deliveryFee != null
                                  ? `RWF ${Number(
                                      row.deliveryFee,
                                    ).toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>

                            {/* Action Buttons or Status Badge */}
                            <div className="pt-2">
                              {a.status === "assigned" ? (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() =>
                                      handleRespond(a.id, "accepted")
                                    }
                                    size="sm"
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    disabled={respond.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {t("rider.orders.accept")}
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleRespond(a.id, "rejected")
                                    }
                                    size="sm"
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={respond.isPending}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {t("rider.orders.reject")}
                                  </Button>
                                </div>
                              ) : a.status === "accepted" ? (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() =>
                                      handleRespond(a.id, "completed")
                                    }
                                    size="sm"
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                                    disabled={respond.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {t("rider.orders.markDelivered")}
                                  </Button>

                                  <Button
                                    onClick={() => {
                                      const orderId =
                                        a.orderId ||
                                        a.order_id ||
                                        (a.order && a.order.id);
                                      if (!orderId) {
                                        toast.error("Order id not available");
                                        return;
                                      }
                                      setTransportOrderId(orderId);
                                      setTransportDialogOpen(true);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    disabled={
                                      (markTransportOnly as any).isLoading
                                    }
                                  >
                                    <Truck className="w-4 h-4 mr-1" />
                                    Transport Only
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  {(() => {
                                    const orderLocal =
                                      order || row.order || null;
                                    const isTransportOnlyLocal =
                                      a.status === "completed" &&
                                      ((orderLocal &&
                                        orderLocal.status === "cancelled" &&
                                        (Number(orderLocal.subtotal || 0) ===
                                          0 ||
                                          Number(orderLocal.total || 0) ===
                                            Number(orderLocal.tax || 0))) ||
                                        (a.notes &&
                                          String(a.notes)
                                            .toLowerCase()
                                            .includes("transport_only")));

                                    if (a.status === "rejected") {
                                      return (
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                          {t("rider.orders.rejected")}
                                        </Badge>
                                      );
                                    }

                                    if (isTransportOnlyLocal) {
                                      return (
                                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                          Transport Only
                                        </Badge>
                                      );
                                    }

                                    if (a.status === "completed") {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                          {t("rider.orders.delivered")}
                                        </Badge>
                                      );
                                    }

                                    return (
                                      <Badge
                                        variant="outline"
                                        className="text-gray-600"
                                      >
                                        {a.status}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Desktop Table View - hidden on mobile */}
                  <div className="hidden md:block space-y-4">
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        <DataTable table={table as any} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      {/* Order details dialog — opens when viewOrder is set */}
      {viewOrder && (
        <OrderDetailsDialog
          open={!!viewOrder}
          onOpenChange={(open: boolean) => {
            if (!open) setViewOrder(null);
          }}
          order={viewOrder}
        />
      )}
      {/* Transport Only confirmation dialog */}
      <AlertDialog
        open={transportDialogOpen}
        onOpenChange={setTransportDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transport Only</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order but keep the transport fee.
              <br />
              <br />
              <strong>What happens:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Order status → CANCELLED</li>
                <li>Product total → Zeroed</li>
                <li>Transport fee → Kept and added to rider earnings</li>
                <li>Stock → NOT restored (products not considered sold)</li>
              </ul>
              <br />
              This action is final and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!transportOrderId) return;
                try {
                  setIsTransporting(true);
                  await markTransportOnly.mutateAsync(transportOrderId);
                  toast.success("Order marked as transport only");
                  try {
                    refetchAssignments && refetchAssignments();
                  } catch (e) {}
                } catch (err) {
                  console.error("Transport only failed:", err);
                  toast.error("Failed to mark transport only");
                } finally {
                  setIsTransporting(false);
                  setTransportDialogOpen(false);
                  setTransportOrderId(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isTransporting || (markTransportOnly as any).isLoading}
            >
              Confirm Transport Only
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Page;
