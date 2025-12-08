"use client";
import React from "react";
import OrderItemRow from "./OrderItemRow";

export default function OrderItemsList({
   orderItems,
   onRemove,
}: {
   orderItems: any[];
   onRemove: (item: any) => void;
}) {
   return (
      <div className="max-h-60 sm:max-h-80 overflow-y-auto -mr-1 sm:-mr-2 pr-1 sm:pr-2">
         {orderItems.map((item, index) => (
            <OrderItemRow
               key={`${item.id}-${
                  item.variation_id || "no-variation"
               }-${index}`}
               item={item}
               onRemove={() => onRemove(item)}
            />
         ))}
      </div>
   );
}
