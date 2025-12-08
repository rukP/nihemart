'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import type { Subcategory } from '@/integrations/supabase/subcategories';

interface SubcategoriesTableProps {
  subcategories: Subcategory[];
  loading: boolean;
  onEdit: (subcategory: Subcategory) => void;
  onDelete: (id: string) => void;
}

export default function SubcategoriesTable({ subcategories, loading, onEdit, onDelete }: SubcategoriesTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subcategory Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">Loading...</TableCell>
            </TableRow>
          ) : subcategories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">No subcategories found.</TableCell>
            </TableRow>
          ) : (
            subcategories.map((subcategory) => (
              <TableRow key={subcategory.id}>
                <TableCell className="font-medium">{subcategory.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(subcategory)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(subcategory.id)}>
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