"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CategoriesTable from "@/components/admin/categories-table";
import ViewCategoryDialog from "@/components/admin/view-category-dialog";
import AddEditCategoryDialog from "@/components/admin/add-category-dialog";
import AddEditSubcategoryDialog from "@/components/admin/add-subcategory-dialog";
import {
  fetchCategories,
  deleteCategory,
} from "@/integrations/supabase/categories";
import {
  fetchSubcategories,
  deleteSubcategory,
} from "@/integrations/supabase/subcategories";
import type { Category } from "@/integrations/supabase/categories";
import type { Subcategory } from "@/integrations/supabase/subcategories";
import { useDebounce } from "@/hooks/use-debounce";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categorySubcategories, setCategorySubcategories] = useState<
    Subcategory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] =
    useState<Subcategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      // Request a large limit so the admin view shows all categories by default
      const { data } = await fetchCategories({
        search: debouncedSearchTerm,
        limit: 1000,
      });
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm]);

  const loadCategorySubcategories = useCallback(async (categoryId: string) => {
    try {
      const { data } = await fetchSubcategories({ category_id: categoryId });
      setCategorySubcategories(data);
    } catch (error) {
      console.error("Failed to fetch category subcategories:", error);
      setCategorySubcategories([]);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCategorySuccess = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    loadCategories();
  };

  const handleSubcategorySuccess = () => {
    setIsSubcategoryDialogOpen(false);
    setEditingSubcategory(null);
    // Refresh category subcategories if viewing a category
    if (viewingCategory) {
      loadCategorySubcategories(viewingCategory.id);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this category? This cannot be undone."
      )
    ) {
      try {
        await deleteCategory(id);
        loadCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    }
  };

  const handleViewCategory = async (category: Category) => {
    setViewingCategory(category);
    await loadCategorySubcategories(category.id);
    setIsViewDialogOpen(true);
  };

  const handleAddSubcategory = () => {
    if (!viewingCategory) return;
    setEditingSubcategory(null);
    setIsSubcategoryDialogOpen(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setIsSubcategoryDialogOpen(true);
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this subcategory? This cannot be undone."
      )
    ) {
      try {
        await deleteSubcategory(id);
        if (viewingCategory) {
          await loadCategorySubcategories(viewingCategory.id);
        }
      } catch (error) {
        console.error("Failed to delete subcategory:", error);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Categories & Subcategories
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage product categories and subcategories across your store.
          </p>
        </div>
        <Button
          onClick={handleAddCategory}
          className="sm:self-start flex items-center space-x-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-1/2 border-gray-300 rounded-md"
          />
        </div>
      </div>

      <CategoriesTable
        categories={categories}
        loading={loading}
        onEdit={handleEditCategory}
        onView={handleViewCategory}
        onDelete={handleDeleteCategory}
      />

      <ViewCategoryDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        category={viewingCategory}
        subcategories={categorySubcategories}
        onAddSubcategory={handleAddSubcategory}
        onEditSubcategory={handleEditSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory}
      />

      <AddEditCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSuccess={handleCategorySuccess}
        category={editingCategory}
      />

      <AddEditSubcategoryDialog
        open={isSubcategoryDialogOpen}
        onOpenChange={setIsSubcategoryDialogOpen}
        onSuccess={handleSubcategorySuccess}
        subcategory={editingSubcategory}
        categories={categories}
      />
    </div>
  );
}
