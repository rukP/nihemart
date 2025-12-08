"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export interface BuyNowItem {
   id: string;
   product_id: string;
   name: string;
   price: number;
   quantity: number;
   image?: string;
   variant?: string;
}

interface BuyNowContextType {
   item: BuyNowItem | null;
   setBuyNowItem: (it: Omit<BuyNowItem, "id">) => void;
   clearBuyNowItem: () => void;
}

const KEY = "nihemart_buy_now_v1";

const BuyNowContext = createContext<BuyNowContextType | undefined>(undefined);

export const useBuyNow = () => {
   const ctx = useContext(BuyNowContext);
   if (!ctx) throw new Error("useBuyNow must be used within BuyNowProvider");
   return ctx;
};

export const BuyNowProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
}) => {
   const [item, setItem] = useState<BuyNowItem | null>(() => {
      try {
         if (typeof window === "undefined") return null;
         const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
         if (!raw) return null;
         return JSON.parse(raw) as BuyNowItem;
      } catch (e) {
         return null;
      }
   });

   useEffect(() => {
      try {
         if (item === null) {
            sessionStorage.removeItem(KEY);
            localStorage.removeItem(KEY);
         } else {
            // persist to sessionStorage for short-lived checkout flows
            sessionStorage.setItem(KEY, JSON.stringify(item));
         }
      } catch (e) {
         /* ignore */
      }
   }, [item]);

   const setBuyNowItem = (it: Omit<BuyNowItem, "id">) => {
      const id = `${it.product_id}-${Date.now()}`;
      setItem({ ...it, id });
   };

   const clearBuyNowItem = () => setItem(null);

   return (
      <BuyNowContext.Provider value={{ item, setBuyNowItem, clearBuyNowItem }}>
         {children}
      </BuyNowContext.Provider>
   );
};

export default BuyNowProvider;
