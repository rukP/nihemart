'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Trash2,
  UserCog,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Define the Customer type
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orderCount: number;
  totalSpend: number;
  status: 'Active' | 'Inactive' | 'VIP';
  role?: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  registeredDate?: string;
}

// Helper function for name initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Role badge colors
const ROLECOLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  manager:
    'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  stock_manager: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  staff: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  rider: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  user: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
};

const getRoleLabel = (role?: string) => {
  if (!role) return 'User';
  const roleMap: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    stock_manager: 'Stock Manager',
    staff: 'Staff',
    rider: 'Rider',
    user: 'User',
  };
  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
};

// Define and export the columns
export const createCustomerColumns = (
  handleViewCustomer: (customer: Customer) => void,
  handleToggleAdmin?: (
    customerId: string,
    makeAdmin?: boolean
  ) => Promise<void>,
  handleDelete?: (customerId: string) => Promise<void>
): ColumnDef<Customer>[] => [
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => {
      const customer = row.original;
      const name = customer.name || customer.email;
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">
              {customer.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      const roleKey = role?.toLowerCase() || 'user';
      return (
        <Badge
          className={cn('font-medium', ROLECOLORS[roleKey] || ROLECOLORS.user)}
          variant="outline"
        >
          {getRoleLabel(role)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: 'Contact',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string;
      return (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className={cn(!phone && 'text-muted-foreground')}>
            {phone || 'N/A'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'registeredDate',
    header: 'Registered',
    cell: ({ row }) => {
      const date = row.getValue('registeredDate') as string;
      if (!date) return <span className="text-muted-foreground">N/A</span>;
      return (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'orderCount',
    header: 'Orders',
    cell: ({ row }) => {
      const count = row.getValue('orderCount') as number;
      return (
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{count || 0}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalSpend',
    header: 'Total Spend',
    cell: ({ row }) => {
      const amount = Number(row.getValue('totalSpend') || 0);
      const formatted = new Intl.NumberFormat('en-RW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
      return (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-700">{formatted} RWF</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusConfig = {
        Active: {
          color: 'bg-green-100 text-green-800 border-green-200',
          dot: 'bg-green-500',
        },
        Inactive: {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dot: 'bg-gray-500',
        },
        VIP: {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dot: 'bg-yellow-500',
        },
      };
      const config =
        statusConfig[status as keyof typeof statusConfig] ||
        statusConfig.Active;
      return (
        <Badge className={cn('font-medium', config.color)} variant="outline">
          <span className={cn('h-2 w-2 rounded-full mr-2', config.dot)} />
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View Details</span>
            </DropdownMenuItem>
            {handleToggleAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    const makeAdmin = customer.status !== 'VIP';
                    await handleToggleAdmin(customer.id, makeAdmin);
                  }}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>
                    {customer.status === 'VIP' ? 'Revoke Admin' : 'Make Admin'}
                  </span>
                </DropdownMenuItem>
              </>
            )}
            {handleDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={async () => {
                    if (
                      confirm(
                        `Are you sure you want to delete ${customer.name}?`
                      )
                    ) {
                      await handleDelete(customer.id);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete User</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
