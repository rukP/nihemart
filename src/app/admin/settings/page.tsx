'use client';

import React, { FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import { useRiders } from '@/hooks/useRiders';
import settingsAPI from '@/lib/api/settings';
import dashboardAPI from '@/lib/api/dashboard';
import { useAuthStore } from '@/store/auth.store';

// Profile form schema
const ProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  town: z.string().min(1, 'Town is required'),
  stateProvince: z.string().min(1, 'State/Province is required'),
});

type TProfileSchema = z.infer<typeof ProfileSchema>;

// Order settings schema (only implemented setting kept)
const OrderSettingsSchema = z.object({
  ordersEnabled: z.boolean(),
});

type TOrderSettingsSchema = z.infer<typeof OrderSettingsSchema>;

// Announcement schema
const AnnouncementSchema = z.object({
  announcement: z
    .string()
    .min(1, 'Announcement is required')
    .max(500, 'Announcement must be less than 500 characters'),
});

type TAnnouncementSchema = z.infer<typeof AnnouncementSchema>;

const AdminSettings: FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: ridersData, isLoading: _ridersLoading } = useRiders();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'orders' | 'announcement' | 'general'
  >('profile');
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
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phoneNumber: '',
      address: '',
      town: '',
      stateProvince: 'Kigali City',
    },
  });

  const orderSettingsForm = useForm<TOrderSettingsSchema>({
    resolver: zodResolver(OrderSettingsSchema),
    defaultValues: { ordersEnabled: true },
  });

  const announcementForm = useForm<TAnnouncementSchema>({
    resolver: zodResolver(AnnouncementSchema),
    defaultValues: { announcement: '' },
  });

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        // Fetch profile from backend API
        try {
          const profile = await handleApiRequest(() =>
            authorizedAPI.get('/users/profile')
          );

          if (profile) {
            const fullName =
              profile.fullName || profile.full_name || user.email || '';
            const nameParts = fullName.split(' ');
            profileForm.reset({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: user.email || '',
              phoneNumber: profile.phone || '',
              address: profile.address || '',
              town: profile.city || '',
              stateProvince: 'Kigali City',
            });
          } else {
            // Create default profile
            const fullName = user.fullName || user.email || '';
            const nameParts = fullName.split(' ');
            profileForm.reset({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: user.email || '',
              phoneNumber: '',
              address: '',
              town: '',
              stateProvince: 'Kigali City',
            });
          }
        } catch (_err) {
          // console.error('Failed to load profile:', _err);
          const fullName = user.fullName || user.email || '';
          const nameParts = fullName.split(' ');
          profileForm.reset({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            town: '',
            stateProvince: 'Kigali City',
          });
        }
        setProfileLoading(false);
      } catch (_err) {
        // console.error('Error loading profile:', _err);
        setProfileLoading(false);
      }
    };

    const loadStats = async () => {
      try {
        // Load dashboard stats from backend
        const statsData = await dashboardAPI.getStats();

        setStats({
          totalUsers: statsData.totalUsers,
          totalOrders: statsData.totalOrders,
          totalRevenue: statsData.totalRevenue,
          activeRiders: statsData.activeRiders,
          pendingOrders: statsData.pendingOrders,
          completedOrders: statsData.completedOrders,
        });
      } catch (_error) {
        // console.error('Error loading stats:', _error);
        // Fallback to empty stats on _error
        setStats({
          totalUsers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          activeRiders: 0,
          pendingOrders: 0,
          completedOrders: 0,
        });
      }
    };

    const loadOrderSettings = async () => {
      try {
        // Load orders enabled setting from backend
        const response = await settingsAPI.getOrdersEnabled();
        const ordersEnabled = Boolean(response.enabled);
        orderSettingsForm.setValue('ordersEnabled', ordersEnabled);
        // Optionally notify admin when schedule is currently disabling orders
        if (response.mode === 'auto' && ordersEnabled === false) {
          try {
            toast('Orders currently disabled by schedule');
          } catch (_e) {}
        }
      } catch (_error) {
        // console.error('Error loading order settings:', _error);
      }
    };

    const loadAnnouncement = async () => {
      try {
        // Load announcement from backend API
        const response = await fetch('/api/announcement');
        if (response.ok) {
          const data = await response.json();
          announcementForm.setValue('announcement', data.announcement || '');
        }
      } catch (_error) {
        // console.error('Error loading announcement:', _error);
      }
    };

    loadProfile();
    loadStats();
    loadOrderSettings();
    loadAnnouncement();

    // Note: Realtime updates removed - using polling or manual refresh instead
    // If needed, can add polling interval here
  }, [user, profileForm, orderSettingsForm, ridersData]);

  const onProfileSubmit = async (data: TProfileSchema) => {
    if (!user) return;

    // Update profile via backend API
    try {
      await handleApiRequest(() =>
        authorizedAPI.put('/users/profile', {
          fullName: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phoneNumber,
          address: data.address,
          city: data.town,
        })
      );
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
      return;
    }
    toast.success('Profile updated successfully');
  };

  const onOrderSettingsSubmit = async (data: TOrderSettingsSchema) => {
    try {
      // Update orders enabled setting via backend API
      await settingsAPI.setOrdersEnabled(data.ordersEnabled);
      toast.success('Order settings updated successfully');
    } catch (error: any) {
      // console.error('Error updating order settings:', error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          'Failed to update order settings'
      );
    }
  };

  const onAnnouncementSubmit = async (data: TAnnouncementSchema) => {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ announcement: data.announcement }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Failed to save announcement',
        }));
        throw new Error(error.error || 'Failed to save announcement');
      }

      toast.success('Announcement updated successfully');
    } catch (error: any) {
      // console.error('Error updating announcement:', error);
      toast.error(error?.message || 'Failed to update announcement');
    }
  };

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create a new user account',
      icon: UserPlus,
      href: '/admin/users/new',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Riders',
      description: 'View and manage delivery riders',
      icon: Truck,
      href: '/admin/riders',
      color: 'bg-green-500',
    },
    {
      title: 'Add Product',
      description: 'Add new products to catalog',
      icon: Package,
      href: '/admin/products/new',
      color: 'bg-purple-500',
    },
    {
      title: 'View Orders',
      description: 'Monitor and manage orders',
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'bg-orange-500',
    },
    {
      title: 'Sales Reports',
      description: 'View sales analytics',
      icon: BarChart3,
      href: '/admin/sales',
      color: 'bg-indigo-500',
    },
    {
      title: 'Stock Management',
      description: 'Manage inventory levels',
      icon: Database,
      href: '/admin/stock',
      color: 'bg-red-500',
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
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'profile'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'orders'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Order Settings</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('announcement')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'announcement'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Megaphone className="h-5 w-5" />
                    <span className="font-medium">Announcement</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'general'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-50'
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
            {activeTab === 'profile' && (
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
                                  value={field.value.replace('+250', '')}
                                  onChange={e =>
                                    field.onChange('+250' + e.target.value)
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
                            ? 'Saving...'
                            : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'orders' && (
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
                            ? 'Saving...'
                            : 'Save Settings'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'announcement' && (
              <Card className="border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <Megaphone className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-orange-800 text-xl">
                        Site Announcement
                      </CardTitle>
                      <p className="text-orange-600 mt-1">
                        Manage the announcement displayed on the storefront
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Form {...announcementForm}>
                    <form
                      onSubmit={announcementForm.handleSubmit(
                        onAnnouncementSubmit
                      )}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 gap-6">
                        <FormField
                          control={announcementForm.control}
                          name="announcement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-600 font-medium">
                                Announcement Text
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={4}
                                  maxLength={500}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-400 focus:ring-orange-400 resize-none"
                                  placeholder="Enter announcement message (e.g., 'Due to Rainy season it will affect delivery')"
                                />
                              </FormControl>
                              <div className="flex justify-between items-center">
                                <FormMessage />
                                <span className="text-xs text-gray-500">
                                  {field.value?.length || 0} / 500 characters
                                </span>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Preview Section */}
                      {/* Preview Section */}
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h3 className="text-sm font-medium text-orange-800 mb-2">
                          Preview
                        </h3>
                        <div className="bg-orange-600 text-white py-2 px-4 rounded">
                          <p className="font-semibold text-sm md:text-base">
                            {announcementForm.watch('announcement') ||
                              'Your announcement will appear here...'}
                          </p>
                        </div>
                        <p className="text-xs text-orange-600 mt-2">
                          This is how the announcement will appear on the
                          storefront
                        </p>
                      </div>

                      <div className="flex justify-end gap-4 pt-6">
                        <Button
                          type="submit"
                          className="px-8 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={announcementForm.formState.isSubmitting}
                        >
                          {announcementForm.formState.isSubmitting
                            ? 'Saving...'
                            : 'Save Announcement'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'general' && (
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
