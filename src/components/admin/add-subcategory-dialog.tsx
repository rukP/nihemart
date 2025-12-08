"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   createSubcategory,
   updateSubcategory,
} from "@/integrations/supabase/subcategories";
import { toast } from "sonner";
import type { Subcategory } from "@/integrations/supabase/subcategories";
import type { Category } from "@/integrations/supabase/categories";

const subcategorySchema = z.object({
   name: z
      .string()
      .min(2, "Subcategory name must be at least 2 characters long."),
   category_id: z.string().min(1, "Please select a category."),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface AddEditSubcategoryDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
   subcategory?: Subcategory | null;
   categories: Category[];
}

export default function AddEditSubcategoryDialog({
   open,
   onOpenChange,
   onSuccess,
   subcategory,
   categories,
}: AddEditSubcategoryDialogProps) {
   const isEditMode = !!subcategory;

   const form = useForm<SubcategoryFormData>({
      resolver: zodResolver(subcategorySchema),
      defaultValues: { name: "", category_id: "" },
   });

   useEffect(() => {
      if (open) {
         if (isEditMode) {
            form.reset({
               name: subcategory.name,
               category_id: subcategory.category_id,
            });
         } else {
            form.reset({ name: "", category_id: "" });
         }
      }
   }, [open, subcategory, isEditMode, form]);

   const onSubmit = async (values: SubcategoryFormData) => {
      try {
         const subcategoryData = {
            name: values.name,
            category_id: values.category_id,
         };
         if (isEditMode) {
            await updateSubcategory(subcategory.id, subcategoryData);
         } else {
            await createSubcategory(subcategoryData);
         }
         onSuccess();
      } catch (error) {
         console.error("Failed to save subcategory:", error);
         toast.error("Failed to save subcategory. Please try again.");
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle>
                  {isEditMode ? "Edit Subcategory" : "Add New Subcategory"}
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
                              <Input
                                 placeholder="e.g., Smartphones"
                                 {...field}
                              />
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
                                 {categories.map((category) => (
                                    <SelectItem
                                       key={category.id}
                                       value={category.id}
                                    >
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
                     <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                     >
                        {form.formState.isSubmitting
                           ? "Saving..."
                           : "Save Subcategory"}
                     </Button>
                  </DialogFooter>
               </form>
            </Form>
         </DialogContent>
      </Dialog>
   );
}
