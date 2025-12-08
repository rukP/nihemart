"use client";
import { useMemo } from "react";

type Args = {
   orderItems: any[];
   sectors: any[];
   sectorsFees: Record<string, number> | any;
   selectedAddress: any | null;
   selectedSector: string | null;
   hasAddress: boolean;
};

export default function useCheckoutTotals({
   orderItems,
   sectors,
   sectorsFees,
   selectedAddress,
   selectedSector,
   hasAddress,
}: Args) {
   return useMemo(() => {
      const subtotal = orderItems.reduce(
         (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
         0
      );

      const selectedSectorObj = sectors.find(
         (s: any) => s.sct_id === selectedSector
      );

      const sectorFee = selectedSectorObj
         ? (sectorsFees as any)[selectedSectorObj.sct_name]
         : undefined;
      const transport = sectorFee ?? (hasAddress ? 1000 : 0);
      const total = subtotal + transport;

      return { subtotal, selectedSectorObj, transport, total };
   }, [
      orderItems,
      sectors,
      sectorsFees,
      selectedAddress,
      selectedSector,
      hasAddress,
   ]);
}
