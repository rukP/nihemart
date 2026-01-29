"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { UserAvatarProfile } from "../user-avatar-profile";

interface CustomerDetailsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   customer: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
   };
}

export function CustomerDetailsDialog({
   open,
   onOpenChange,
   customer,
}: CustomerDetailsDialogProps) {
   const fullName = `${customer.firstName} ${customer.lastName}`.trim();

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
               <div className="flex items-center space-x-4">
                  <UserAvatarProfile
                     user={{ fullName, subTitle: customer.email }}
                     showInfo={false}
                  />
                  <div>
                     <h3 className="font-semibold">{fullName}</h3>
                     <p className="text-sm text-muted-foreground">
                        {customer.email}
                     </p>
                  </div>
               </div>
               <div className="grid gap-4">
                  <div>
                     <Label>Contact Information</Label>
                     <div className="mt-2 space-y-2">
                        <div>
                           <span className="text-sm font-medium">Email: </span>
                           <span className="text-sm text-muted-foreground">
                              {customer.email}
                           </span>
                        </div>
                        {customer.phone && (
                           <div>
                              <span className="text-sm font-medium">
                                 Phone:{" "}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                 {customer.phone}
                              </span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}
