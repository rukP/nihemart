import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
   type ExternalOrderInput,
   createExternalOrder,
} from "../integrations/supabase/external-orders";
import { orderKeys } from "./useOrders";
import { toast } from "sonner";

export function useExternalOrders() {
   const queryClient = useQueryClient();

   const createExternalOrderMutation = useMutation({
      mutationFn: async (orderData: ExternalOrderInput) => {
         console.log(
            "External Order Mutation - Starting with data:",
            orderData
         );
         try {
            const result = await createExternalOrder(orderData);
            console.log("External Order Mutation - Success:", result);
            return result;
         } catch (error) {
            console.error("External Order Mutation - Error:", error);
            throw error;
         }
      },
      onSuccess: (data) => {
         console.log("External Order Mutation - onSuccess called with:", data);
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         if (data.id) {
            queryClient.setQueryData(orderKeys.detail(data.id), data);
         }
         toast.success("External order created successfully");
      },
      onError: (error: Error) => {
         console.error("External Order Mutation - onError:", error);
         toast.error(error.message || "Failed to create external order");
      },
   });

   return {
      createExternalOrder: createExternalOrderMutation,
   };
}
