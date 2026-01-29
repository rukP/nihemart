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
import { useAuthStore } from "@/store/auth.store";
import { useCreateRider } from "@/hooks/useRiders";

const NewRiderPage = () => {
   const router = useRouter();
   const { session } = useAuth();
   const { token } = useAuthStore();
   const createRider = useCreateRider();
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
   const [isSubmitting, setIsSubmitting] = useState(false);
   const loading = isSubmitting || createRider.isPending;
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

      if (password.length < 6) {
         setError("Password must be at least 6 characters long");
         return;
      }

      setIsSubmitting(true);
      let imageUrl: string | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
         // Optional: upload image first
         if (imageFile) {
            try {
               const authToken = token;
               
               // Try backend upload API first (more reliable)
               const formData = new FormData();
               formData.append("file", imageFile);
               
               const uploadRes = await fetch("/api/uploads/riders", {
                  method: "POST",
                  headers: {
                     ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                  },
                  body: formData,
               });
               
               if (uploadRes.ok) {
                  const uploadJson = await uploadRes.json();
                  // Handle both response formats: { url: ... } or { data: { url: ... } }
                  imageUrl = uploadJson.url || uploadJson.data?.url || null;
                  if (imageUrl) {
                     console.log("Image uploaded successfully:", imageUrl);
                  } else {
                     console.warn("Image upload response missing URL:", uploadJson);
                  }
               } else {
                  const errorText = await uploadRes.text();
                  let errorJson;
                  try {
                     errorJson = JSON.parse(errorText);
                  } catch {
                     errorJson = { error: errorText };
                  }
                  console.warn("Image upload failed, continuing without image:", errorJson.error || errorText);
                  // Continue without image - don't block rider creation
               }
            } catch (uploadError) {
               console.warn("Image upload error, continuing without image:", uploadError);
               // Continue without image - don't block rider creation
            }
         }

         // Create rider
         const riderData = {
            email: email.trim(),
            password,
            fullName: fullName.trim() || undefined,
            phone: phone.trim() || undefined,
            vehicle: vehicle || undefined,
            imageUrl: imageUrl || undefined,
            location: location.trim() || undefined,
            active: active ?? true,
         };

         console.log("Creating rider with data:", { ...riderData, password: "***" });
         
         // Use mutation with proper error handling
         const result = await createRider.mutateAsync(riderData);
         
         console.log("Rider created successfully:", result);
         
         // Verify the rider was created with user account
         if (result && result.userId) {
            console.log("Rider user account created successfully, userId:", result.userId);
         } else {
            console.warn("Rider created but no userId - rider may not be able to login");
         }

         setMessage(
            "Rider created successfully. Rider can sign in with the email and password provided."
         );
         toast.success("Rider created successfully");
         
         // Reset form
         setEmail("");
         setPassword("");
         setFullName("");
         setPhone("");
         setPhoneDisplay("");
         setVehicle("");
         setLocation("");
         setImageFile(null);

         // Redirect back to riders list after a short delay
         setTimeout(() => {
            router.push("/admin/riders");
         }, 1000);
      } catch (err: any) {
         console.error("Rider creation error:", err);
         
         // Extract error message from various possible formats
         let errorMessage = "Failed to create rider";
         
         if (err?.response?.data?.message) {
            errorMessage = err.response.data.message;
         } else if (err?.response?.data?.error) {
            errorMessage = err.response.data.error;
         } else if (err?.message) {
            errorMessage = err.message;
         } else if (typeof err === 'string') {
            errorMessage = err;
         }
         
         setError(errorMessage);
         toast.error(errorMessage);
      } finally {
         if (timeoutId) clearTimeout(timeoutId);
         setIsSubmitting(false);
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
                           <Label>Image (optional)</Label>
                           <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                 setImageFile(e.target.files?.[0] || null)
                              }
                              disabled={loading}
                           />
                           {imageFile && (
                              <div className="mt-2">
                                 <img
                                    src={URL.createObjectURL(imageFile)}
                                    alt="Preview"
                                    className="w-24 h-24 object-cover rounded-md border"
                                 />
                              </div>
                           )}
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
