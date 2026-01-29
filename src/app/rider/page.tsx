"use client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   Box,
   Clock,
   LucideIcon,
   MapPin,
   Star,
   Timer,
   TrendingDown,
   TrendingUp,
   Users,
   Package,
   Target,
   Navigation,
   CheckCircle,
   XCircle,
   DollarSign,
   Calendar,
} from "lucide-react";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
   useMyRiderProfile,
   useMyAssignments,
   useMyFeeAdjustments,
} from "@/hooks/useRiders";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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

// Charts
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
} from "@/components/ui/chart";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";

interface StatsCardProps {
   title: string;
   value: string;
   change?: string;
   icon: LucideIcon;
   gradient: string;
}

interface ActiveRiderProps {
   id: string;
   name: string;
   location: string;
   status: string;
   rating: string;
   deliveries: string;
   imageUrl?: string;
   profileTitle?: string;
   totalDeliveriesLabel?: string;
   ratingLabel?: string;
   lastActiveLabel?: string;
}

interface RecentDeliveryProps {
   id: string;
   name: string;
   number?: string;
   location: string;
   status: string;
   amount: string;
   time: string;
   type?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
   title,
   value,
   change,
   icon: Icon,
   gradient,
}) => (
   <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-0">
         <div className={`${gradient} p-4 sm:p-6 text-white relative`}>
            <div className="flex items-center justify-between">
               <div className="space-y-1 sm:space-y-2">
                  <p className="text-white/80 text-xs sm:text-sm font-medium">
                     {title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                  {change && (
                     <div className="flex items-center gap-1">
                        {Number(change) < 0 ? (
                           <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
                        ) : (
                           <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
                        )}
                        <span className="text-xs sm:text-sm text-white/80">
                           {change}% vs last period
                        </span>
                     </div>
                  )}
               </div>
               <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
               </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full"></div>
         </div>
      </CardContent>
   </Card>
);

const ActiveRiderCard: React.FC<ActiveRiderProps> = ({
   id,
   name,
   location,
   deliveries,
   rating,
   status,
   imageUrl,
   profileTitle,
   totalDeliveriesLabel,
   ratingLabel,
   lastActiveLabel,
}) => (
   <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
         <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            {profileTitle || "Your Profile"}
         </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
         <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  {/* Use shared UserAvatarProfile so images/initials match admin table */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
                     <UserAvatarProfile
                        className="w-7 h-7 sm:w-8 sm:h-8"
                        user={{
                           fullName: name,
                           subTitle: location,
                           imageUrl: imageUrl || "",
                        }}
                     />
                  </div>
               </div>
               <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white ${
                     status === "Active" ? "bg-green-500" : "bg-red-500"
                  }`}
               ></div>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">
                  {name}
               </h3>
               <p className="text-gray-500 text-xs sm:text-sm truncate">
                  ID: #{id}
               </p>
               <Badge
                  className={`mt-2 text-xs ${
                     status === "Active"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
               >
                  {status}
               </Badge>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
               <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
               </div>
               <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {deliveries}
               </p>
               <p className="text-xs sm:text-sm text-gray-500">
                  {totalDeliveriesLabel || "Total Deliveries"}
               </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
               <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg mx-auto mb-2">
                  <Star
                     className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600"
                     fill="currentColor"
                  />
               </div>
               <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {rating}
               </p>
               <p className="text-xs sm:text-sm text-gray-500">
                  {ratingLabel || "Rating"}
               </p>
            </div>
         </div>

         <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
               <span className="text-xs sm:text-sm truncate">{location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
               <span className="text-xs sm:text-sm">
                  {lastActiveLabel || "Last active: Now"}
               </span>
            </div>
         </div>
      </CardContent>
   </Card>
);

const RecentDelivery: React.FC<RecentDeliveryProps> = ({
   id,
   name,
   number,
   location,
   amount,
   time,
   status,
   type,
}) => {
   const isFeeAdjustment = type === "fee-adjustment";
   const isNegative = isFeeAdjustment && parseFloat(amount) < 0;

   return (
      <Card className="border-0 bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:shadow-md">
         <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
               <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div
                     className={`w-10 h-10 sm:w-12 sm:h-12 ${isFeeAdjustment ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-orange-400 to-orange-600"} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}
                  >
                     {isFeeAdjustment ? (
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                     ) : (
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                        {!isFeeAdjustment && (
                           <span className="font-semibold text-sm sm:text-base text-gray-900">
                              #{number || id}
                           </span>
                        )}
                        <Badge
                           className={`text-xs ${
                              isFeeAdjustment
                                 ? isNegative
                                    ? "bg-red-100 text-red-700 hover:bg-red-100"
                                    : "bg-purple-100 text-purple-700 hover:bg-purple-100"
                                 : status === "completed" ||
                                     status === "delivered"
                                   ? "bg-green-100 text-green-700 hover:bg-green-100"
                                   : status === "processing"
                                     ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                     : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                           }`}
                        >
                           {isFeeAdjustment
                              ? isNegative
                                 ? "Deduction"
                                 : "Bonus"
                              : status}
                        </Badge>
                     </div>
                     <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">
                        {name}
                     </p>
                     {!isFeeAdjustment && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                           <MapPin className="w-3 h-3 flex-shrink-0" />
                           <span className="truncate">{location}</span>
                        </div>
                     )}
                  </div>
               </div>
               <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start sm:text-right sm:space-y-1 flex-shrink-0">
                  <p
                     className={`font-bold text-sm sm:text-base whitespace-nowrap ${isFeeAdjustment && isNegative ? "text-red-600" : "text-gray-900"}`}
                  >
                     {isFeeAdjustment && isNegative ? "-" : ""}RWF{" "}
                     {Math.abs(parseFloat(amount)).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                     <Clock className="w-3 h-3" />
                     <span className="whitespace-nowrap">{time}</span>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>
   );
};

const Dashboard = () => {
   const { user, isLoggedIn } = useAuth();
   const { t } = useLanguage();

   // Top date filter for cards: Today | All time | Custom
   const [topFilter, setTopFilter] = useState<string>("today");
   const [topDateRange, setTopDateRange] = useState<{
      from?: string;
      to?: string;
   }>({});
   const [tempTopRange, setTempTopRange] = useState<{
      from?: string;
      to?: string;
   }>({});

   // replace calendar with timeframe selector for analytics
   const [timeframe, setTimeframe] = useState<string>("7");
   // date range for filtering (from/to strings like admin/orders)
   const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(
      {},
   );
   // Controlled popover state for analytics date picker (improves UX)
   const [analyticsPopoverOpen, setAnalyticsPopoverOpen] =
      useState<boolean>(false);
   const [tempAnalyticsRange, setTempAnalyticsRange] = useState<{
      from?: string;
      to?: string;
   }>({});

   const { data: rider, isLoading: loadingRider } = useMyRiderProfile();
   const { data: assignments = [], isLoading } = useMyAssignments();
   const { data: feeAdjustments = [] } = useMyFeeAdjustments();

   // Timeframe filtering: last N days (controlled by Select)
   // Robust parse for date inputs (accepts YYYY-MM-DD strings reliably)
   const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
         // Append time to avoid timezone variance when parsing dates from inputs
         const d = new Date(value + "T00:00:00");
         return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
   };

   // Helper to get date range based on timeframe
   const getDateRangeForTimeframe = (
      tf: string,
   ): { start: Date; end: Date } => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      let start = new Date(now);

      if (tf === "today") {
         start.setHours(0, 0, 0, 0);
      } else if (tf === "yesterday") {
         start.setDate(start.getDate() - 1);
         start.setHours(0, 0, 0, 0);
         end.setDate(end.getDate() - 1);
         end.setHours(23, 59, 59, 999);
      } else {
         const days = Number(tf) || 7;
         start.setDate(start.getDate() - days);
         start.setHours(0, 0, 0, 0);
      }

      return { start, end };
   };

   // Get previous period for comparison
   const getPreviousPeriodRange = (tf: string): { start: Date; end: Date } => {
      const { start, end } = getDateRangeForTimeframe(tf);
      const periodLength = end.getTime() - start.getTime();

      const prevEnd = new Date(start);
      prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setTime(prevStart.getTime() - periodLength);

      return { start: prevStart, end: prevEnd };
   };

   // Helper for top-level filters (today | all | custom)
   const getDateRangeForTopFilter = (
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

      // custom - we'll rely on topDateRange when provided, otherwise default last 7 days
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
   };

   const filteredAssignments = React.useMemo(() => {
      const { start, end } = getDateRangeForTimeframe(timeframe);
      const startDate = parseDate(dateRange.from);
      const endDate = parseDate(dateRange.to);

      // Use custom date range if provided, otherwise use timeframe
      const actualStart = startDate || start;
      const actualEnd = endDate
         ? (() => {
              const e = new Date(endDate);
              e.setHours(23, 59, 59, 999);
              return e;
           })()
         : end;

      return assignments.filter((a: any) => {
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

         // Check if timestamp is within the date range
         return ts >= actualStart && ts <= actualEnd;
      });
   }, [assignments, timeframe, dateRange]);

   // Get previous period assignments for comparison
   const previousPeriodAssignments = React.useMemo(() => {
      if (dateRange.from || dateRange.to) {
         // If custom date range is set, don't calculate previous period
         return [];
      }

      const { start, end } = getPreviousPeriodRange(timeframe);

      return assignments.filter((a: any) => {
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

         return ts >= start && ts <= end;
      });
   }, [assignments, timeframe, dateRange]);

   // Top-level filtered assignments (for the top stats cards)
   const topFilteredAssignments = React.useMemo(() => {
      // If user selected a custom top range, use it; otherwise base on topFilter
      const { start, end } = getDateRangeForTopFilter(topFilter);
      const startDate = parseDate(topDateRange.from);
      const endDate = parseDate(topDateRange.to);

      const actualStart = startDate || start;
      const actualEnd = endDate
         ? (() => {
              const e = new Date(endDate);
              e.setHours(23, 59, 59, 999);
              return e;
           })()
         : end;

      return assignments.filter((a: any) => {
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

         // Check if timestamp is within the date range
         return ts >= actualStart && ts <= actualEnd;
      });
   }, [assignments, topFilter, topDateRange]);

   // Top previous period (for comparisons when not custom)
   const topPreviousPeriodAssignments = React.useMemo(() => {
      if (topDateRange.from || topDateRange.to) {
         return [];
      }

      const { start, end } = getDateRangeForTopFilter(topFilter);
      const periodLength = end.getTime() - start.getTime();

      const prevEnd = new Date(start);
      prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setTime(prevStart.getTime() - periodLength);

      return assignments.filter((a: any) => {
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

         return ts >= prevStart && ts <= prevEnd;
      });
   }, [assignments, topFilter, topDateRange]);

   // Calculate stats from filtered assignments
   const calculateStats = (assignmentsList: any[]) => {
      const total = assignmentsList.length;
      const delivered = assignmentsList.filter(
         (a: any) => a.status === "completed" || a.status === "delivered",
      ).length;
      const pending = assignmentsList.filter(
         (a: any) => a.status === "assigned",
      ).length;
      const accepted = assignmentsList.filter(
         (a: any) => a.status === "accepted",
      ).length;
      const rejected = assignmentsList.filter(
         (a: any) =>
            a.status === "rejected" ||
            a.status === "declined" ||
            a.status === "cancelled",
      ).length;

      return { total, delivered, pending, accepted, rejected };
   };

   // Top cards should use the top filter state so they can be independent from
   // the delivery analytics filters below.
   const currentStats = calculateStats(topFilteredAssignments);
   const previousStats = calculateStats(topPreviousPeriodAssignments);

   // Calculate percentage change (only if not using custom date range for the top filter)
   const calculateChange = (
      current: number,
      previous: number,
      isCustom: boolean = false,
   ): string | undefined => {
      // Don't show change percentage when custom date range is selected
      if (isCustom) {
         return undefined;
      }
      if (previous === 0) {
         return current > 0 ? "100" : "0";
      }
      const change = ((current - previous) / previous) * 100;
      return change.toFixed(0);
   };

   const totalDeliveries = currentStats.total;
   const delivered = currentStats.delivered;
   const pending = currentStats.pending;
   const accepted = currentStats.accepted;
   const rejected = currentStats.rejected;

   // Calculate or get average rating (fallback to N/A if not available)
   const averageRating =
      (rider as any)?.rating ||
      (rider as any)?.averageRating ||
      (rider as any)?.average_rating ||
      "N/A";

   const topIsCustom = Boolean(topDateRange.from || topDateRange.to);

   // Calculate change percentages (for top cards)
   const totalChange = calculateChange(
      currentStats.total,
      previousStats.total,
      topIsCustom,
   );
   const deliveredChange = calculateChange(
      currentStats.delivered,
      previousStats.delivered,
      topIsCustom,
   );
   const pendingChange = calculateChange(
      currentStats.pending,
      previousStats.pending,
      topIsCustom,
   );
   const acceptedChange = calculateChange(
      currentStats.accepted,
      previousStats.accepted,
      topIsCustom,
   );
   const rejectedChange = calculateChange(
      currentStats.rejected,
      previousStats.rejected,
      topIsCustom,
   );

   // Analytics-specific stats (independent from the top-level filter)
   const analyticsStats = calculateStats(filteredAssignments);
   const analyticsPreviousStats = calculateStats(previousPeriodAssignments);
   const analyticsIsCustom = Boolean(dateRange.from || dateRange.to);

   const analyticsTotalChange = calculateChange(
      analyticsStats.total,
      analyticsPreviousStats.total,
      analyticsIsCustom,
   );
   const analyticsDeliveredChange = calculateChange(
      analyticsStats.delivered,
      analyticsPreviousStats.delivered,
      analyticsIsCustom,
   );
   const analyticsPendingChange = calculateChange(
      analyticsStats.pending,
      analyticsPreviousStats.pending,
      analyticsIsCustom,
   );
   const analyticsAcceptedChange = calculateChange(
      analyticsStats.accepted,
      analyticsPreviousStats.accepted,
      analyticsIsCustom,
   );
   const analyticsRejectedChange = calculateChange(
      analyticsStats.rejected,
      analyticsPreviousStats.rejected,
      analyticsIsCustom,
   );

   const selectedDateAssignments = filteredAssignments;

   // Map assignments to recent deliveries format
   const assignmentDeliveries = filteredAssignments
      .slice(0, 5)
      .map((a: any) => {
         const order =
            a.order ||
            a.orders ||
            (a.orderId || a.order_id ? { id: a.orderId || a.order_id } : null);
         // pick first valid timestamp to represent the event time
         const timestamps = [
            a.deliveredAt || a.delivered_at,
            a.completedAt || a.completed_at,
            a.updatedAt || a.updated_at,
            a.assignedAt || a.assigned_at,
            a.createdAt || a.created_at,
            order?.deliveredAt || order?.delivered_at,
            order?.completedAt || order?.completed_at,
            order?.updatedAt || order?.updated_at,
            order?.createdAt || order?.created_at,
         ]
            .map((v: any) => (v ? new Date(v) : null))
            .filter(Boolean) as Date[];

         const ts = timestamps[0] || null;
         const timeStr = ts
            ? `${formatDistanceToNowStrict(ts, { roundingMethod: "floor" })} ${t(
                 "rider.ago",
              )}`
            : t("rider.noRecentDeliveries");

         return {
            id: order?.id || a.orderId || a.order_id,
            // prefer explicit order number/reference when available for better UX
            number:
               order?.orderNumber ||
               order?.order_number ||
               order?.number ||
               order?.reference ||
               order?.id ||
               a.orderNumber ||
               a.order_number ||
               a.orderId ||
               a.order_id,
            name:
               order?.customerName ||
               order?.customer_name ||
               order?.name ||
               "Customer",
            location:
               order?.deliveryAddress ||
               order?.delivery_address ||
               a.location ||
               rider?.location ||
               "-",
            amount:
               order?.tax || a.deliveryFee || a.delivery_fee || a.fee || "-", // Show delivery fee instead of total
            time: timeStr,
            status: a.status || order?.status || "-",
            type: "delivery",
            timestamp: ts,
         };
      });

   // Map fee adjustments to recent deliveries format
   const feeAdjustmentDeliveries = (feeAdjustments || []).map((adj: any) => {
      const ts = adj.transactionDate
         ? new Date(adj.transactionDate)
         : adj.createdAt
           ? new Date(adj.createdAt)
           : null;
      const timeStr = ts
         ? `${formatDistanceToNowStrict(ts, { roundingMethod: "floor" })} ${t(
              "rider.ago",
           )}`
         : "";

      return {
         id: adj.id,
         number: "",
         name: adj.reason || "Manual Fee Adjustment",
         location: "-",
         amount: adj.amount,
         time: timeStr,
         status: "adjustment",
         type: "fee-adjustment",
         timestamp: ts,
      };
   });

   // Combine and sort by timestamp, then take top 5
   const recent = [...assignmentDeliveries, ...feeAdjustmentDeliveries]
      .filter((item) => item.timestamp)
      .sort((a, b) => {
         const timeA = a.timestamp ? a.timestamp.getTime() : 0;
         const timeB = b.timestamp ? b.timestamp.getTime() : 0;
         return timeB - timeA;
      })
      .slice(0, 5);

   // Calculate delivery fees from completed assignments
   const assignmentsTotal = selectedDateAssignments.reduce(
      (sum: number, a: any) => {
         const isDone = a.status === "completed" || a.status === "delivered";
         if (!isDone) return sum;
         const order =
            a.order ||
            a.orders ||
            (a.orderId || a.order_id ? { id: a.orderId || a.order_id } : null);
         // Get delivery fee from order.tax field instead of total amount
         const deliveryFee =
            order?.tax ?? a.deliveryFee ?? a.delivery_fee ?? a.fee ?? 0;
         const parsed =
            typeof deliveryFee === "string"
               ? parseFloat(deliveryFee)
               : Number(deliveryFee || 0);
         return sum + (isNaN(parsed) ? 0 : parsed);
      },
      0,
   );

   // Filter fee adjustments by the same date range as assignments
   const filteredFeeAdjustments = React.useMemo(() => {
      const { start, end } = getDateRangeForTimeframe(timeframe);
      const startDate = parseDate(dateRange.from);
      const endDate = parseDate(dateRange.to);

      const actualStart = startDate || start;
      const actualEnd = endDate
         ? (() => {
              const e = new Date(endDate);
              e.setHours(23, 59, 59, 999);
              return e;
           })()
         : end;

      return (feeAdjustments || []).filter((adj: any) => {
         const ts = parseDate(adj.transactionDate || adj.createdAt);
         if (!ts) return false;
         return ts >= actualStart && ts <= actualEnd;
      });
   }, [feeAdjustments, timeframe, dateRange]);

   // Calculate fee adjustments total
   const feeAdjustmentsTotal = filteredFeeAdjustments.reduce(
      (sum: number, adj: any) => {
         const amount =
            typeof adj.amount === "string"
               ? parseFloat(adj.amount)
               : Number(adj.amount || 0);
         return sum + (isNaN(amount) ? 0 : amount);
      },
      0,
   );

   // Combine both for total earnings
   const selectedDateTotal = assignmentsTotal + feeAdjustmentsTotal;

   const peakHour = (() => {
      const hoursCount: Record<string, number> = {};
      selectedDateAssignments.forEach((a: any) => {
         const order = a.order || a.orders || null;
         const timestamps = [
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
         if (!ts) return;
         const hour = ts.getHours();
         hoursCount[hour] = (hoursCount[hour] || 0) + 1;
      });
      const top = Object.entries(hoursCount).sort((a, b) => b[1] - a[1])[0];
      if (!top) return "-";
      const h = Number(top[0]);
      return `${String(h).padStart(2, "0")}:00`;
   })();

   // hourly deliveries data for the selected range (for the chart)
   const hourlyDeliveriesData = React.useMemo(() => {
      const counts = Array.from({ length: 24 }, () => 0);
      selectedDateAssignments.forEach((a: any) => {
         const order = a.order || a.orders || null;
         const timestamps = [
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
         if (!ts) return;
         counts[ts.getHours()] += 1;
      });
      return counts.map((c, h) => ({
         time: `${String(h).padStart(2, "0")}:00`,
         deliveries: c,
      }));
   }, [selectedDateAssignments]);

   if (!rider) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full">
               <CardContent>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     No Rider Profile
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     No rider profile found for your account. Please contact an
                     administrator.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
         <ScrollArea className="h-[calc(100vh-2rem)]">
            <div className="mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
               {/* Welcome Section */}
               <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                     {t("rider.welcomeBack").replace(
                        "{name}",
                        rider?.fullName ||
                           user?.fullName ||
                           user?.email ||
                           "Rider",
                     )}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                     {t("rider.overview")}
                  </p>
               </div>

               {/* Top-level Date Filter (Today | All time | Custom) */}
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                     <span className="text-sm text-gray-600">Date:</span>
                     <div className="flex items-center rounded-md border bg-white shadow-sm p-1">
                        <button
                           className={`px-3 py-1 rounded-md text-sm ${topFilter === "today" ? "bg-orange-100 text-orange-700" : "text-gray-700 hover:bg-gray-50"}`}
                           onClick={() => {
                              setTopFilter("today");
                              setTopDateRange({});
                           }}
                        >
                           Today
                        </button>
                        <button
                           className={`px-3 py-1 rounded-md text-sm ${topFilter === "all" ? "bg-orange-100 text-orange-700" : "text-gray-700 hover:bg-gray-50"}`}
                           onClick={() => {
                              setTopFilter("all");
                              setTopDateRange({});
                           }}
                        >
                           All time
                        </button>
                        <Popover>
                           <PopoverTrigger asChild>
                              <button
                                 className={`px-3 py-1 rounded-md text-sm ${topFilter === "custom" || (topDateRange.from && topDateRange.to) ? "bg-orange-100 text-orange-700" : "text-gray-700 hover:bg-gray-50"}`}
                                 onClick={() => setTopFilter("custom")}
                              >
                                 Custom
                              </button>
                           </PopoverTrigger>
                           <PopoverContent
                              className="w-auto p-4"
                              align="start"
                           >
                              <div className="space-y-2">
                                 <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                       From
                                    </label>
                                    <input
                                       type="date"
                                       className="w-full rounded-md border px-3 py-2"
                                       value={topDateRange.from || ""}
                                       onChange={(e) =>
                                          setTopDateRange((prev) => ({
                                             ...prev,
                                             from: e.target.value || undefined,
                                          }))
                                       }
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                       To
                                    </label>
                                    <input
                                       type="date"
                                       className="w-full rounded-md border px-3 py-2"
                                       value={topDateRange.to || ""}
                                       onChange={(e) =>
                                          setTopDateRange((prev) => ({
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
                                          setTopDateRange({});
                                          setTopFilter("today");
                                       }}
                                    >
                                       Clear
                                    </Button>
                                    <Button
                                       onClick={() => {
                                          // Ensure we set custom filter when applying
                                          setTopFilter("custom");
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
                        {topFilter === "all"
                           ? "All time"
                           : topFilter === "today"
                             ? "Today"
                             : topDateRange.from && topDateRange.to
                               ? `${topDateRange.from} — ${topDateRange.to}`
                               : "Custom"}
                     </span>
                  </div>
               </div>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                  <StatsCard
                     title={t("rider.status")}
                     value={
                        rider?.active
                           ? t("rider.status") === "Status"
                              ? "Active"
                              : rider?.active
                                ? "Active"
                                : "Inactive"
                           : "Inactive"
                     }
                     change={undefined}
                     icon={Users}
                     gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                  />
                  <StatsCard
                     title={t("rider.totalOrders")}
                     value={`${totalDeliveries}`}
                     change={totalChange}
                     icon={Box}
                     gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                  />
                  <StatsCard
                     title={t("rider.completed")}
                     value={`${delivered}`}
                     change={deliveredChange}
                     icon={Target}
                     gradient="bg-gradient-to-br from-green-500 to-green-600"
                  />
                  <StatsCard
                     title={t("rider.pending")}
                     value={`${pending}`}
                     change={pendingChange}
                     icon={Timer}
                     gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                  />
               </div>

               {/* Main Content */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-1">
                     <ActiveRiderCard
                        id={rider?.id || "-"}
                        name={
                           rider?.fullName ||
                           user?.fullName ||
                           user?.email ||
                           "Rider"
                        }
                        location={rider?.location || "-"}
                        imageUrl={rider?.imageUrl || rider?.image_url || ""}
                        deliveries={`${totalDeliveries}`}
                        rating={averageRating}
                        status={rider?.active ? "Active" : "Unavailable"}
                        profileTitle={t("rider.yourProfile")}
                        totalDeliveriesLabel={t("rider.totalDeliveries")}
                        ratingLabel={t("rider.rating")}
                        lastActiveLabel={t("rider.lastActiveNow")}
                     />
                  </div>

                  {/* Analytics and Recent Deliveries */}
                  <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                     <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                           <div className="flex flex-col gap-6 w-full sm:flex-row sm:items-center sm:justify-between">
                              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                 <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                                 {t("rider.deliveryAnalytics")}
                              </CardTitle>
                              <div className="flex items-center gap-3">
                                 <div className="w-44">
                                    <Select
                                       value={timeframe}
                                       onValueChange={setTimeframe}
                                    >
                                       <SelectTrigger>
                                          <SelectValue
                                             placeholder={t("rider.last7days")}
                                          />
                                       </SelectTrigger>
                                       <SelectContent>
                                          <SelectItem value="today">
                                             {t("rider.today") || "Today"}
                                          </SelectItem>
                                          <SelectItem value="yesterday">
                                             {t("rider.yesterday") ||
                                                "Yesterday"}
                                          </SelectItem>
                                          <SelectItem value="7">
                                             {t("rider.last7days")}
                                          </SelectItem>
                                          <SelectItem value="30">
                                             {t("rider.last30days")}
                                          </SelectItem>
                                          <SelectItem value="365">
                                             {t("rider.last12months")}
                                          </SelectItem>
                                       </SelectContent>
                                    </Select>
                                 </div>

                                 {/* Date range picker */}
                                 <Popover
                                    open={analyticsPopoverOpen}
                                    onOpenChange={(open) => {
                                       setAnalyticsPopoverOpen(open);
                                       if (open) {
                                          // initialize temp range when opening
                                          setTempAnalyticsRange({
                                             ...dateRange,
                                          });
                                       }
                                    }}
                                 >
                                    <PopoverTrigger asChild>
                                       <Button
                                          variant="outline"
                                          className="h-9"
                                       >
                                          <Calendar className="w-4 h-4 mr-2" />
                                          {dateRange.from && dateRange.to
                                             ? `${dateRange.from} — ${dateRange.to}`
                                             : t("rider.selectDateRange")}
                                       </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                       className="w-auto p-4"
                                       align="end"
                                    >
                                       <div className="space-y-2 w-64">
                                          <div>
                                             <label className="block text-xs text-gray-500 mb-1">
                                                From
                                             </label>
                                             <input
                                                type="date"
                                                className="w-full rounded-md border px-3 py-2"
                                                value={
                                                   tempAnalyticsRange.from || ""
                                                }
                                                onChange={(e) =>
                                                   setTempAnalyticsRange(
                                                      (prev) => ({
                                                         ...prev,
                                                         from:
                                                            e.target.value ||
                                                            undefined,
                                                      }),
                                                   )
                                                }
                                             />
                                          </div>
                                          <div>
                                             <label className="block text-xs text-gray-500 mb-1">
                                                To
                                             </label>
                                             <input
                                                type="date"
                                                className="w-full rounded-md border px-3 py-2"
                                                value={
                                                   tempAnalyticsRange.to || ""
                                                }
                                                onChange={(e) =>
                                                   setTempAnalyticsRange(
                                                      (prev) => ({
                                                         ...prev,
                                                         to:
                                                            e.target.value ||
                                                            undefined,
                                                      }),
                                                   )
                                                }
                                             />
                                          </div>
                                          <div className="flex justify-between gap-2 pt-2">
                                             <Button
                                                variant="ghost"
                                                onClick={() => {
                                                   setTempAnalyticsRange({});
                                                   setDateRange({});
                                                   setAnalyticsPopoverOpen(
                                                      false,
                                                   );
                                                }}
                                             >
                                                {t("rider.clearRange")}
                                             </Button>
                                             <div className="flex gap-2">
                                                <Button
                                                   variant="outline"
                                                   onClick={() =>
                                                      setAnalyticsPopoverOpen(
                                                         false,
                                                      )
                                                   }
                                                >
                                                   {t("rider.cancel") ||
                                                      "Cancel"}
                                                </Button>
                                                <Button
                                                   onClick={() => {
                                                      // apply the temporary range to the real dateRange
                                                      setDateRange({
                                                         ...tempAnalyticsRange,
                                                      });
                                                      setAnalyticsPopoverOpen(
                                                         false,
                                                      );
                                                   }}
                                                >
                                                   {t("rider.apply") || "Apply"}
                                                </Button>
                                             </div>
                                          </div>
                                       </div>
                                    </PopoverContent>
                                 </Popover>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                              <StatsCard
                                 title="Accepted"
                                 value={`${analyticsStats.accepted}`}
                                 change={analyticsAcceptedChange}
                                 icon={CheckCircle}
                                 gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                              />
                              <StatsCard
                                 title="Rejected"
                                 value={`${analyticsStats.rejected}`}
                                 change={analyticsRejectedChange}
                                 icon={XCircle}
                                 gradient="bg-gradient-to-br from-red-500 to-red-600"
                              />
                              <StatsCard
                                 title="Completed"
                                 value={`${analyticsStats.delivered}`}
                                 change={analyticsDeliveredChange}
                                 icon={CheckCircle}
                                 gradient="bg-gradient-to-br from-green-500 to-green-600"
                              />
                              {/* Transparent cards with gradient borders */}
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-orange-500 to-pink-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             {timeframe === "today"
                                                ? t("rider.todayTotal") ||
                                                  "Today Total"
                                                : timeframe === "yesterday"
                                                  ? t("rider.yesterdayTotal") ||
                                                    "Yesterday Total"
                                                  : timeframe === "7"
                                                    ? t("rider.last7daysTotal")
                                                    : timeframe === "30"
                                                      ? t(
                                                           "rider.last30daysTotal",
                                                        )
                                                      : t(
                                                           "rider.last12monthsTotal",
                                                        )}
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             RWF{" "}
                                             {selectedDateTotal.toLocaleString()}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                          <DollarSign className="w-5 h-5 text-orange-600" />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             Peak hour
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             {peakHour}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                          <Clock className="w-5 h-5 text-blue-600" />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             Average rating
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             {averageRating}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                          <Star
                                             className="w-5 h-5 text-purple-600"
                                             fill="currentColor"
                                          />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                           <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                              {t("rider.recentDeliveries")}
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           {isLoading ? (
                              <div className="flex items-center justify-center py-8">
                                 <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                              </div>
                           ) : recent.length > 0 ? (
                              <div className="space-y-3">
                                 {recent.map((r: any) => (
                                    <RecentDelivery
                                       key={r.id}
                                       id={r.id}
                                       number={r.number}
                                       name={r.name}
                                       location={r.location}
                                       amount={`${r.amount}`}
                                       time={r.time}
                                       status={r.status}
                                       type={r.type}
                                    />
                                 ))}
                              </div>
                           ) : (
                              <div className="text-center py-8 text-gray-500">
                                 <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                                 <p className="text-sm sm:text-base">
                                    {t("rider.noRecentDeliveries")}
                                 </p>
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  </div>
               </div>
            </div>
         </ScrollArea>
      </div>
   );
};

export default Dashboard;
