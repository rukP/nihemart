"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneField from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";

type Props = {
  open: boolean;
  rider: any | null;
  token?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditRiderDialog({
  open,
  rider,
  token,
  onClose,
  onSaved,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [active, setActive] = useState(true);
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (rider) {
      setFullName(rider.full_name || "");
      setPhone(rider.phone || "");
      setVehicle(rider.vehicle || "");
      setActive(typeof rider.active === "boolean" ? rider.active : true);
      setLocation(rider.location || "");
      setImagePreview(rider.image_url || null);
    } else {
      setFullName("");
      setPhone("");
      setVehicle("");
      setActive(true);
      setLocation("");
      setImagePreview(null);
    }
  }, [rider]);

  const handleSave = async () => {
    if (!rider) return;
    setIsSaving(true);
    try {
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
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

      const updates: any = {
        full_name: fullName,
        phone: phone || null,
        vehicle: vehicle || null,
        active: !!active,
        location: location || null,
      };
      if (imageUrl) updates.image_url = imageUrl;

      const res = await fetch("/api/admin/update-rider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ riderId: rider.id, updates }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update rider");
      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Rider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <Label>Phone</Label>
            <PhoneField
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>Active</Label>
            <div className="mt-2">
              <Switch
                checked={active}
                onCheckedChange={(v) => setActive(!!v)}
              />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <Label>Vehicle</Label>
            <Select value={vehicle} onValueChange={(v) => setVehicle(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Bike / Car / etc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bike">Bike</SelectItem>
                <SelectItem value="Car">Car</SelectItem>
                <SelectItem value="Motorbike">Motorbike</SelectItem>
                <SelectItem value="Bicycle">Bicycle</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Image (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] || null);
                if (e.target.files?.[0]) {
                  setImagePreview(URL.createObjectURL(e.target.files[0]));
                }
              }}
            />
            {imagePreview && (
              <Image
                src={optimizeImageUrl(imagePreview || "/placeholder.svg", {
                  width: 240,
                  quality: 75,
                })}
                alt="preview"
                className="mt-2 h-24 w-24 object-cover rounded"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
