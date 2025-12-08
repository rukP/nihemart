"use client";
import React, { useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
   open: boolean;
   rider: any;
   token?: string;
   onClose: () => void;
   onSaved: () => void;
};

export default function EditRiderMediaDialog({
   open,
   rider,
   token,
   onClose,
   onSaved,
}: Props) {
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [location, setLocation] = useState<string>(
      String(rider?.location || "")
   );
   const [isSaving, setIsSaving] = useState(false);

   const handleSave = async () => {
      try {
         setIsSaving(true);
         let imageUrl: string | undefined = undefined;

         if (imageFile) {
            // Upload to rider-images bucket
            const filePath = `${Date.now()}-${imageFile.name}`;
            const { error: upErr } = await (supabase as any).storage
               .from("rider-images")
               .upload(filePath, imageFile, { upsert: false });
            if (upErr) throw upErr;
            const { data } = (supabase as any).storage
               .from("rider-images")
               .getPublicUrl(filePath);
            imageUrl = data?.publicUrl;
         }

         const res = await fetch("/api/admin/update-rider-media", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ riderId: rider.id, imageUrl, location }),
         });
         const j = await res.json();
         if (!res.ok) {
            throw new Error(j.error || "Failed to update rider media");
         }
         onSaved();
      } catch (e: any) {
         console.error(e);
         toast.error(e?.message || String(e));
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={(v: boolean) => !v && onClose()}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Edit rider image and location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
               <div>
                  <Label>Image</Label>
                  <Input
                     type="file"
                     accept="image/*"
                     onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
               </div>
               <div>
                  <Label>Location</Label>
                  <Input
                     value={location}
                     onChange={(e) => setLocation(e.target.value)}
                     placeholder="e.g., Kigali, Kicukiro"
                  />
               </div>
            </div>
            <DialogFooter>
               <div className="flex gap-2 justify-end w-full">
                  <Button
                     variant="ghost"
                     onClick={onClose}
                     disabled={isSaving}
                  >
                     Cancel
                  </Button>
                  <Button
                     onClick={handleSave}
                     disabled={isSaving}
                  >
                     {isSaving ? "Saving..." : "Save"}
                  </Button>
               </div>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
