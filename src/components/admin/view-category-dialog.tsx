'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import type { Category } from '@/integrations/supabase/categories';
import type { Subcategory } from '@/integrations/supabase/subcategories';

interface ViewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  subcategories: Subcategory[];
  onAddSubcategory: () => void;
  onEditSubcategory: (subcategory: Subcategory) => void;
  onDeleteSubcategory: (id: string) => void;
}

export default function ViewCategoryDialog({
  open,
  onOpenChange,
  category,
  subcategories,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory
}: ViewCategoryDialogProps) {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Info */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 relative flex-shrink-0">
              {category.icon_url ? (
                <Image
                  src={category.icon_url}
                  alt={category.name}
                  fill
                  className="object-contain rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center">
                  <span className="text-2xl text-gray-400">📁</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {category.products_count || 0} products
              </p>
            </div>
          </div>

          {/* Subcategories Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium">Subcategories</h4>
              <Button onClick={onAddSubcategory} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Subcategory
              </Button>
            </div>

            {subcategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No subcategories found for this category.</p>
                <p className="text-sm">Click &quot;Add Subcategory&quot; to create one.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium">{subcategory.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSubcategory(subcategory)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSubcategory(subcategory.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}