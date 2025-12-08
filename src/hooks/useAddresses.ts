import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Address } from "@/types/addresses";
import { useAuth } from "./useAuth";

export interface AddressSuggestion {
   display_name: string;
   lat: string;
   lon: string;
   address: any;
}

export function useAddresses() {
   const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
   const [addresses, setAddresses] = useState<Address[]>([]);
   const [selected, setSelected] = useState<Address | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [lastQuery, setLastQuery] = useState<string>("");
   const { user } = useAuth();
   const GUEST_ADDRESS_KEY = "nihemart_guest_address_v1";

   const fetchAddresses = useCallback(async () => {
      try {
         setLoading(true);
         // Authenticated user: fetch from DB
         if (user) {
            const { data, error } = await createClient()
               .from("addresses")
               .select("*")
               .eq("user_id", user.id)
               .order("is_default", { ascending: false });

            if (error) throw error;
            setAddresses(data || []);

            // Select the default address if none/other is selected
            if (data && data.length > 0) {
               const defaultAddr = data.find(
                  (addr: Address) => addr.is_default
               );
               const pick = defaultAddr || data[0];
               if (pick && (!selected || selected.id !== pick.id)) {
                  setSelected({ ...pick });
               }
            }
            setLoading(false);
            return;
         }

         // Guest user: load a single temporary address from localStorage (if present)
         if (typeof window !== "undefined") {
            try {
               const raw = localStorage.getItem(GUEST_ADDRESS_KEY);
               if (raw) {
                  const parsed = JSON.parse(raw);
                  // normalize to an array for compatibility
                  const arr = parsed
                     ? Array.isArray(parsed)
                        ? parsed
                        : [parsed]
                     : [];
                  setAddresses(arr as Address[]);
                  if (arr.length > 0) {
                     const first = arr[0] as Address;
                     if (!selected || selected.id !== first.id)
                        setSelected({ ...first });
                  }
               } else {
                  setAddresses([]);
                  setSelected(null);
               }
            } catch (e) {
               console.warn(
                  "Failed to load guest address from localStorage",
                  e
               );
               setAddresses([]);
               setSelected(null);
            }
         }
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error fetching addresses"
         );
      } finally {
         setLoading(false);
      }
   }, [user]);

   useEffect(() => {
      fetchAddresses();
   }, [fetchAddresses]);

   const searchAddresses = useCallback(
      async (q: string) => {
         if (!q || q.trim().length < 2) return [];
         if (q === lastQuery) return suggestions;

         setLastQuery(q);
         try {
            const res = await fetch(
               `/api/addresses?q=${encodeURIComponent(q)}`
            );

            if (!res.ok) {
               const error = await res.json();
               throw new Error(error.error || "Failed to fetch addresses");
            }

            const data = await res.json();
            if (Array.isArray(data)) {
               const mapped = data.map((d) => ({
                  display_name: d.display_name,
                  lat: d.lat,
                  lon: d.lon,
                  address: d.address,
               }));
               setSuggestions(mapped);
               return mapped;
            } else {
               throw new Error("Invalid response format");
            }
         } catch (e) {
            console.error("Address search failed:", e);
            setSuggestions([]);
            throw e;
         }
      },
      [lastQuery, suggestions]
   );

   const saveAddress = async (
      addressData: AddressSuggestion & {
         street?: string;
         house_number?: string;
         phone?: string;
         is_default?: boolean;
      }
   ) => {
      // Authenticated users persist to DB
      if (user) {
         // Helper to add a timeout to promises so UI doesn't hang forever
         const withTimeout = <T>(p: Promise<T>, ms = 10000): Promise<T> => {
            let timer: ReturnType<typeof setTimeout>;
            return Promise.race([
               p,
               new Promise<T>((_, reject) => {
                  timer = setTimeout(() => {
                     reject(new Error(`Request timed out after ${ms}ms`));
                  }, ms);
               }),
            ]).finally(() => clearTimeout(timer));
         };

         try {
            console.log("Saving address with data:", addressData);
            setLoading(true);
            const supabase = createClient();

            // Wrap the insert call with a timeout to avoid indefinite hangs.
            const insertPromise = new Promise<any>(async (resolve, reject) => {
               try {
                  const res = await supabase
                     .from("addresses")
                     .insert([
                        {
                           user_id: user.id,
                           display_name: addressData.display_name,
                           street: addressData.street,
                           house_number: addressData.house_number,
                           phone: addressData.phone,
                           city:
                              addressData.address?.city ||
                              addressData.address?.town,
                           lat: addressData.lat,
                           lon: addressData.lon,
                           is_default: addressData.is_default,
                        },
                     ])
                     .select()
                     .single();

                  resolve(res);
               } catch (e) {
                  reject(e);
               }
            });

            let data: any = null;
            let error: any = null;
            try {
               const res = await withTimeout(insertPromise, 12000);
               if (res && typeof res === "object" && "data" in res) {
                  data = (res as any).data;
                  error = (res as any).error;
               } else {
                  data = res;
               }
            } catch (e) {
               console.error("Insert request failed or timed out:", e);
               throw e;
            }

            console.log("Save result:", { data, error });

            if (error) throw error;

            if (!data) {
               throw new Error("No address returned from insert");
            }

            setAddresses((prev) => [...prev, data]);
            if (data.is_default) setSelected({ ...data });
            return data;
         } catch (err) {
            console.error("saveAddress error:", err);
            setError(
               err instanceof Error ? err.message : "Error adding address"
            );
            return null;
         } finally {
            setLoading(false);
         }
      }

      // Guest users: persist a single temporary address in localStorage
      if (typeof window !== "undefined") {
         try {
            setLoading(true);
            const temp = {
               id: `guest-${Date.now()}`,
               display_name: addressData.display_name,
               street: addressData.street || addressData.display_name,
               house_number: addressData.house_number || "",
               phone: addressData.phone || "",
               city:
                  addressData.address?.city || addressData.address?.town || "",
               lat: addressData.lat || "0",
               lon: addressData.lon || "0",
               is_default: true,
            } as Address;
            // Only store a single temporary address for guests
            localStorage.setItem(GUEST_ADDRESS_KEY, JSON.stringify(temp));
            setAddresses([temp]);
            setSelected({ ...temp });
            return temp;
         } catch (e) {
            console.error("Failed to save guest address to localStorage", e);
            setError("Failed to save address");
            return null;
         } finally {
            setLoading(false);
         }
      }

      return null;
   };

   const updateAddress = async (id: string, updates: Partial<Address>) => {
      // Authenticated update path
      if (user) {
         try {
            setLoading(true);
            const { data, error } = await createClient()
               .from("addresses")
               .update(updates)
               .eq("id", id)
               .eq("user_id", user.id)
               .select()
               .single();

            if (error) throw error;

            setAddresses((prev) =>
               prev.map((addr) => (addr.id === id ? data : addr))
            );
            if (selected?.id === id) setSelected({ ...data });
            return data;
         } catch (err) {
            setError(
               err instanceof Error ? err.message : "Error updating address"
            );
            return null;
         } finally {
            setLoading(false);
         }
      }

      // Guest update path: update the single temp address in localStorage
      if (typeof window !== "undefined") {
         try {
            setLoading(true);
            const raw = localStorage.getItem(GUEST_ADDRESS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Address;
            if (!parsed) return null;
            const merged = { ...parsed, ...updates } as Address;
            localStorage.setItem(GUEST_ADDRESS_KEY, JSON.stringify(merged));
            setAddresses([merged]);
            setSelected({ ...merged });
            return merged;
         } catch (e) {
            console.error("Failed to update guest address", e);
            setError("Failed to update address");
            return null;
         } finally {
            setLoading(false);
         }
      }

      return null;
   };

   const removeAddress = async (id: string) => {
      // Authenticated removal
      if (user) {
         try {
            setLoading(true);
            const { error } = await createClient()
               .from("addresses")
               .delete()
               .eq("id", id)
               .eq("user_id", user.id);

            if (error) throw error;

            setAddresses((prev) => prev.filter((addr) => addr.id !== id));
            if (selected?.id === id) setSelected(null);
            return true;
         } catch (err) {
            setError(
               err instanceof Error ? err.message : "Error deleting address"
            );
            return false;
         } finally {
            setLoading(false);
         }
      }

      // Guest removal: clear the guest temp address
      if (typeof window !== "undefined") {
         try {
            setLoading(true);
            localStorage.removeItem(GUEST_ADDRESS_KEY);
            setAddresses([]);
            setSelected(null);
            return true;
         } catch (e) {
            console.error("Failed to remove guest address", e);
            setError("Failed to remove address");
            return false;
         } finally {
            setLoading(false);
         }
      }

      return false;
   };

   const setDefaultAddress = async (id: string) => {
      if (!user) return null;

      try {
         setLoading(true);
         const { data, error } = await createClient().rpc(
            "set_default_address",
            { p_address_id: id }
         );

         if (error) throw error;

         // Refresh addresses to get updated state
         await fetchAddresses();
         return true;
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error setting default address"
         );
         return null;
      } finally {
         setLoading(false);
      }
   };

   const selectAddress = (id: string | null) => {
      if (!id) return setSelected(null);
      const found = addresses.find((a) => a.id === id) || null;
      setSelected(found);
   };

   return {
      suggestions,
      addresses,
      saved: addresses, // for backward compatibility
      selected,
      loading,
      error,
      searchAddresses,
      saveAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      selectAddress,
      refresh: fetchAddresses,
      reloadSaved: fetchAddresses, // for backward compatibility
   };
}

export default useAddresses;
