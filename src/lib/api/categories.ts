import { unauthorizedAPI, authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

export interface Category {
  id: string;
  name: string;
  iconUrl?: string;
  icon_url?: string; // Backend returns snake_case
  products_count?: number; // Backend includes product count
  subcategories_count?: number; // FIXED: Backend includes subcategory count
  createdAt?: string;
  created_at?: string; // Backend returns snake_case
  updatedAt?: string;
  updated_at?: string; // Backend returns snake_case
}

export interface CategoryLight {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  category_id?: string; // Backend may return snake_case
  category?: Category;
  createdAt?: string;
  created_at?: string; // Backend may return snake_case
  updatedAt?: string;
  updated_at?: string; // Backend may return snake_case
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

/**
 * Get all categories (public)
 */
export async function getCategories(): Promise<Category[]> {
  const response = await handleApiRequest(() =>
    unauthorizedAPI.get('/categories')
  );
  // Backend returns array directly for /categories endpoint
  if (Array.isArray(response)) {
    return response;
  }
  return response.categories || response.data || [];
}

/**
 * Get lightweight categories list
 */
export async function getCategoriesLight(): Promise<CategoryLight[]> {
  const response = await handleApiRequest(() =>
    unauthorizedAPI.get('/categories/light')
  );
  return response.categories || response.data || [];
}

/**
 * Get categories with subcategories
 */
export async function getCategoriesWithSubcategories(): Promise<
  CategoryWithSubcategories[]
> {
  const response = await handleApiRequest(() =>
    unauthorizedAPI.get('/categories/with-subcategories')
  );
  return response.categories || response.data || [];
}

/**
 * Get subcategories (admin)
 * @param categoryId - Optional category ID to filter subcategories
 */
export async function getSubcategories(
  categoryId?: string
): Promise<Subcategory[]> {
  const response = await handleApiRequest(() =>
    authorizedAPI.get('/categories/admin')
  );
  // Extract subcategories from categories
  const categories = response.categories || response.data || [];
  const subcategories: Subcategory[] = [];
  categories.forEach((cat: CategoryWithSubcategories) => {
    if (cat.subcategories) {
      subcategories.push(...cat.subcategories);
    }
  });

  // Filter by categoryId if provided
  if (categoryId) {
    return subcategories.filter(sub => sub.categoryId === categoryId);
  }

  return subcategories;
}

/**
 * Fetch subcategories with optional filter (admin)
 * FIXED: Use /categories/with-subcategories endpoint which is proven to work (as mentioned by user)
 * Filter by category_id on the frontend since the admin endpoint has route matching issues
 */
export async function fetchSubcategories(options?: {
  category_id?: string;
}): Promise<{ data: Subcategory[] }> {
  try {
    // FIXED: Use /categories/with-subcategories which works reliably (as confirmed by user)
    // This endpoint returns { categories: [...], subcategories: [...] }
    console.log(
      '[fetchSubcategories] Fetching from /categories/with-subcategories'
    );

    const response = await handleApiRequest(() =>
      unauthorizedAPI.get('/categories/with-subcategories')
    );
    console.log('[fetchSubcategories] Response structure:', {
      hasCategories: !!response.categories,
      hasSubcategories: !!response.subcategories,
      categoriesCount: response.categories?.length,
      subcategoriesCount: response.subcategories?.length,
    });

    // FIXED: Extract subcategories from the response
    // Response format: { categories: [...], subcategories: [...] }
    let allSubcategories: Subcategory[] = [];

    if (response?.subcategories && Array.isArray(response.subcategories)) {
      // Direct subcategories array
      allSubcategories = response.subcategories;
    } else if (response?.categories && Array.isArray(response.categories)) {
      // Extract subcategories from categories array (nested structure)
      response.categories.forEach((cat: any) => {
        if (cat.subcategories && Array.isArray(cat.subcategories)) {
          allSubcategories.push(...cat.subcategories);
        }
      });
    }

    // FIXED: Filter by category_id if provided
    let filteredSubcategories = allSubcategories;
    if (options?.category_id) {
      filteredSubcategories = allSubcategories.filter(
        (sub: any) =>
          sub.categoryId === options.category_id ||
          sub.category_id === options.category_id ||
          (sub.category && sub.category.id === options.category_id)
      );
      console.log(
        `[fetchSubcategories] Filtered to ${filteredSubcategories.length} subcategories for category ${options.category_id}`
      );
    }

    // FIXED: Transform backend response to match Subcategory interface
    const transformedSubcategories = filteredSubcategories.map((sub: any) => ({
      id: sub.id,
      name: sub.name,
      categoryId: sub.categoryId || sub.category_id || sub.category?.id,
      category_id: sub.category_id || sub.categoryId || sub.category?.id,
      category: sub.category,
      createdAt: sub.created_at || sub.createdAt,
      created_at: sub.created_at || sub.createdAt,
      updatedAt: sub.updated_at || sub.updatedAt,
      updated_at: sub.updated_at || sub.updatedAt,
    }));

    console.log(
      '[fetchSubcategories] Final result:',
      transformedSubcategories.length,
      'subcategories'
    );
    return { data: transformedSubcategories };
  } catch (error: any) {
    console.error('[fetchSubcategories] Error fetching subcategories:', error);

    // Return empty array on any error
    return { data: [] };
  }
}

/**
 * Fetch categories (admin)
 */
export async function fetchCategories(options?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Category[]> {
  try {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    const response = await handleApiRequest(() =>
      authorizedAPI.get(
        `/categories/admin${queryString ? `?${queryString}` : ''}`
      )
    );

    // Backend returns { data: Category[], count, page, limit } for admin endpoint
    // or array directly for public endpoint
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    // Fallback: try public endpoint
    return getCategories();
  } catch (_error) {
    console.error('Error fetching categories:', _error);
    // Fallback to public endpoint if admin endpoint fails
    return getCategories();
  }
}

/**
 * Create category (admin)
 */
export async function createCategory(data: {
  name: string;
  iconUrl?: string;
}): Promise<Category> {
  return handleApiRequest(() => authorizedAPI.post('/categories/admin', data));
}

/**
 * Update category (admin)
 */
export async function updateCategory(
  id: string,
  data: { name?: string; iconUrl?: string }
): Promise<Category> {
  return handleApiRequest(() =>
    authorizedAPI.put(`/categories/admin/${id}`, data)
  );
}

/**
 * Delete category (admin)
 */
export async function deleteCategory(id: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.delete(`/categories/admin/${id}`)
  );
}

/**
 * Create subcategory (admin)
 */
export async function createSubcategory(data: {
  name: string;
  categoryId: string;
}): Promise<Subcategory> {
  // Note: This might need to be implemented in backend
  // For now, we'll use a generic endpoint
  return handleApiRequest(() =>
    authorizedAPI.post('/categories/admin/subcategories', data)
  );
}

/**
 * Update subcategory (admin)
 */
export async function updateSubcategory(
  id: string,
  data: { name?: string; categoryId?: string }
): Promise<Subcategory> {
  return handleApiRequest(() =>
    authorizedAPI.put(`/categories/admin/subcategories/${id}`, data)
  );
}

/**
 * Delete subcategory (admin)
 */
export async function deleteSubcategory(id: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.delete(`/categories/admin/subcategories/${id}`)
  );
}
