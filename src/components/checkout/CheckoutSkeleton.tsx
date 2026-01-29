"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutSkeleton() {
   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
         </div>

         <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
               {/* Contact Information */}
               <Card>
                  <CardHeader>
                     <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                     </div>
                     <Skeleton className="h-10 w-full" />
                  </CardContent>
               </Card>

               {/* Delivery Address */}
               <Card>
                  <CardHeader>
                     <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <Skeleton className="h-10 w-full" />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                     </div>
                     <Skeleton className="h-24 w-full" />
                  </CardContent>
               </Card>

               {/* Payment Method */}
               <Card>
                  <CardHeader>
                     <Skeleton className="h-6 w-36" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                  </CardContent>
               </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
               <Card className="sticky top-4">
                  <CardHeader>
                     <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {/* Order Items */}
                     <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                     </div>
                     <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex justify-between">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                           <Skeleton className="h-5 w-16" />
                           <Skeleton className="h-5 w-24" />
                        </div>
                     </div>
                     <Skeleton className="h-12 w-full mt-4" />
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
}
