"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Badge } from "@/components/ui/badge";
import {
   ArrowLeft,
   Bell,
   CheckCircle2,
   Trash2,
   Eye,
   EyeOff,
   Filter,
   Loader2,
   MoreHorizontal,
} from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogAction,
   AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

const RiderNotificationsPage = () => {
   const { user, loading } = useAuth();
   const { notifications, markAsRead, clear } = useNotifications();
   const [localNotifications, setLocalNotifications] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [filter, setFilter] = useState<"all" | "unread">("all");
   const [showClearConfirm, setShowClearConfirm] = useState(false);
   const router = useRouter();

   useEffect(() => {
      const validNotifications = notifications.filter((n) => {
         return n && n.id && (n.title || n.body) && n.created_at;
      });
      setLocalNotifications(validNotifications);
   }, [notifications]);

   const filteredNotifications = localNotifications.filter((notification) => {
      if (filter === "unread") return !notification.read;
      return true;
   });

   const unreadCount = notifications.filter((n) => !n.read).length;
   const totalCount = notifications.length;

   const handleMarkAllAsRead = async () => {
      if (unreadCount === 0) return;

      setIsLoading(true);
      try {
         const unreadIds = notifications
            .filter((n) => !n.read)
            .map((n) => n.id);

         if (markAsRead) {
            await Promise.all(unreadIds.map((id: string) => markAsRead(id)));
         } else {
            await fetch(`/api/notifications/mark-read`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ ids: unreadIds }),
            });
         }

         setLocalNotifications((prev) =>
            prev.map((p) => ({ ...p, read: true }))
         );
         toast.success(
            "You’re all caught up! All notifications marked as read."
         );
      } catch (e) {
         console.error(e);
         toast.error("Failed to mark notifications as read");
      } finally {
         setIsLoading(false);
      }
   };

   const handleClearAll = async () => {
      if (localNotifications.length === 0) return;
      setShowClearConfirm(true);
   };

   const handleMarkAsRead = async (notificationId: string) => {
      try {
         if (markAsRead) {
            await markAsRead(notificationId);
         } else {
            await fetch(`/api/notifications/mark-read`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ ids: [notificationId] }),
            });
         }
         setLocalNotifications((prev) =>
            prev.map((p) =>
               p.id === notificationId ? { ...p, read: true } : p
            )
         );
      } catch (e) {
         console.error(e);
         setLocalNotifications((prev) =>
            prev.map((p) =>
               p.id === notificationId ? { ...p, read: true } : p
            )
         );
         toast.info("Notification marked as read.");
      }
   };

   const handleDismiss = (notificationId: string) => {
      setLocalNotifications((prev) =>
         prev.filter((p) => p.id !== notificationId)
      );
      toast.success("Notification removed from your list.");
   };

   const getNotificationIcon = (type?: string) => {
      switch (type) {
         case "order":
            return "📦";
         case "promotion":
            return "🎁";
         case "system":
            return "⚙️";
         default:
            return "🔔";
      }
   };

   if (loading) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
            <div className="flex items-center justify-center min-h-[60vh]">
               <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">
                     Loading notifications...
                  </span>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
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
                     Notifications
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                     Your recent alerts and updates
                  </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
               <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
                     <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-800"
                     >
                        {unreadCount} unread
                     </Badge>
                     <div className="text-sm text-muted-foreground">
                        {totalCount} total
                     </div>
                  </div>

                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="outline"
                           size="sm"
                           className="h-9 border-gray-300"
                        >
                           <Filter className="h-4 w-4 mr-2" />
                           {filter === "all" ? "All" : "Unread"}
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent
                        align="end"
                        className="w-48"
                     >
                        <DropdownMenuItem onClick={() => setFilter("all")}>
                           <Eye className="h-4 w-4 mr-2" />
                           All Notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("unread")}>
                           <EyeOff className="h-4 w-4 mr-2" />
                           Unread Only
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
         </div>

         <Card className="border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-6">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-orange-800 text-lg sm:text-xl flex items-center">
                     <Bell className="h-5 w-5 mr-2" />
                     Notifications
                  </CardTitle>

                  <div className="flex items-center space-x-2">
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={unreadCount === 0 || isLoading}
                        onClick={handleMarkAllAsRead}
                        className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9"
                     >
                        {isLoading ? (
                           <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                        ) : (
                           <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        )}
                        Mark All Read
                     </Button>

                     <Button
                        variant="outline"
                        size="sm"
                        disabled={localNotifications.length === 0 || isLoading}
                        onClick={handleClearAll}
                        className="border-red-300 text-red-600 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9"
                     >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Clear All
                     </Button>
                     <AlertDialog
                        open={showClearConfirm}
                        onOpenChange={setShowClearConfirm}
                     >
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>
                                 Clear all notifications?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                 This will permanently delete all notifications
                                 and cannot be undone.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <div className="flex gap-3 justify-end">
                              <AlertDialogCancel
                                 onClick={() => setShowClearConfirm(false)}
                              >
                                 Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                 onClick={async () => {
                                    setShowClearConfirm(false);
                                    setIsLoading(true);
                                    try {
                                       if (clear) {
                                          await clear();
                                       } else {
                                          await fetch(
                                             `/api/notifications/clear`,
                                             {
                                                method: "POST",
                                                headers: {
                                                   "Content-Type":
                                                      "application/json",
                                                },
                                                body: JSON.stringify({
                                                   userId: user?.id,
                                                }),
                                             }
                                          );
                                       }
                                       setLocalNotifications([]);
                                       toast.success(
                                          "All notifications have been cleared."
                                       );
                                    } catch (e) {
                                       console.error(e);
                                       toast.error(
                                          "Failed to clear notifications"
                                       );
                                    } finally {
                                       setIsLoading(false);
                                    }
                                 }}
                              >
                                 Clear All
                              </AlertDialogAction>
                           </div>
                        </AlertDialogContent>
                     </AlertDialog>
                  </div>
               </div>
            </CardHeader>

            <CardContent className="p-0">
               <div className="divide-y max-h-[600px] overflow-auto">
                  {filteredNotifications.length === 0 ? (
                     <div className="py-12 text-center">
                        <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                           {filter === "unread"
                              ? "No unread notifications"
                              : "No notifications yet"}
                        </h3>
                        <p className="text-gray-600 text-sm max-w-sm mx-auto">
                           {filter === "unread"
                              ? "You're all caught up! Check back later for new updates."
                              : "You'll see important updates and alerts here when they arrive."}
                        </p>
                     </div>
                  ) : (
                     filteredNotifications.map((notification) => (
                        <div
                           key={notification.id}
                           className={`p-4 hover:bg-surface-secondary transition-colors ${
                              notification.read
                                 ? "opacity-70 bg-gray-50"
                                 : "bg-white"
                           }`}
                        >
                           <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                 </div>

                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                       <h4
                                          className={`font-semibold text-sm sm:text-base ${
                                             notification.read
                                                ? "text-gray-700"
                                                : "text-gray-900"
                                          }`}
                                       >
                                          {notification.title}
                                       </h4>
                                       {!notification.read && (
                                          <div className="flex-shrink-0 ml-2">
                                             <Badge
                                                variant="secondary"
                                                className="bg-blue-100 text-blue-800 text-xs"
                                             >
                                                New
                                             </Badge>
                                          </div>
                                       )}
                                    </div>

                                    {notification.body && (
                                       <div className="text-gray-600 text-sm mt-1">
                                          <div className="whitespace-pre-wrap">
                                             {notification.body}
                                          </div>
                                       </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2">
                                       <div className="text-xs text-muted-foreground">
                                          {(() => {
                                             try {
                                                if (!notification.created_at)
                                                   return "Recently";
                                                const date = new Date(
                                                   notification.created_at
                                                );
                                                if (isNaN(date.getTime()))
                                                   return "Recently";
                                                return date.toLocaleString(
                                                   "en-US",
                                                   {
                                                      month: "short",
                                                      day: "numeric",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                      year:
                                                         date.getFullYear() !==
                                                         new Date().getFullYear()
                                                            ? "numeric"
                                                            : undefined,
                                                   }
                                                );
                                             } catch (error) {
                                                console.error(
                                                   "Error formatting notification date:",
                                                   error
                                                );
                                                return "Recently";
                                             }
                                          })()}
                                       </div>

                                       <div className="flex items-center space-x-1">
                                          {!notification.read && (
                                             <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                   handleMarkAsRead(
                                                      notification.id
                                                   )
                                                }
                                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                             >
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Mark Read
                                             </Button>
                                          )}

                                          <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                <Button
                                                   variant="ghost"
                                                   size="sm"
                                                   className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                                                >
                                                   <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent
                                                align="end"
                                                className="w-48"
                                             >
                                                {!notification.read && (
                                                   <DropdownMenuItem
                                                      onClick={() =>
                                                         handleMarkAsRead(
                                                            notification.id
                                                         )
                                                      }
                                                   >
                                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                                      Mark as Read
                                                   </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                   onClick={() =>
                                                      handleDismiss(
                                                         notification.id
                                                      )
                                                   }
                                                >
                                                   <Trash2 className="h-4 w-4 mr-2" />
                                                   Dismiss
                                                </DropdownMenuItem>
                                             </DropdownMenuContent>
                                          </DropdownMenu>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </CardContent>
         </Card>

         {filteredNotifications.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-gray-50 rounded-lg">
               <div className="text-sm text-gray-600">
                  Showing {filteredNotifications.length} of {totalCount}{" "}
                  notifications
               </div>
               <div className="flex items-center space-x-2">
                  <Button
                     variant="outline"
                     size="sm"
                     disabled={unreadCount === 0 || isLoading}
                     onClick={handleMarkAllAsRead}
                     className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                     {isLoading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                     ) : (
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                     )}
                     Mark All Read
                  </Button>
               </div>
            </div>
         )}
      </div>
   );
};

export default RiderNotificationsPage;
