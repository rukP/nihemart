'use client';

import { FC, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import _userAPI, { type AppRole, type UserRow } from '@/lib/api/users';
import { roleAccessMap, type AdminSection } from '@/lib/rbac';
import { useUsers } from '@/hooks/useUsers';

const ROLECOLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  manager: 'bg-purple-100 text-purple-800 border-purple-200',
  stock_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  staff: 'bg-green-100 text-green-800 border-green-200',
  rider: 'bg-orange-100 text-orange-800 border-orange-200',
  user: 'bg-gray-100 text-gray-800 border-gray-200',
};

const ROLELABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  stock_manager: 'Stock Manager',
  staff: 'Staff',
  rider: 'Rider',
  user: 'User',
};

const ALLROLES: AppRole[] = [
  'admin',
  'manager',
  'stock_manager',
  'staff',
  'rider',
  'user',
];
const ADMINSECTIONS: AdminSection[] = [
  'dashboard',
  'transactions',
  'users',
  'products',
  'orders',
  'refunds',
  'sales',
  'stock',
  'riders',
  'settings',
];

const SECTIONLABELS: Record<AdminSection, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  users: 'Users',
  products: 'Products',
  orders: 'Orders',
  refunds: 'Refunds',
  sales: 'Sales',
  stock: 'Stock',
  riders: 'Riders',
  settings: 'Settings',
};

const UserRolesPermissionsPage: FC = () => {
  const { users, loading, updateUserRole, deleteUser } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [updating, setUpdating] = useState(false);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => {
      const fullName = (
        (user as any).full_name ||
        user.fullName ||
        ''
      ).toLowerCase();
      return (
        user.email.toLowerCase().includes(query) ||
        fullName.includes(query) ||
        user.roles?.some(r => ROLELABELS[r].toLowerCase().includes(query))
      );
    });
  }, [users, searchQuery]);

  // Calculate role statistics
  const roleStats = useMemo(() => {
    const stats: Record<AppRole, number> = {
      admin: 0,
      manager: 0,
      stock_manager: 0,
      staff: 0,
      rider: 0,
      user: 0,
    };

    users.forEach(user => {
      if (user.roles && user.roles.length > 0) {
        user.roles.forEach(role => {
          stats[role] = (stats[role] || 0) + 1;
        });
      } else {
        stats.user += 1;
      }
    });

    return stats;
  }, [users]);

  const handleEditRole = (user: UserRow) => {
    setSelectedUser(user);
    setNewRole(user.roles && user.roles.length > 0 ? user.roles[0] : 'user');
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      await updateUserRole(selectedUser.id, newRole);
      toast.success(`Role updated successfully for ${selectedUser.email}`);
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;

    try {
      await deleteUser(userId);
      toast.success('User deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <ProtectedRoute requiredSection="users">
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="flex min-w-0 flex-col px-2 py-10 xs:px-5 sm:px-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Shield className="h-8 w-8" />
              User Roles & Permissions
            </h1>
            <p className="text-muted-foreground">
              Manage user roles and their access permissions across the admin
              dashboard
            </p>
          </div>

          {/* Role Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {ALLROLES.map(role => (
              <Card key={role}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {ROLELABELS[role]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {roleStats[role] || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">users</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Permissions Matrix */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissions Matrix
                </CardTitle>
                <CardDescription>
                  View which roles can access which admin sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        {ALLROLES.map(role => (
                          <TableHead key={role} className="text-center">
                            {ROLELABELS[role]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ADMINSECTIONS.map(section => (
                        <TableRow key={section}>
                          <TableCell className="font-medium">
                            {SECTIONLABELS[section]}
                          </TableCell>
                          {ALLROLES.map(role => {
                            const hasAccess =
                              roleAccessMap[section].includes(role);
                            return (
                              <TableCell key={role} className="text-center">
                                {hasAccess ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Role Descriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Role Descriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge className={ROLECOLORS.admin} variant="outline">
                    Admin
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Full access to all sections and system settings
                  </p>
                </div>
                <div>
                  <Badge className={ROLECOLORS.manager} variant="outline">
                    Manager
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Full access to all sections except system settings
                  </p>
                </div>
                <div>
                  <Badge className={ROLECOLORS.stock_manager} variant="outline">
                    Stock Manager
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Can access stock, orders, refunds, and riders
                  </p>
                </div>
                <div>
                  <Badge className={ROLECOLORS.staff} variant="outline">
                    Staff
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Can access orders, refunds, and riders
                  </p>
                </div>
                <div>
                  <Badge className={ROLECOLORS.rider} variant="outline">
                    Rider
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Delivery personnel with limited access
                  </p>
                </div>
                <div>
                  <Badge className={ROLECOLORS.user} variant="outline">
                    User
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Regular customer with no admin access
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users & Roles</CardTitle>
                  <CardDescription>
                    Manage roles for all users in the system
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => {
                        const fullName =
                          (user as any).full_name || user.fullName || 'N/A';
                        const createdAt =
                          (user as any).created_at || user.createdAt;
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {fullName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {user.roles && user.roles.length > 0 ? (
                                  user.roles.map(role => (
                                    <Badge
                                      key={role}
                                      className={ROLECOLORS[role]}
                                      variant="outline"
                                    >
                                      {ROLELABELS[role]}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    className={ROLECOLORS.user}
                                    variant="outline"
                                  >
                                    {ROLELABELS.user}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {createdAt
                                ? new Date(createdAt).toLocaleDateString()
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRole(user)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteUser(user.id, user.email)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Role Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>
                  Update the role for {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Role</label>
                  <Select
                    value={newRole}
                    onValueChange={value => setNewRole(value as AppRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLELABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newRole && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Access Permissions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ADMINSECTIONS.filter(section =>
                        roleAccessMap[section].includes(newRole)
                      ).map(section => (
                        <Badge
                          key={section}
                          variant="secondary"
                          className="text-xs"
                        >
                          {SECTIONLABELS[section]}
                        </Badge>
                      ))}
                      {ADMINSECTIONS.filter(section =>
                        roleAccessMap[section].includes(newRole)
                      ).length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          No admin section access
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateRole} disabled={updating}>
                  {updating ? 'Updating...' : 'Update Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </ProtectedRoute>
  );
};

export default UserRolesPermissionsPage;
