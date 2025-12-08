"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2, User, Mail, Lock, Phone, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<
    "admin" | "user" | "rider" | "manager" | "stock_manager" | "staff"
  >("user");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Basic validation
      if (!email || !password) {
        setError("Email and password are required");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }

      // Rider-specific validation
      if (role === "rider" && !phone) {
        setError("Phone number is required for delivery riders");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("User created successfully!");
        toast.success("User created successfully!");
        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
        setPhone("");
        setRole("user");

        // Optional: redirect to users list after a delay
        setTimeout(() => {
          router.push("/admin/users");
        }, 1500);
      } else {
        const errorMessage = data.error || "Failed to create user";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <div className="p-6">
        <form onSubmit={handleCreateUser}>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Create New User</h1>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/users")}
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
                    Creating User...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="w-full mx-auto space-y-6">
            {/* Success/Error Messages */}
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

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Account Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min. 6 characters)"
                      className="pl-10"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Password must be at least 6 characters long
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* User Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  User Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">User Role</Label>
                  <Select
                    value={role}
                    onValueChange={(
                      value:
                        | "admin"
                        | "user"
                        | "rider"
                        | "manager"
                        | "stock_manager"
                        | "staff"
                    ) => setRole(value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">User</span>
                          <span className="text-sm text-gray-500">
                            Standard user with limited permissions
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="admin">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Administrator</span>
                          <span className="text-sm text-gray-500">
                            Full access to all system features
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="rider">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Rider</span>
                          <span className="text-sm text-gray-500">
                            Responsible for deliveries and order transportation
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="manager">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Manager</span>
                          <span className="text-sm text-gray-500">
                            Oversees operations and manages teams
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="stock_manager">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Stock Manager</span>
                          <span className="text-sm text-gray-500">
                            Handles inventory, stock updates, and warehouse
                            control
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="staff">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Staff</span>
                          <span className="text-sm text-gray-500">
                            Has access to orders, riders and refunds
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Description */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">
                    Selected Role:{" "}
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {role === "admin" &&
                      "Administrators have full access to all system features including user management, order management, and system settings."}
                    {role === "user" &&
                      "Users have access to basic features and can manage their own profile and orders."}
                    {role === "rider" &&
                      "Riders are responsible for deliveries and managing transportation of orders."}
                    {role === "manager" &&
                      "Managers oversee operations, teams, and are responsible for day-to-day activities."}
                    {role === "stock_manager" &&
                      "Stock Managers handle inventory, stock updates, and warehouse control."}
                    {role === "staff" &&
                      "Staff have access to orders, riders, and refunds."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{email || "Not provided"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Full Name:</span>
                  <span className="font-medium">
                    {fullName || "Not provided"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{phone || "Not provided"}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-semibold capitalize">{role}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </ScrollArea>
  );
}
