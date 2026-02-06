import { authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

/**
 * Upload a file to the backend
 * @param file - The file to upload
 * @param category - Category of the file (e.g., 'product', 'rider', 'general')
 * @param entityType - Type of entity (e.g., 'product', 'rider')
 * @param entityId - ID of the entity (optional)
 * @returns The URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  category:
    | 'product'
    | 'rider'
    | 'general'
    | 'blog'
    | 'directorate' = 'general',
  entityType?: string,
  entityId?: string
): Promise<string> {
  const formData = new FormData();

  // Determine the correct endpoint and field name based on category
  let endpoint = '/uploads';
  let fieldName = 'file';

  if (category === 'product') {
    endpoint = '/uploads/products';
    fieldName = 'files'; // Backend expects 'files' array for products
    formData.append(fieldName, file);
  } else if (category === 'rider') {
    endpoint = '/uploads/riders';
    formData.append('file', file);
  } else if (category === 'general') {
    // Check if this is a category image upload
    if (entityType === 'category') {
      endpoint = '/uploads/categories';
    } else {
      endpoint = '/uploads'; // FIXED: Use general uploads endpoint for product description images
    }
    formData.append('file', file);
  } else {
    formData.append('file', file);
  }

  if (entityType) formData.append('entityType', entityType);
  if (entityId) formData.append('entityId', entityId);
  if (category) formData.append('category', category);

  // FIXED: Better error handling with detailed error messages
  try {
    const result = await handleApiRequest(() =>
      authorizedAPI.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );

    // Handle different response formats
    if (
      category === 'product' &&
      result.images &&
      Array.isArray(result.images)
    ) {
      // Product uploads return { images: [...] }
      const url = result.images[0]?.url || result.images[0]?.path || '';
      if (!url) {
        throw new Error('Upload succeeded but no image URL was returned');
      }
      return url;
    }

    // Return the full URL for general/category/rider uploads
    const url = result.url || result.path || '';
    if (!url) {
      throw new Error('Upload succeeded but no URL was returned');
    }
    return url;
  } catch (error: any) {
    // FIXED: Provide more specific error messages
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error?.error ||
      'Unknown upload error';

    // Check for specific error types
    if (error?.response?.status === 401) {
      throw new Error('Unauthorized: Please log in again');
    } else if (error?.response?.status === 403) {
      throw new Error("Forbidden: You don't have permission to upload files");
    } else if (error?.response?.status === 400) {
      throw new Error(`Invalid request: ${errorMessage}`);
    } else if (error?.response?.status === 500) {
      throw new Error(`Server error: ${errorMessage}`);
    }

    throw new Error(`Upload failed: ${errorMessage}`);
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  category:
    | 'product'
    | 'rider'
    | 'general'
    | 'blog'
    | 'directorate' = 'general',
  entityType?: string,
  entityId?: string
): Promise<string[]> {
  const uploadPromises = files.map(file =>
    uploadFile(file, category, entityType, entityId)
  );
  return Promise.all(uploadPromises);
}
