"use client";

import React, { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import PhoneField from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  User,
  Settings,
  Users,
  UserPlus,
  Truck,
  Package,
  ShoppingCart,
  BarChart3,
  Database,
  ArrowRight,
  Zap,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRiders } from "@/hooks/useRiders";

// Profile form schema
const ProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  town: z.string().min(1, "Town is required"),
  stateProvince: z.string().min(1, "State/Province is required"),
});

type TProfileSchema = z.infer<typeof ProfileSchema>;

// Order settings schema (only implemented setting kept)
const OrderSettingsSchema = z.object({
  ordersEnabled: z.boolean(),
});

type TOrderSettingsSchema = z.infer<typeof OrderSettingsSchema>;

const AdminSettings: FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: ridersData, isLoading: ridersLoading } = useRiders();
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "general">(
    "profile"
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeRiders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  const profileForm = useForm<TProfileSchema>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      phoneNumber: "",
      address: "",
      town: "",
      stateProvince: "Kigali City",
    },
  });

  const orderSettingsForm = useForm<TOrderSettingsSchema>({
    resolver: zodResolver(OrderSettingsSchema),
    defaultValues: { ordersEnabled: true },
  });

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone, address, city")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          const fullName =
            data.full_name || user.user_metadata?.full_name || user.email || "";
          const nameParts = fullName.split(" ");
          profileForm.reset({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user.email || "",
            phoneNumber: data.phone || "",
            address: data.address || "",
            town: data.city || "",
            stateProvince: "Kigali City",
          });
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
          const fullName = user.user_metadata?.full_name || user.email || "";
          const nameParts = fullName.split(" ");
          profileForm.reset({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user.email || "",
            phoneNumber: "",
            address: "",
            town: "",
            stateProvince: "Kigali City",
          });
        } else {
          toast.error((error as any)?.message || "Failed to load profile");
        }
        setProfileLoading(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        setProfileLoading(false);
      }
    };

    const loadStats = async () => {
      try {
        // Load dashboard stats
        // Use type assertion to bypass TypeScript checking for orders table
        const [usersResult, ordersResult] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact" }),
          (supabase as any)
            .from("orders")
            .select("id, total, status", { count: "exact" }),
        ]);

        const totalUsers = usersResult.count || 0;
        const orders = ordersResult.data || [];
        const totalOrders = ordersResult.count || 0;
        // Revenue should reflect completed/delivered orders only (exclude cancelled/refunded)
        const totalRevenue = orders
          .filter((order: any) => order.status === "delivered")
          .reduce(
            (sum: number, order: any) => sum + Number(order.total || 0),
            0
          );
        const pendingOrders = orders.filter((order: any) =>
          ["pending", "processing"].includes(order.status || "")
        ).length;
        const completedOrders = orders.filter(
          (order: any) => order.status === "delivered"
        ).length;

        // Use riders data from the hook
        const riders = ridersData || [];
        const activeRiders = riders.filter((rider: any) => rider.active).length;

        setStats({
          totalUsers,
          totalOrders,
          totalRevenue,
          activeRiders,
          pendingOrders,
          completedOrders,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    const loadOrderSettings = async () => {
      try {
        // Load orders enabled setting
        const res = await fetch("/api/admin/settings/orders-enabled");
        if (res.ok) {
          const json = await res.json();
          const ordersEnabled = Boolean(json.enabled);
          orderSettingsForm.setValue("ordersEnabled", ordersEnabled);
          // Optionally notify admin when schedule is currently disabling orders
          if (json.scheduleDisabled && ordersEnabled === false) {
            try {
              toast("Orders currently disabled by schedule until 9am");
            } catch (e) {}
          }
        }
      } catch (error) {
        console.error("Error loading order settings:", error);
      }
    };

    loadProfile();
    loadStats();
    loadOrderSettings();

    // Realtime reflect orders_enabled changes in admin UI
    const channel = supabase
      .channel("admin_site_settings_orders_enabled")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "key=eq.orders_enabled",
        },
        (payload: any) => {
          try {
            const next = payload?.new?.value;
            const enabled =
              next === true ||
              String(next) === "true" ||
              (next && next === "true");
            orderSettingsForm.setValue("ordersEnabled", Boolean(enabled));
          } catch (e) {}
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [user, profileForm, orderSettingsForm, ridersData]);

  const onProfileSubmit = async (data: TProfileSchema) => {
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: `${data.firstName} ${data.lastName}`,
      phone: data.phoneNumber,
      address: data.address,
      city: data.town,
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated successfully");
  };

  const onOrderSettingsSubmit = async (data: TOrderSettingsSchema) => {
    try {
      // Update orders enabled setting
      const res = await fetch("/api/admin/settings/orders-enabled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: data.ordersEnabled }),
      });

      if (!res.ok) {
        throw new Error("Failed to update orders enabled setting");
      }

      toast.success("Order settings updated successfully");
    } catch (error: any) {
      console.error("Error updating order settings:", error);
      toast.error(error.message || "Failed to update order settings");
    }
  };

  const quickActions = [
    {
      title: "Add New User",
      description: "Create a new user account",
      icon: UserPlus,
      href: "/admin/users/new",
      color: "bg-blue-500",
    },
    {
      title: "Manage Riders",
      description: "View and manage delivery riders",
      icon: Truck,
      href: "/admin/riders",
      color: "bg-green-500",
    },
    {
      title: "Add Product",
      description: "Add new products to catalog",
      icon: Package,
      href: "/admin/products/new",
      color: "bg-purple-500",
    },
    {
      title: "View Orders",
      description: "Monitor and manage orders",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-orange-500",
    },
    {
      title: "Sales Reports",
      description: "View sales analytics",
      icon: BarChart3,
      href: "/admin/sales",
      color: "bg-indigo-500",
    },
    {
      title: "Stock Management",
      description: "Manage inventory levels",
      icon: Database,
      href: "/admin/stock",
      color: "bg-red-500",
    },
  ];

  if (loading || profileLoading) {
    return (
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="px-5 sm:px-10 py-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <span className="text-sm text-muted-foreground">
                Loading settings...
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
      <div className="px-5 sm:px-10 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Settings
          </h1>
          <p className="text-gray-500">
            Manage your admin profile, order settings, and system preferences
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="xl:col-span-1">
            <Card className="border-orange-200">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === "profile"
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === "orders"
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Order Settings</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("general")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === "general"
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">General</span>
                  </button>
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-orange-200 mt-6">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4">
                <CardTitle className="text-orange-800 text-lg">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-900">
                      {stats.totalUsers}
                    </div>
                    <div className="text-xs text-blue-600">Users</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-900">
                      {stats.totalOrders}
                    </div>
                    <div className="text-xs text-green-600">Orders</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-900">
                      {(stats.totalRevenue / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-purple-600">Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <Truck className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-orange-900">
                      {stats.activeRiders}
                    </div>
                    <div className="text-xs text-orange-600">Riders</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3">
            {activeTab === "profile" && (
              <Card className="border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-orange-800 text-xl">
                        Admin Profile
                      </CardTitle>
                      <p className="text-orange-600 mt-1">
                        Manage your personal information and preferences
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  disabled
                                  className="h-12 rounded-xl border-gray-300 bg-gray-50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                Phone Number
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value.replace("+250", "")}
                                  onChange={(e) =>
                                    field.onChange("+250" + e.target.value)
                                  }
                                  className="h-12 rounded-xl  border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-gray-600 font-medium">
                                Address
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="town"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                Town
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="stateProvince"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                State/Province
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-12 rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-4 pt-6">
                        <Button
                          type="submit"
                          className="px-8 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={profileForm.formState.isSubmitting}
                        >
                          {profileForm.formState.isSubmitting
                            ? "Saving..."
                            : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === "orders" && (
              <Card className="border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-orange-800 text-xl">
                        Order Settings
                      </CardTitle>
                      <p className="text-orange-600 mt-1">
                        Toggle order acceptance on the storefront
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Form {...orderSettingsForm}>
                    <form
                      onSubmit={orderSettingsForm.handleSubmit(
                        onOrderSettingsSubmit
                      )}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 gap-6">
                        <FormField
                          control={orderSettingsForm.control}
                          name="ordersEnabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-25 border-blue-200">
                              <div>
                                <FormLabel className="text-blue-700 font-medium">
                                  Enable Orders
                                </FormLabel>
                                <p className="text-sm text-blue-600">
                                  Allow customers to place new orders
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-4 pt-6">
                        <Button
                          type="submit"
                          className="px-8 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={orderSettingsForm.formState.isSubmitting}
                        >
                          {orderSettingsForm.formState.isSubmitting
                            ? "Saving..."
                            : "Save Settings"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <Zap className="h-8 w-8 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-orange-800 text-xl">
                          Quick Actions
                        </CardTitle>
                        <p className="text-orange-600 mt-1">
                          Access frequently used admin functions
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-3 hover:bg-gray-50 border-gray-200"
                          onClick={() => router.push(action.href)}
                        >
                          <div
                            className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}
                          >
                            <action.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {action.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {action.description}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* end General tab content */}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

function AdminSettingsWrapper() {
  return (
    <ProtectedRoute requiredSection="settings">
      <AdminSettings />
    </ProtectedRoute>
  );
}

export default AdminSettingsWrapper;
