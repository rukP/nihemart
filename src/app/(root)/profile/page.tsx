"use client";

import { useEffect, useState } from "react";
import {
   User,
   Edit,
   Save,
   X,
   ShoppingBag,
   Package,
   TrendingUp,
   Clock,
   Bell,
   ArrowRight,
   MapPin,
   Mail,
   Phone,
   Calendar,
   CreditCard,
   Award,
   Star,
   ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PhoneField from "@/components/ui/PhoneField";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrders } from "@/hooks/useOrders";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useRouter } from "next/navigation";

const Profile = () => {
   const { t } = useLanguage();
   const { user, loading, hasRole } = useAuth();
   const router = useRouter();
   // Orders enabled setting for showing customer-friendly notices
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
   });
   const [profileLoading, setProfileLoading] = useState(true);
   const { notifications } = useNotifications();
   const { useUserOrders } = useOrders();

   // Get comprehensive order data for stats
   const { data: ordersData, isLoading: ordersLoading } = useUserOrders({
      pagination: { page: 1, limit: 100 }, // Get more orders for better stats
      sort: { column: "created_at", direction: "desc" },
   });

   useEffect(() => {
      const load = async () => {
         if (!user) return setProfileLoading(false);

         const { data, error } = await supabase
            .from("profiles")
            .select("full_name, phone, address, city")
            .eq("id", user.id)
            .maybeSingle();

         if (!error && data) {
            setFormData({
               fullName: data?.full_name || "",
               email: user.email || "",
               phone: data?.phone || "",
               address: data?.address || "",
               city: data?.city || "",
            });
            setProfileLoading(false);
         } else if (!error && !data) {
            const { error: insertError } = await supabase
               .from("profiles")
               .insert({
                  id: user.id,
                  full_name: user.user_metadata?.full_name || user.email || "",
                  phone: "",
                  address: "",
                  city: "",
               });
            if (insertError) {
               toast.error("Failed to create profile: " + insertError.message);
            }
            setFormData({
               fullName: user.user_metadata?.full_name || user.email || "",
               email: user.email || "",
               phone: "",
               address: "",
               city: "",
            });
            setProfileLoading(false);
         } else {
            toast.error(error?.message || "Failed to load profile");
            setProfileLoading(false);
         }
      };
      load();
   }, [user]);

   // Fetch orders_enabled flag to show customers a friendly banner when ordering is disabled
   useEffect(() => {
      let mounted = true;
      (async () => {
         try {
            const res = await fetch("/api/admin/settings/orders-enabled");
            if (!res.ok) {
               // Treat missing/unreachable API as unknown so schedule controls the flag by default
               if (mounted) setOrdersEnabled(null);
            } else {
               const j = await res.json();
               if (!mounted) return;
               setOrdersEnabled(Boolean(j.enabled));
               setOrdersDisabledMessage(j.message || null);
            }
         } catch (err) {
            console.warn(
               "Failed to fetch orders_enabled for profile page:",
               err
            );
            // On error, leave null so the scheduler (auto) behavior is used by default
            if (mounted) setOrdersEnabled(null);
         }
      })();

      return () => {
         mounted = false;
      };
   }, [user]);

   const handleSave = async () => {
      if (!user) return;

      // Prevent riders from editing their own profile client-side as an extra
      // safeguard. Admins or other non-rider roles are allowed to save.
      if (hasRole && hasRole("rider")) {
         toast.error("You are not allowed to edit profile information.");
         setIsEditing(false);
         return;
      }

      const { error } = await supabase.from("profiles").upsert({
         id: user.id,
         full_name: formData.fullName,
         phone: formData.phone,
         address: formData.address,
         city: formData.city,
      });
      if (error) {
         toast.error(error.message);
         return;
      }
      toast.success("Profile updated");
      setIsEditing(false);
   };

   const handleCancel = () => {
      setIsEditing(false);
   };

   // Calculate stats from orders data
   const calculateStats = () => {
      if (!ordersData?.data)
         return {
            totalOrders: 0,
            totalSpent: 0,
            activeOrders: 0,
            completedOrders: 0,
            averageOrder: 0,
            recentOrders: [],
         };

      const orders = Array.isArray(ordersData.data) ? ordersData.data : [];

      // total orders is simply number of orders returned by the query
      const totalOrders = orders.length;

      // Define which statuses count as active
      const activeStatuses = ["pending", "processing", "shipped"];

      // completed orders are those delivered
      const completedOrders = orders.filter(
         (order) => order.status === "delivered"
      ).length;

      // active orders count
      const activeOrders = orders.filter((order) =>
         activeStatuses.includes(order.status || "")
      ).length;

      // totalSpent: sum totals for completed orders only (exclude cancelled/refunded/unsettled)
      const totalSpent = orders
         .filter((order) => order.status === "delivered")
         .reduce((sum, order) => sum + Number(order.total || 0), 0);

      // averageOrder: average of completed orders (fallback to 0)
      const averageOrder =
         completedOrders > 0 ? totalSpent / completedOrders : 0;

      // recentOrders: sort by created_at desc then take first 3 (guard for missing created_at)
      const recentOrders = orders
         .slice()
         .sort((a, b) => {
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            return tb - ta;
         })
         .slice(0, 3);

      return {
         totalOrders,
         totalSpent,
         activeOrders,
         completedOrders,
         averageOrder,
         recentOrders,
      };
   };

   const stats = calculateStats();
   const unreadNotifications = notifications.filter((n) => !n.read).length;

   const getStatusBadge = (status?: string) => {
      if (!status) return <Badge variant="secondary">Unknown</Badge>;

      const badgeConfig = {
         pending: {
            variant: "secondary",
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
         },
         processing: {
            variant: "default",
            color: "bg-blue-100 text-blue-800 border-blue-200",
         },
         shipped: {
            variant: "secondary",
            color: "bg-purple-100 text-purple-800 border-purple-200",
         },
         delivered: {
            variant: "default",
            color: "bg-green-100 text-green-800 border-green-200",
         },
         cancelled: {
            variant: "destructive",
            color: "bg-red-100 text-red-800 border-red-200",
         },
      };

      const config = badgeConfig[status as keyof typeof badgeConfig];

      return (
         <Badge
            variant={(config?.variant as any) || "secondary"}
            className={`${
               config?.color || "bg-gray-100 text-gray-800"
            } font-medium text-xs`}
         >
            {status.charAt(0).toUpperCase() + status.slice(1)}
         </Badge>
      );
   };

   if (loading || profileLoading) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
            <div className="flex items-center justify-center min-h-[60vh]">
               <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">
                     Loading profile...
                  </span>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
               <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-1 sm:p-2 hover:bg-gray-100 h-8 w-8 sm:h-10 sm:w-10"
               >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
               </Button>
               <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                     {t("nav.profile")}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                     Manage your account
                  </p>
               </div>
            </div>
            {/* Show customer-facing orders-disabled banner when ordering is disabled */}
            {ordersEnabled === false && (
               <div className="w-full mt-3">
                  <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                     {ordersDisabledMessage &&
                        t("checkout.ordersDisabledMessage")}
                  </div>
               </div>
            )}
            {/* Riders are not allowed to edit their own profile; only admins or non-rider users may edit */}
            {!isEditing && !(hasRole && hasRole("rider")) && (
               <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-9 sm:h-10 w-full sm:w-auto"
               >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Edit Profile
               </Button>
            )}
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Profile Info - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2 space-y-6">
               {/* Profile Card */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-6">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                           <User className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                           <h2 className="text-xl sm:text-2xl font-bold text-orange-800 break-words">
                              {formData.fullName || "Your Name"}
                           </h2>
                           <p className="text-orange-600 text-sm sm:text-base break-words mt-1">
                              {formData.email}
                           </p>
                           <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                 <Calendar className="h-3 w-3 mr-1" />
                                 Member since{" "}
                                 {new Date(
                                    user?.created_at || ""
                                 ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                 })}
                              </Badge>
                              {stats.completedOrders >= 5 && (
                                 <Badge className="bg-green-100 text-green-800 text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Loyal Customer
                                 </Badge>
                              )}
                           </div>
                        </div>
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                           <Label
                              htmlFor="fullName"
                              className="text-sm font-medium text-gray-700"
                           >
                              Full Name
                           </Label>
                           <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) =>
                                 setFormData({
                                    ...formData,
                                    fullName: e.target.value,
                                 })
                              }
                              disabled={
                                 !isEditing || (hasRole && hasRole("rider"))
                              }
                              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm h-10 mt-1"
                           />
                        </div>

                        <div>
                           <Label
                              htmlFor="email"
                              className="text-sm font-medium text-gray-700"
                           >
                              Email
                           </Label>
                           <div className="relative mt-1">
                              <Input
                                 id="email"
                                 type="email"
                                 value={formData.email}
                                 disabled={true}
                                 className="border-gray-300 text-sm h-10 bg-gray-50"
                              />
                              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                           </div>
                        </div>

                        <div>
                           {/* Use shared PhoneField for consistent styling */}
                           <PhoneField
                              id="phone"
                              label={"Phone"}
                              value={formData.phone}
                              onChange={(e: any) =>
                                 setFormData({
                                    ...formData,
                                    phone: e.target.value,
                                 })
                              }
                              disabled={
                                 !isEditing || (hasRole && hasRole("rider"))
                              }
                              className="text-sm"
                              placeholder="Your phone number"
                           />
                        </div>

                        <div>
                           <Label
                              htmlFor="city"
                              className="text-sm font-medium text-gray-700"
                           >
                              City
                           </Label>
                           <div className="relative mt-1">
                              <Input
                                 id="city"
                                 value={formData.city}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       city: e.target.value,
                                    })
                                 }
                                 disabled={
                                    !isEditing || (hasRole && hasRole("rider"))
                                 }
                                 className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm h-10"
                                 placeholder="Your city"
                              />
                              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                           </div>
                        </div>

                        <div className="sm:col-span-2">
                           <Label
                              htmlFor="address"
                              className="text-sm font-medium text-gray-700"
                           >
                              Address
                           </Label>
                           <Input
                              id="address"
                              value={formData.address}
                              onChange={(e) =>
                                 setFormData({
                                    ...formData,
                                    address: e.target.value,
                                 })
                              }
                              disabled={
                                 !isEditing || (hasRole && hasRole("rider"))
                              }
                              className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm h-10 mt-1"
                              placeholder="Your address"
                           />
                        </div>
                     </div>

                     {isEditing && !(hasRole && hasRole("rider")) && (
                        <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t">
                           <Button
                              onClick={handleSave}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-sm h-9 order-1 sm:order-1"
                           >
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                           </Button>
                           <Button
                              variant="outline"
                              onClick={handleCancel}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 text-sm h-9 order-2 sm:order-2"
                           >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                           </Button>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Recent Orders */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Recent Orders
                        </CardTitle>
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => router.push("/orders")}
                           className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
                        >
                           View All Orders
                           <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     {ordersLoading ? (
                        <div className="text-center py-8">
                           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-3"></div>
                           <p className="text-sm text-gray-600">
                              Loading orders...
                           </p>
                        </div>
                     ) : stats.recentOrders.length === 0 ? (
                        <div className="text-center py-8">
                           <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                           <h3 className="text-base font-medium text-gray-900 mb-2">
                              No orders yet
                           </h3>
                           <p className="text-gray-600 mb-4 text-sm">
                              Start shopping to see your orders here!
                           </p>
                           <Button
                              onClick={() => router.push("/")}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-sm h-9"
                           >
                              Start Shopping
                           </Button>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {stats.recentOrders.map((order: any) => (
                              <div
                                 key={order.id}
                                 className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                 onClick={() =>
                                    router.push(`/orders/${order.id}`)
                                 }
                              >
                                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                       <div className="flex flex-wrap items-center gap-2 mb-2">
                                          <span className="font-medium text-sm sm:text-base">
                                             Order #{order.order_number}
                                          </span>
                                          {getStatusBadge(order.status)}
                                       </div>
                                       <div className="text-xs sm:text-sm text-muted-foreground">
                                          {new Date(
                                             order.created_at
                                          ).toLocaleDateString("en-US", {
                                             year: "numeric",
                                             month: "short",
                                             day: "numeric",
                                          })}
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <div className="font-semibold text-sm sm:text-base">
                                          {Number(order.total).toLocaleString()}{" "}
                                          RWF
                                       </div>
                                       <div className="text-xs sm:text-sm text-muted-foreground">
                                          {order.delivery_city || "-"}
                                       </div>
                                    </div>
                                 </div>
                                 {order.items && order.items.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                       <p className="text-xs sm:text-sm text-gray-600">
                                          {order.items.length} item
                                          {order.items.length !== 1
                                             ? "s"
                                             : ""}{" "}
                                          •{order.items[0]?.product_name}
                                          {order.items.length > 1 &&
                                             ` +${order.items.length - 1} more`}
                                       </p>
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </CardContent>
               </Card>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
               {/* Quick Stats */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Your Stats
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                           <ShoppingBag className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                           <div className="text-lg sm:text-xl font-bold text-blue-900">
                              {stats.totalOrders}
                           </div>
                           <div className="text-xs text-blue-600">
                              Total Orders
                           </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                           <CreditCard className="h-6 w-6 text-green-600 mx-auto mb-2" />
                           <div className="text-lg sm:text-xl font-bold text-green-900">
                              {(stats.totalSpent / 1000).toFixed(0)}K
                           </div>
                           <div className="text-xs text-green-600">
                              Total Spent (RWF)
                           </div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                           <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                           <div className="text-lg sm:text-xl font-bold text-yellow-900">
                              {stats.activeOrders}
                           </div>
                           <div className="text-xs text-yellow-600">
                              Active Orders
                           </div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                           <Package className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                           <div className="text-lg sm:text-xl font-bold text-purple-900">
                              {stats.completedOrders}
                           </div>
                           <div className="text-xs text-purple-600">
                              Completed
                           </div>
                        </div>
                     </div>

                     {stats.totalOrders > 0 && (
                        <div className="pt-4 border-t">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">
                                 Average Order Value
                              </span>
                              <TrendingUp className="h-4 w-4 text-green-500" />
                           </div>
                           <div className="text-lg font-bold text-gray-900">
                              {stats.averageOrder.toLocaleString()} RWF
                           </div>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Notifications Summary */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Notifications
                        </CardTitle>
                        {unreadNotifications > 0 && (
                           <Badge className="bg-red-500 text-white text-xs">
                              {unreadNotifications}
                           </Badge>
                        )}
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     <div className="text-center py-4">
                        <Bell className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                        <div className="text-sm text-gray-600 mb-4">
                           {unreadNotifications > 0
                              ? `You have ${unreadNotifications} unread notification${
                                   unreadNotifications !== 1 ? "s" : ""
                                }`
                              : notifications.length > 0
                              ? "All notifications read"
                              : "No notifications yet"}
                        </div>
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => router.push("/notifications")}
                           className="border-orange-300 text-orange-600 hover:bg-orange-50 text-sm h-9 w-full"
                        >
                           View Notifications
                           <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                     </div>
                  </CardContent>
               </Card>

               {/* Quick Actions */}
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Quick Actions
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <Button
                        onClick={() => router.push("/addresses")}
                        variant="outline"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm h-9"
                     >
                        <MapPin className="h-4 w-4 mr-2" />
                        Manage Addresses
                     </Button>
                     <Button
                        onClick={() => router.push("/orders")}
                        variant="outline"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm h-9"
                     >
                        <Package className="h-4 w-4 mr-2" />
                        Order History
                     </Button>
                     <Button
                        onClick={() => router.push("/")}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm h-9"
                     >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Continue Shopping
                     </Button>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
};

export default Profile;
