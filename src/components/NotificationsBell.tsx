"use client";
import React, { useState } from "react";
import {
   Bell,
   CheckCircle2,
   Eye,
   ArrowRight,
   Loader2,
   ShoppingBag,
   Package,
   AlertCircle,
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const NotificationsBell: React.FC = () => {
   const { notifications, markAsRead } = useNotifications();
   const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null);
   
   // Filter out invalid notifications
   const validNotifications = notifications.filter((n) => {
      return n && n.id && (n.title || n.body) && n.created_at;
   });
   
   const unread = validNotifications.filter((n) => !n.read).length;
   const router = useRouter();
   const { hasRole } = useAuth();

   const getNotificationIcon = (type?: string) => {
      switch (type) {
         case "order":
            return <Package className="h-4 w-4 text-blue-600" />;
         case "promotion":
            return <ShoppingBag className="h-4 w-4 text-green-600" />;
         case "system":
            return <AlertCircle className="h-4 w-4 text-orange-600" />;
         default:
            return <Bell className="h-4 w-4 text-gray-600" />;
      }
   };

   const handleNotificationClick = async (notification: any) => {
      if (!notification.read) {
         setIsMarkingRead(notification.id);
         await markAsRead(notification.id);
         setIsMarkingRead(null);
      }

      try {
         const meta =
            typeof notification.meta === "string"
               ? JSON.parse(notification.meta)
               : notification.meta || {};

         const isAdmin = hasRole && hasRole("admin");

         // For admin users keep existing behavior: allow meta.url or order-specific route
         if (isAdmin) {
            if (meta?.url) {
               router.push(meta.url);
               return;
            }
            if (meta && (meta.order?.id || meta.order_id)) {
               router.push(`/admin/orders/${meta.order?.id || meta.order_id}`);
               return;
            }
            // fallback to notifications page for admins as well
            router.push(`/notifications`);
            return;
         }

         // Non-admin (customer) behavior: always go to notifications page so they can see rider contact and details
         router.push(`/notifications`);
      } catch (e) {
         console.error("Error handling notification click:", e);
         router.push(`/notifications`);
      }
   };

   const handleMarkAllAsRead = async () => {
      const unreadNotifications = validNotifications.filter((n) => !n.read);
      for (const notification of unreadNotifications) {
         await markAsRead(notification.id);
      }
   };

   const handleViewAll = () => {
      router.push("/notifications");
   };

   const formatTime = (dateString: string) => {
      try {
         if (!dateString) return "Recently";
         
         const date = new Date(dateString);
         
         // Check if date is valid
         if (isNaN(date.getTime())) {
            return "Recently";
         }
         
         const now = new Date();
         const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

         if (diffInHours < 0) {
            // Future date, probably a timezone issue
            return "Just now";
         }

         if (diffInHours < 1) {
            const minutes = Math.floor(diffInHours * 60);
            return minutes <= 0 ? "Just now" : `${minutes}m ago`;
         } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
         } else if (diffInHours < 168) {
            const days = Math.floor(diffInHours / 24);
            return `${days}d ago`;
         } else {
            return date.toLocaleDateString("en-US", {
               month: "short",
               day: "numeric",
               year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
            });
         }
      } catch (error) {
         console.error("Error formatting time:", error);
         return "Recently";
      }
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               variant="ghost"
               size="icon"
               className="relative h-9 w-9 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
               <Bell className="w-5 h-5" />
               {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-background">
                     {unread > 9 ? "9+" : unread}
                  </span>
               )}
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent
            align="end"
            className="w-96 max-h-[480px] overflow-hidden z-[9999] p-0"
         >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-25 border-b">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <h3 className="font-semibold text-orange-900">
                        Notifications
                     </h3>
                     {unread > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs">
                           {unread} new
                        </Badge>
                     )}
                  </div>
                  {unread > 0 && (
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                     >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark all read
                     </Button>
                  )}
               </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-auto">
               {validNotifications.length === 0 ? (
                  <div className="py-8 text-center">
                     <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                     <p className="text-sm text-gray-600">
                        No notifications yet
                     </p>
                     <p className="text-xs text-gray-500 mt-1">
                        We&apos;ll notify you when something arrives
                     </p>
                  </div>
               ) : (
                  validNotifications.slice(0, 6).map((notification) => (
                     <DropdownMenuItem
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 flex items-start space-x-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                           notification.read
                              ? "opacity-70"
                              : "bg-blue-50 hover:bg-blue-100"
                        }`}
                     >
                        {isMarkingRead === notification.id ? (
                           <Loader2 className="h-4 w-4 text-orange-600 animate-spin mt-0.5 flex-shrink-0" />
                        ) : (
                           <div
                              className={`p-1.5 rounded-full mt-0.5 flex-shrink-0 ${
                                 notification.read
                                    ? "bg-gray-100"
                                    : "bg-orange-100"
                              }`}
                           >
                              {getNotificationIcon(notification.type)}
                           </div>
                        )}

                        <div className="flex-1 min-w-0">
                           <div className="flex items-start justify-between mb-1">
                              <p
                                 className={`text-sm font-medium truncate ${
                                    notification.read
                                       ? "text-gray-700"
                                       : "text-gray-900"
                                 }`}
                              >
                                 {notification.title}
                              </p>
                              {!notification.read && (
                                 <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 ml-2 mt-1.5" />
                              )}
                           </div>

                           {notification.body && (
                              <div className="text-xs text-gray-600 mb-1">
                                 <div className="whitespace-pre-wrap line-clamp-3">
                                    {notification.body}
                                 </div>
                              </div>
                           )}

                           <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                 {formatTime(notification.created_at)}
                              </span>
                              {!notification.read && (
                                 <span className="text-xs text-orange-600 font-medium">
                                    New
                                 </span>
                              )}
                           </div>
                        </div>
                     </DropdownMenuItem>
                  ))
               )}
            </div>

            {/* Footer */}
            {validNotifications.length > 0 && (
               <>
                  <Separator />
                  <div className="p-2 bg-gray-50">
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewAll}
                        className="w-full h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                     >
                        View all notifications
                        <ArrowRight className="h-3 w-3 ml-1" />
                     </Button>
                  </div>
               </>
            )}

            {validNotifications.length === 0 && (
               <>
                  <Separator />
                  <div className="p-2 bg-gray-50">
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewAll}
                        className="w-full h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                     >
                        View notifications page
                        <ArrowRight className="h-3 w-3 ml-1" />
                     </Button>
                  </div>
               </>
            )}
         </DropdownMenuContent>
      </DropdownMenu>
   );
};

export default NotificationsBell;
