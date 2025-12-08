import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
   fetchProductsPage,
   createProduct,
   updateProduct,
   deleteProduct,
   type Product,
   type ProductBase,
   type ProductVariation,
   type ProductQueryOptions,
} from "@/integrations/supabase/products";

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
         queryClient.invalidateQueries({ queryKey: productKeys.lists() });
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
      onSuccess: (_, { id }) => {
         queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
         queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      },
   });

   const deleteProductMutation = useMutation({
      mutationFn: deleteProduct,
      onSuccess: (_, id) => {
         queryClient.invalidateQueries({ queryKey: productKeys.lists() });
         queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      },
   });

   return {
      useProducts: useProductsQuery,
      createProduct: createProductMutation,
      updateProduct: updateProductMutation,
      deleteProduct: deleteProductMutation,
   };
};
