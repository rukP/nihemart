'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createSubcategory,
  updateSubcategory,
  type Subcategory,
  type Category,
} from '@/lib/api/categories';
import { toast } from 'sonner';

const subcategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Subcategory name must be at least 2 characters long.'),
  category_id: z.string().min(1, 'Please select a category.'),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface AddEditSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subcategory?: Subcategory | null;
  categories: Category[];
  defaultCategoryId?: string; // FIXED: Allow pre-selecting a category (e.g., when adding from view dialog)
}

export default function AddEditSubcategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  subcategory,
  categories,
  defaultCategoryId, // FIXED: Pre-select category when adding from view dialog
}: AddEditSubcategoryDialogProps) {
  const isEditMode = !!subcategory;

  const form = useForm<SubcategoryFormData>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: { name: '', category_id: defaultCategoryId || '' }, // FIXED: Use defaultCategoryId
  });

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.reset({
          name: subcategory.name,
          category_id:
            subcategory.categoryId || (subcategory as any).category_id,
        });
      } else {
        // FIXED: Pre-select the default category when adding (e.g., from view dialog)
        form.reset({
          name: '',
          category_id: defaultCategoryId || '',
        });
      }
    }
  }, [open, subcategory, isEditMode, defaultCategoryId, form]);

  const onSubmit = async (values: SubcategoryFormData) => {
    try {
      const subcategoryData = {
        name: values.name,
        category_id: values.category_id,
      };
      if (isEditMode) {
        await updateSubcategory(subcategory.id, subcategoryData);
      } else {
        await createSubcategory({
          name: subcategoryData.name,
          categoryId: subcategoryData.category_id,
        });
      }
      onSuccess();
    } catch (_error) {
      console.error('Failed to save subcategory:', _error);
      toast.error('Failed to save subcategory. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Subcategory' : 'Add New Subcategory'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Smartphones" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Subcategory'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
