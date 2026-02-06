import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  getCategoriesLight,
  getCategoriesWithSubcategories,
  getSubcategories,
  type Category,
  type CategoryLight,
  type CategoryWithSubcategories,
  type Subcategory,
} from '@/lib/api/categories';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  light: () => [...categoryKeys.all, 'light'] as const,
  withSubcategories: () => [...categoryKeys.all, 'withSubcategories'] as const,
  subcategories: (categoryId?: string) =>
    [...categoryKeys.all, 'subcategories', categoryId] as const,
};

/**
 * Hook to get all categories (public)
 * Categories change infrequently, so we cache them for a long time
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: categoryKeys.lists(),
    queryFn: getCategories,
    staleTime: 1000 * 60 * 30, // 30 minutes - categories rarely change
    gcTime: 1000 * 60 * 60, // 1 hour - keep in cache longer
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook to get lightweight categories list (public)
 */
export function useCategoriesLight() {
  return useQuery<CategoryLight[]>({
    queryKey: categoryKeys.light(),
    queryFn: getCategoriesLight,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook to get categories with subcategories (public)
 */
export function useCategoriesWithSubcategories() {
  return useQuery<CategoryWithSubcategories[]>({
    queryKey: categoryKeys.withSubcategories(),
    queryFn: getCategoriesWithSubcategories,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook to get subcategories for a category (public)
 */
export function useSubcategories(categoryId?: string) {
  return useQuery<Subcategory[]>({
    queryKey: categoryKeys.subcategories(categoryId),
    queryFn: () => getSubcategories(categoryId),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook for category actions (invalidation, prefetching)
 */
export function useCategoryActions() {
  const queryClient = useQueryClient();

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  };

  const prefetchCategory = async (categoryId: string) => {
    // Prefetch subcategories when hovering over a category
    await queryClient.prefetchQuery({
      queryKey: categoryKeys.subcategories(categoryId),
      queryFn: () => getSubcategories(categoryId),
      staleTime: 1000 * 60 * 30,
    });
  };

  return {
    invalidateCategories,
    prefetchCategory,
  };
}
