"use client";
import React from "react";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatarProfile } from "@/components/user-avatar-profile";

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
   const [timeframe, setTimeframe] = React.useState<string>("all");
   const [dateRange, setDateRange] = React.useState<{
      from?: string;
      to?: string;
   }>({});
   const [calendarOpen, setCalendarOpen] = React.useState(false);
   const [showAll, setShowAll] = React.useState(false);

   React.useEffect(() => {
      if (!open || !riderId) return;
      setLoading(true);
      setError(null);
      (async () => {
         try {
            const res = await fetch(
               `/api/admin/rider-details?rid=${encodeURIComponent(riderId)}`
            );
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "Failed to load");
            setRider(j.rider);
            setAssignments(j.assignments || []);
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

      // Parse start and end dates from string inputs
      const startDate = dateRange.from ? parseDate(dateRange.from) : null;
      const endDate = dateRange.to ? parseDate(dateRange.to) : null;

      // Handle "all" timeframe - show all assignments
      if (timeframe === "all") {
         if (!startDate && !endDate) return assignments;
      }

      // Otherwise, fall back to timeframe days cutoff
      const days = timeframe === "all" ? 0 : Number(timeframe) || 7;
      const cutoff = new Date();
      if (days > 0) cutoff.setDate(cutoff.getDate() - days);

      const inRange = (d?: Date | null) => {
         if (!d) return false;
         if (startDate && d < startDate) return false;
         if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (d > e) return false;
         }
         if (timeframe === "all" && !startDate && !endDate) return true;
         return d >= cutoff;
      };

      return assignments.filter((a: any) => {
         // prefer assignment timestamps then order timestamps
         const ts =
            parseDate(a.assigned_at) ||
            parseDate(a.delivered_at) ||
            parseDate(a.completed_at) ||
            parseDate(a.updated_at) ||
            parseDate(a.created_at) ||
            parseDate(a.orders?.created_at) ||
            parseDate(a.orders?.updated_at) ||
            parseDate(a.orders?.delivered_at) ||
            parseDate(a.orders?.completed_at) ||
            null;
         if (!ts) return false;
         return inRange(ts);
      });
   }, [assignments, timeframe, dateRange]);

   const metrics = React.useMemo(() => {
      const m = { assigned: 0, delivered: 0, rejected: 0, totalEarnings: 0 };
      for (const a of filteredAssignments) {
         const s = (a.status || "").toString().toLowerCase();
         if (s === "assigned") m.assigned++;
         else if (s === "accepted" || s === "completed" || s === "delivered") {
            m.delivered++;
            // Calculate earnings for completed deliveries
            const o = a.orders || a.order || null;
            // Base rider fee may live on the assignment or order; prefer assignment values
            const baseFeeRaw =
               a?.fee ?? a?.delivery_fee ?? o?.delivery_fee ?? 0;
            const baseFee =
               typeof baseFeeRaw === "string"
                  ? parseFloat(baseFeeRaw)
                  : Number(baseFeeRaw || 0);
            const transportRaw = o?.tax ?? 0;
            const transportNum =
               typeof transportRaw === "string"
                  ? parseFloat(transportRaw)
                  : Number(transportRaw || 0);
            const feeNum = Math.max(
               0,
               (isNaN(baseFee) ? 0 : baseFee) +
                  (isNaN(transportNum) ? 0 : transportNum)
            );
            if (!isNaN(feeNum)) {
               m.totalEarnings += feeNum;
            }
         } else if (s === "rejected" || s === "declined" || s === "cancelled")
            m.rejected++;
      }
      return m;
   }, [filteredAssignments]);

   // Show only first 5 deliveries unless "View More" is clicked
   const displayedAssignments = showAll
      ? filteredAssignments
      : filteredAssignments.slice(0, 5);

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle>Rider Details</DialogTitle>
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
                           fullName: rider.full_name || "Unnamed",
                           subTitle: rider.phone || rider.vehicle || "",
                           imageUrl: rider.image_url || undefined,
                        }}
                        showInfo
                     />
                     <div className="text-sm text-muted-foreground">
                        {rider.location || "—"}
                     </div>
                  </div>

                  {/* Filters Section - Moved to top */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                     <h4 className="font-semibold text-sm text-gray-700">
                        Filters
                     </h4>
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Timeframe Select */}
                        <div className="flex-1">
                           <Select
                              value={timeframe}
                              onValueChange={(val) => {
                                 setTimeframe(val);
                                 // clear explicit date range when switching to a fixed timeframe
                                 if (val !== "all") setDateRange({});
                              }}
                           >
                              <SelectTrigger className="bg-white">
                                 <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="7">Last 7 days</SelectItem>
                                 <SelectItem value="30">
                                    Last 30 days
                                 </SelectItem>
                                 <SelectItem value="365">Last year</SelectItem>
                                 <SelectItem value="all">All time</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        {/* Date Range Picker */}
                        <div className="flex-1">
                           <Popover
                              open={calendarOpen}
                              onOpenChange={setCalendarOpen}
                           >
                              <PopoverTrigger asChild>
                                 <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal bg-white"
                                 >
                                    <Calendar className="w-4 h-4 mr-2" />
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
                                       <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                          Start Date
                                       </label>
                                       <input
                                          type="date"
                                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                          value={dateRange.from || ""}
                                          onChange={(e) =>
                                             setDateRange((prev) => ({
                                                ...prev,
                                                from:
                                                   e.target.value || undefined,
                                             }))
                                          }
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                          End Date
                                       </label>
                                       <input
                                          type="date"
                                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                          value={dateRange.to || ""}
                                          onChange={(e) =>
                                             setDateRange((prev) => ({
                                                ...prev,
                                                to: e.target.value || undefined,
                                             }))
                                          }
                                          placeholder="Now (optional)"
                                       />
                                       <p className="text-xs text-gray-500 mt-1">
                                          Leave empty to use current date
                                       </p>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end pt-2 border-t">
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDateRange({})}
                                       >
                                          Clear
                                       </Button>
                                       <Button
                                          size="sm"
                                          onClick={() => setCalendarOpen(false)}
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
                           const baseFeeRaw =
                              a?.fee ?? a?.delivery_fee ?? o?.delivery_fee ?? 0;
                           const baseFee =
                              typeof baseFeeRaw === "string"
                                 ? parseFloat(baseFeeRaw)
                                 : Number(baseFeeRaw || 0);
                           const transportRaw = o?.tax ?? 0;
                           const transportNum =
                              typeof transportRaw === "string"
                                 ? parseFloat(transportRaw)
                                 : Number(transportRaw || 0);
                           const feeNum = Math.max(
                              0,
                              (isNaN(baseFee) ? 0 : baseFee) +
                                 (isNaN(transportNum) ? 0 : transportNum)
                           );
                           return (
                              <div
                                 key={a.id}
                                 className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                 <div className="text-sm flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 mb-1">
                                       Order #
                                       {o?.order_number || o?.id || a.order_id}
                                    </div>
                                    <div className="text-muted-foreground truncate">
                                       {o?.delivery_address ||
                                          o?.delivery_city ||
                                          a.location ||
                                          "—"}
                                    </div>
                                 </div>
                                 <div className="text-sm font-semibold text-gray-900 ml-4">
                                    {isNaN(feeNum)
                                       ? "-"
                                       : feeNum.toLocaleString()}{" "}
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
                                 ? "Show Less"
                                 : `View More (${
                                      filteredAssignments.length - 5
                                   } more)`}
                              <ChevronRight
                                 className={`w-4 h-4 transition-transform ${
                                    showAll ? "rotate-90" : ""
                                 }`}
                              />
                           </Button>
                        </div>
                     )}
                  </div>
               </div>
            ) : null}
         </DialogContent>
      </Dialog>
   );
}
