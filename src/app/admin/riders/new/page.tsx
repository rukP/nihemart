"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2, User, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const NewRiderPage = () => {
   const router = useRouter();
   const { session } = useAuth();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [fullName, setFullName] = useState("");
   const [phone, setPhone] = useState("");
   const [phoneDisplay, setPhoneDisplay] = useState<string>("");
   const [vehicle, setVehicle] = useState("");
   const [active, setActive] = useState(true);
   const [notes, setNotes] = useState("");
   const [location, setLocation] = useState("");
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [message, setMessage] = useState("");

   // Phone input helpers (match signup UX)
   const formatPhoneInput = (input: string) => {
      const cleaned = input.replace(/[^\d+]/g, "");
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.slice(4);
         if (digits.length <= 3) return `+250 ${digits}`;
         if (digits.length <= 6)
            return `+250 ${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `+250 ${digits.slice(0, 3)} ${digits.slice(
            3,
            6
         )} ${digits.slice(6, 9)}`;
      }
      if (cleaned.startsWith("07")) {
         const digits = cleaned;
         if (digits.length <= 3) return digits;
         if (digits.length <= 6)
            return `${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
            6,
            10
         )}`;
      }
      return cleaned;
   };

   const normalizePhone = (raw: string) => {
      if (!raw) return raw;
      const digits = raw.replace(/[^\d]/g, "");
      if (digits.length === 10 && digits.startsWith("07"))
         return `+250${digits.slice(1)}`;
      if (digits.length === 12 && digits.startsWith("250")) return `+${digits}`;
      if (raw.startsWith("+250")) return raw.replace(/[^\d+]/g, "");
      return raw;
   };

   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);
      if (formatted.startsWith("+250")) {
         if (formatted.replace(/[^\d]/g, "").length <= 12) {
            setPhoneDisplay(formatted);
            setPhone(normalizePhone(formatted));
         }
         return;
      }
      if (formatted.startsWith("07")) {
         if (formatted.replace(/[^\d]/g, "").length <= 10) {
            setPhoneDisplay(formatted);
            setPhone(normalizePhone(formatted));
         }
         return;
      }
      if (input.length <= 15) {
         setPhoneDisplay(formatted);
         setPhone(normalizePhone(formatted));
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setMessage("");

      if (loading) return;

      if (!email || !password) {
         setError("Email and password are required to create a rider account");
         return;
      }

      setLoading(true);
      try {
         // Optional: upload image to rider-images first
         let imageUrl: string | null = null;
         if (imageFile) {
            try {
               const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                     const result = reader.result as string;
                     resolve(result.split(",")[1] || result);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(imageFile);
               });

               const token = session?.access_token;
               if (token) {
                  const uploadRes = await fetch(
                     "/api/admin/upload-rider-image",
                     {
                        method: "POST",
                        headers: {
                           "Content-Type": "application/json",
                           Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                           filename: imageFile.name,
                           base64,
                        }),
                     }
                  );
                  const uploadJson = await uploadRes.json();
                  if (uploadRes.ok) imageUrl = uploadJson.url || null;
               } else {
                  // Fallback: client upload to rider-images
                  const filePath = `${Date.now()}-${imageFile.name}`;
                  const { error: upErr } = await (supabase as any).storage
                     .from("rider-images")
                     .upload(filePath, imageFile, { upsert: false });
                  if (!upErr) {
                     const { data } = (supabase as any).storage
                        .from("rider-images")
                        .getPublicUrl(filePath);
                     imageUrl = data?.publicUrl || null;
                  }
               }
            } catch (_) {
               // ignore upload failure; proceed without image
            }
         }

         const res = await fetch("/api/admin/create-rider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               full_name: fullName,
               phone,
               vehicle,
               email,
               password,
               active,
               image_url: imageUrl,
               location,
            }),
         });

         const data = await res.json();
         if (!res.ok) {
            const err = data?.error || "Failed to create rider";
            setError(err);
            toast.error(err);
            setLoading(false);
            return;
         }

         setMessage(
            "Rider created successfully. Rider can sign in with the email and password provided."
         );
         toast.success("Rider created");
         // reset
         setEmail("");
         setPassword("");
         setFullName("");
         setPhone("");
         setVehicle("");
         setLocation("");
         setImageFile(null);

         // redirect back to riders list immediately so query can refetch
         router.push("/admin/riders");
      } catch (err: any) {
         console.error(err);
         const msg = err?.message || "Failed to create rider";
         setError(msg);
         toast.error(msg);
      } finally {
         setLoading(false);
      }
   };

   return (
      <ScrollArea className="h-[calc(100vh-5rem)]">
         <div className="p-6 w-full mx-auto">
            <div className="mb-4">
               <Link
                  href="/admin/riders"
                  className="text-orange-500"
               >
                  ← Back to riders
               </Link>
            </div>

            <form onSubmit={handleSubmit}>
               <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-semibold">Create Rider</h1>
                  <div>
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/admin/riders")}
                        disabled={loading}
                     >
                        Cancel
                     </Button>
                  </div>
               </div>

               <div className="space-y-6">
                  {message && (
                     <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                           {message}
                        </AlertDescription>
                     </Alert>
                  )}
                  {error && (
                     <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                           {error}
                        </AlertDescription>
                     </Alert>
                  )}

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Rider Account
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <Label>Email *</Label>
                              <Input
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
                                 placeholder="rider@example.com"
                                 required
                                 disabled={loading}
                              />
                           </div>
                           <div>
                              <Label>Password *</Label>
                              <Input
                                 type="password"
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value)}
                                 placeholder="password (min 6 chars)"
                                 required
                                 disabled={loading}
                              />
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Rider Details
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <Label>Full Name</Label>
                              <Input
                                 value={fullName}
                                 onChange={(e) => setFullName(e.target.value)}
                                 placeholder="Full name"
                                 disabled={loading}
                              />
                           </div>
                           <div>
                              <Label>Phone</Label>
                              <div className="relative">
                                 <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                 <Input
                                    value={phoneDisplay || phone}
                                    onChange={handlePhoneChange}
                                    className="pl-10"
                                    placeholder="Phone number"
                                    disabled={loading}
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

                              {/* Notes removed from payload; kept UI hidden/unused */}

                              <div>
                                 <Label>Location</Label>
                                 <Input
                                    value={location}
                                    onChange={(e) =>
                                       setLocation(e.target.value)
                                    }
                                    placeholder="City / Area (admin only)"
                                    disabled={loading}
                                 />
                              </div>
                           </div>
                        </div>

                        <div>
                           <Label>Vehicle</Label>
                           <Select
                              value={vehicle}
                              onValueChange={(val) => setVehicle(val)}
                           >
                              <SelectTrigger
                                 className="w-full"
                                 disabled={loading}
                              >
                                 <SelectValue placeholder="Bike / Car / etc" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="Bike">Bike</SelectItem>
                                 <SelectItem value="Car">Car</SelectItem>
                                 <SelectItem value="Motorbike">
                                    Motorbike
                                 </SelectItem>
                                 <SelectItem value="Bicycle">
                                    Bicycle
                                 </SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        <div>
                           <Label>Image (optional, admin will upload)</Label>
                           <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                 setImageFile(e.target.files?.[0] || null)
                              }
                              disabled={loading}
                           />
                        </div>
                     </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                     <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/admin/riders")}
                        disabled={loading}
                     >
                        Cancel
                     </Button>
                     <Button
                        type="submit"
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700"
                     >
                        {loading ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                           </>
                        ) : (
                           "Create Rider"
                        )}
                     </Button>
                  </div>
               </div>
            </form>
         </div>
      </ScrollArea>
   );
};

export default NewRiderPage;
