import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExternalOrder } from "@/integrations/supabase/external-orders";
import { orderKeys } from "@/hooks/useOrders";

export function useExternalOrders() {
   const queryClient = useQueryClient();

   const createExternalOrderMutation = useMutation({
      mutationFn: createExternalOrder,
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      },
   });

   return {
      createExternalOrder: createExternalOrderMutation,
   };
}
