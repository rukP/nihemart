'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { Category } from '@/lib/api/categories';
import Image from 'next/image';
import { optimizeImageUrl } from '@/lib/utils';

interface CategoriesTableProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onView: (category: Category) => void;
  onDelete: (id: string) => void;
}

export default function CategoriesTable({
  categories,
  loading,
  onEdit,
  onView,
  onDelete,
}: CategoriesTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Icon</TableHead>
            <TableHead>Category Name</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Subcategories</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No categories found.
              </TableCell>
            </TableRow>
          ) : (
            categories.map(category => (
              <TableRow key={category.id}>
                <TableCell>
                  {(category as any).icon_url ||
                  category.iconUrl ||
                  category.iconUrl ? (
                    <div className="w-10 h-10 relative">
                      <Image
                        src={optimizeImageUrl(
                          (category as any).icon_url ||
                            category.iconUrl ||
                            category.iconUrl,
                          { width: 40, quality: 75 }
                        )}
                        alt={category.name}
                        fill
                        className="object-contain"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-md" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-right">
                  {(category as any).products_count || 0}
                </TableCell>
                <TableCell className="text-right">
                  {(category as any).subcategories_count ??
                    category.subcategories_count ??
                    0}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(category)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
