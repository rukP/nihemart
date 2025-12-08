"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Order } from "@/types/orders";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

export default function OrderDetailsClient({ order }: { order: Order }) {
   const [open, setOpen] = useState(false);
   return (
      <div>
         <Button
            onClick={() => setOpen(true)}
            className="bg-orange-500 text-white"
         >
            Open order
         </Button>
         <OrderDetailsDialog
            open={open}
            onOpenChange={setOpen}
            order={order}
         />
      </div>
   );
}
