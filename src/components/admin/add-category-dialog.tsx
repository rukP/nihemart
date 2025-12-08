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
   createCategory,
   updateCategory,
} from "@/integrations/supabase/categories";
import {
   fetchSubcategories,
   createSubcategory,
   updateSubcategory,
   deleteSubcategory,
} from "@/integrations/supabase/subcategories";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Upload, X, Plus, Edit, Trash2 } from "lucide-react";
import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogAction,
   AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Category } from "@/integrations/supabase/categories";
import type { Subcategory } from "@/integrations/supabase/subcategories";

const categorySchema = z.object({
   name: z.string().min(2, "Category name must be at least 2 characters long."),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AddEditCategoryDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
   category?: Category | null;
}

const uploadFileToBucket = async (
   file: File,
   bucket: string
): Promise<string> => {
   const fileExt = file.name.split(".").pop();
   const fileName = `${Date.now()}.${fileExt}`;
   const { error } = await supabase.storage.from(bucket).upload(fileName, file);
   if (error) throw error;
   const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
   return data.publicUrl;
};

interface SelectedImage {
   url: string;
   file?: File;
   isExisting?: boolean;
}

export default function AddEditCategoryDialog({
   open,
   onOpenChange,
   onSuccess,
   category,
}: AddEditCategoryDialogProps) {
   const isEditMode = !!category;
   const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
      null
   );
   const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
   const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
   const [editingSubcategory, setEditingSubcategory] =
      useState<Subcategory | null>(null);
   const [confirmDeleteSubcategoryId, setConfirmDeleteSubcategoryId] = useState<
      string | null
   >(null);
   const [newSubcategoryName, setNewSubcategoryName] = useState("");

   const form = useForm<CategoryFormData>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: "" },
   });

   useEffect(() => {
      if (open) {
         if (isEditMode) {
            form.reset({
               name: category.name,
            });
            setSelectedImage(
               category.icon_url
                  ? { url: category.icon_url, isExisting: true }
                  : null
            );
            // Load subcategories for this category
            loadSubcategories();
         } else {
            form.reset({ name: "" });
            setSelectedImage(null);
            setSubcategories([]);
         }
      }
   }, [open, category, isEditMode, form]);

   const loadSubcategories = async () => {
      if (isEditMode && category) {
         try {
            const { data } = await fetchSubcategories({
               category_id: category.id,
            });
            setSubcategories(data);
         } catch (error) {
            console.error("Failed to load subcategories:", error);
            setSubcategories([]);
         }
      }
   };

   const onDrop = (files: File[]) => {
      if (files[0]) {
         // Revoke previous blob URL if it exists
         if (selectedImage && !selectedImage.isExisting) {
            URL.revokeObjectURL(selectedImage.url);
         }
         const file = files[0];
         const url = URL.createObjectURL(file);
         setSelectedImage({ url, file, isExisting: false });
      }
   };

   const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      accept: { "image/*": [] },
      multiple: false,
   });

   const handleAddSubcategory = async () => {
      if (!newSubcategoryName.trim() || !isEditMode || !category) return;

      try {
         await createSubcategory({
            name: newSubcategoryName.trim(),
            category_id: category.id,
         });
         setNewSubcategoryName("");
         setIsAddingSubcategory(false);
         await loadSubcategories();
      } catch (error) {
         console.error("Failed to add subcategory:", error);
         toast.error("Failed to add subcategory.");
      }
   };

   const handleEditSubcategory = async () => {
      if (!editingSubcategory || !newSubcategoryName.trim()) return;

      try {
         await updateSubcategory(editingSubcategory.id, {
            name: newSubcategoryName.trim(),
            category_id: editingSubcategory.category_id,
         });
         setNewSubcategoryName("");
         setEditingSubcategory(null);
         await loadSubcategories();
      } catch (error) {
         console.error("Failed to edit subcategory:", error);
         toast.error("Failed to edit subcategory.");
      }
   };

   const handleDeleteSubcategory = async (subcategoryId: string) => {
      // Ask for confirmation via dialog before deleting
      setConfirmDeleteSubcategoryId(subcategoryId);
   };

   const onSubmit = async (values: CategoryFormData) => {
      try {
         let iconUrl = "";
         if (selectedImage?.file) {
            iconUrl = await uploadFileToBucket(
               selectedImage.file,
               "category-images"
            );
         } else if (selectedImage?.isExisting) {
            iconUrl = selectedImage.url;
         }
         const categoryData = { name: values.name, icon_url: iconUrl };
         if (isEditMode) {
            await updateCategory(category.id, categoryData);
         } else {
            await createCategory(categoryData);
         }
         onSuccess();
      } catch (error) {
         console.error("Failed to save category:", error);
         toast.error(
            'Failed to save category. Please check if the "category-images" bucket exists and RLS policies allow uploads.'
         );
      }
   };

   return (
      <>
         <Dialog
            open={open}
            onOpenChange={onOpenChange}
         >
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>
                     {isEditMode ? "Edit Category" : "Add New Category"}
                  </DialogTitle>
               </DialogHeader>
               <Form {...form}>
                  <form
                     onSubmit={form.handleSubmit(onSubmit)}
                     className="space-y-6 py-4"
                  >
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                 <Input
                                    placeholder="e.g., Electronics"
                                    {...field}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />
                     <FormItem>
                        <FormLabel>Category Icon</FormLabel>
                        <FormControl>
                           <div
                              {...getRootProps()}
                              className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
                           >
                              <input {...getInputProps()} />
                              {selectedImage ? (
                                 <div className="relative w-32 h-32">
                                    <Image
                                       src={selectedImage.url}
                                       alt="Category icon"
                                       fill
                                       className="object-cover rounded-md"
                                    />
                                    <Button
                                       type="button"
                                       size="icon"
                                       variant="destructive"
                                       className="absolute -top-2 -right-2 h-6 w-6"
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          if (
                                             selectedImage &&
                                             !selectedImage.isExisting
                                          ) {
                                             URL.revokeObjectURL(
                                                selectedImage.url
                                             );
                                          }
                                          setSelectedImage(null);
                                       }}
                                    >
                                       <X className="h-3 w-3" />
                                    </Button>
                                 </div>
                              ) : (
                                 <div className="text-center">
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-600">
                                       Drop an image here, or click to select
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                       PNG, JPG, GIF up to 10MB
                                    </p>
                                 </div>
                              )}
                           </div>
                        </FormControl>
                        <FormMessage />
                     </FormItem>

                     {isEditMode && (
                        <div>
                           <div className="flex items-center justify-between mb-4">
                              <FormLabel>Subcategories</FormLabel>
                              <Button
                                 type="button"
                                 size="sm"
                                 onClick={() => setIsAddingSubcategory(true)}
                                 className="bg-blue-600 hover:bg-blue-700"
                              >
                                 <Plus className="mr-2 h-4 w-4" />
                                 Add Subcategory
                              </Button>
                           </div>

                           {isAddingSubcategory && (
                              <div className="flex gap-2 mb-4">
                                 <Input
                                    placeholder="Subcategory name"
                                    value={newSubcategoryName}
                                    onChange={(e) =>
                                       setNewSubcategoryName(e.target.value)
                                    }
                                    onKeyPress={(e) =>
                                       e.key === "Enter" &&
                                       handleAddSubcategory()
                                    }
                                 />
                                 <Button
                                    type="button"
                                    onClick={handleAddSubcategory}
                                    size="sm"
                                 >
                                    Add
                                 </Button>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                       setIsAddingSubcategory(false);
                                       setNewSubcategoryName("");
                                    }}
                                    size="sm"
                                 >
                                    Cancel
                                 </Button>
                              </div>
                           )}

                           {editingSubcategory && (
                              <div className="flex gap-2 mb-4">
                                 <Input
                                    placeholder="Subcategory name"
                                    value={newSubcategoryName}
                                    onChange={(e) =>
                                       setNewSubcategoryName(e.target.value)
                                    }
                                    onKeyPress={(e) =>
                                       e.key === "Enter" &&
                                       handleEditSubcategory()
                                    }
                                 />
                                 <Button
                                    type="button"
                                    onClick={handleEditSubcategory}
                                    size="sm"
                                 >
                                    Save
                                 </Button>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                       setEditingSubcategory(null);
                                       setNewSubcategoryName("");
                                    }}
                                    size="sm"
                                 >
                                    Cancel
                                 </Button>
                              </div>
                           )}

                           <div className="space-y-2 max-h-40 overflow-y-auto">
                              {subcategories.map((subcategory) => (
                                 <div
                                    key={subcategory.id}
                                    className="flex items-center justify-between p-2 border rounded"
                                 >
                                    <span>{subcategory.name}</span>
                                    <div className="flex gap-2">
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                             setEditingSubcategory(subcategory);
                                             setNewSubcategoryName(
                                                subcategory.name
                                             );
                                          }}
                                       >
                                          <Edit className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                             handleDeleteSubcategory(
                                                subcategory.id
                                             )
                                          }
                                          className="text-red-600 hover:text-red-700"
                                       >
                                          <Trash2 className="h-4 w-4" />
                                       </Button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <DialogFooter>
                        <Button
                           type="submit"
                           disabled={form.formState.isSubmitting}
                        >
                           {form.formState.isSubmitting
                              ? "Saving..."
                              : "Save Category"}
                        </Button>
                     </DialogFooter>
                  </form>
               </Form>
            </DialogContent>
         </Dialog>
         {confirmDeleteSubcategoryId && (
            <AlertDialog
               open={true}
               onOpenChange={(open: boolean) => {
                  if (!open) setConfirmDeleteSubcategoryId(null);
               }}
            >
               <AlertDialogContent>
                  <AlertDialogHeader>
                     <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
                     <AlertDialogDescription>
                        This action cannot be undone. Are you sure you want to
                        delete this subcategory?
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3 justify-end p-4">
                     <AlertDialogCancel
                        onClick={() => setConfirmDeleteSubcategoryId(null)}
                     >
                        Cancel
                     </AlertDialogCancel>
                     <AlertDialogAction
                        onClick={async () => {
                           const id = confirmDeleteSubcategoryId;
                           setConfirmDeleteSubcategoryId(null);
                           if (!id) return;
                           try {
                              await deleteSubcategory(id);
                              await loadSubcategories();
                              toast.success("Subcategory deleted");
                           } catch (error) {
                              console.error(
                                 "Failed to delete subcategory:",
                                 error
                              );
                              toast.error("Failed to delete subcategory.");
                           }
                        }}
                     >
                        Delete
                     </AlertDialogAction>
                  </div>
               </AlertDialogContent>
            </AlertDialog>
         )}
      </>
   );
}
