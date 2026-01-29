import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProductBase,
  ProductVariation,
  ProductQueryOptions,
} from "@/lib/api/products";

import {
  fetchProductsPage,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api/products";

const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: ProductQueryOptions) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const useProducts = () => {
  const queryClient = useQueryClient();

  const useProductsQuery = (options: ProductQueryOptions = {}) => {
    return useQuery({
      queryKey: productKeys.list(options),
      queryFn: () => fetchProductsPage(options),
      staleTime: 1000 * 60 * 5, // 5 minutes - products don't change frequently
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache
      // Prefetch next page if pagination is used
      placeholderData: (previousData) => previousData,
    });
  };

  const createProductMutation = useMutation({
    mutationFn: ({
      product,
      variations,
    }: {
      product: ProductBase;
      variations?: ProductVariation[];
    }) => createProduct(product, variations),
    onSuccess: () => {
      // Invalidate all product lists and details
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      // Clear client-side store product cache to ensure clients fetch fresh data
      import("@/lib/api/products")
        .then((m) => m.clearStoreProductsCache())
        .catch(() => {});
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({
      id,
      product,
      variations,
    }: {
      id: string;
      product: Partial<ProductBase>;
      variations?: ProductVariation[];
    }) => updateProduct(id, product),
    onSuccess: (updatedProduct, { id }) => {
      // Optimistically update the cache
      queryClient.setQueryData(productKeys.detail(id), updatedProduct);
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      // Clear cached store products on client
      import("@/lib/api/products")
        .then((m) => m.clearStoreProductsCache())
        .catch(() => {});
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      // Clear client cache
      import("@/lib/api/products")
        .then((m) => m.clearStoreProductsCache())
        .catch(() => {});
    },
  });

  // Prefetch product by ID
  const prefetchProduct = (id: string) => {
    return queryClient.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn: async () => {
        // Import dynamically to avoid circular dependencies
        const { fetchStoreProductById } = await import("@/lib/api/store");
        return fetchStoreProductById(id);
      },
      staleTime: 1000 * 60 * 10, // 10 minutes for individual products
    });
  };

  return {
    useProducts: useProductsQuery,
    createProduct: createProductMutation,
    updateProduct: updateProductMutation,
    deleteProduct: deleteProductMutation,
    prefetchProduct,
  };
};
