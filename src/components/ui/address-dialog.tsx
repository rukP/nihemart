"use client";

import React, { useState, useCallback } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useAddresses } from "@/hooks/useAddresses";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "./input";
import PhoneField from "@/components/ui/PhoneField";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";

export function AddressDialog({
   open: openProp = false,
   onOpenChange,
}: {
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
}) {
   const { searchAddresses, suggestions, saveAddress } = useAddresses();
   const [query, setQuery] = useState("");
   const [selected, setSelected] = useState<any | null>(null);
   const [isSearching, setIsSearching] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const debouncedSearch = useDebounce(query, 300);

   const AddressSchema = z.object({
      house_number: z.string().optional(),
      phone: z
         .string()
         .optional()
         .refine(
            (val) => {
               if (!val) return true;
               const intl = /^\+250\d{9}$/; // +250 followed by 9 digits
               const local = /^07\d{8}$/; // 07 followed by 8 digits -> total 10
               return intl.test(val) || local.test(val);
            },
            {
               message: "Phone must be +250XXXXXXXXX or 07XXXXXXXX",
            }
         ),
   });

   type AddressFormValues = z.infer<typeof AddressSchema>;

   const form = useForm<AddressFormValues>({
      resolver: zodResolver(AddressSchema),
      defaultValues: { house_number: "", phone: "" },
      mode: "onChange",
   });

   // Memoize the search function
   const memoizedSearch = useCallback(
      async (searchQuery: string) => {
         setIsSearching(true);
         setError(null);
         try {
            await searchAddresses(searchQuery);
         } catch (err: any) {
            console.error("Search failed:", err);
            setError(
               err.message || "Failed to search addresses. Please try again."
            );
         } finally {
            setIsSearching(false);
         }
      },
      [searchAddresses]
   );

   // Effect to handle debounced search
   React.useEffect(() => {
      if (debouncedSearch.length < 2) {
         setError(null);
         return;
      }

      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
         memoizedSearch(debouncedSearch);
      }, 100); // Small delay to prevent race conditions

      return () => {
         clearTimeout(timeoutId);
      };
   }, [debouncedSearch, memoizedSearch]);

   const handleSelect = (s: any) => {
      setSelected(s);
      setError(null);
      // reset form values when selecting a new suggestion
      form.reset();
   };

   const handleSave = async (values: AddressFormValues) => {
      if (!selected) {
         console.log("No address selected");
         return;
      }

      setIsSaving(true);
      setError(null);

      try {
         const addr = {
            ...selected, // Include all AddressSuggestion properties
            street:
               selected.address?.road || selected.address?.pedestrian || "",
            house_number: values.house_number || undefined,
            phone: values.phone || undefined,
            is_default: false,
         };

         // Save to database through the hook
         const result = await saveAddress(addr);

         if (!result) {
            throw new Error("Failed to save address");
         }

         // Reset form and dialog state
         setQuery("");
         setSelected(null);
         form.reset();
         setError(null);

         // Close dialog
         onOpenChange?.(false);
      } catch (err: any) {
         setError(err.message || "Failed to save address. Please try again.");
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <Dialog
         open={openProp}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Add Delivery Address</DialogTitle>
            </DialogHeader>

            <Form {...form}>
               <form onSubmit={form.handleSubmit(handleSave)}>
                  <div className="space-y-4">
                     <div>
                        <Label>Search street / place</Label>
                        <Input
                           value={query}
                           onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setQuery(e.target.value)
                           }
                           placeholder="Start typing street or place"
                        />
                     </div>

                     <div className="max-h-48 overflow-auto border rounded-lg p-2">
                        <div className="space-y-2">
                           {error ? (
                              <div className="text-sm text-red-500 p-2">
                                 {error}
                              </div>
                           ) : isSearching ? (
                              <div className="text-sm text-muted-foreground animate-pulse p-2">
                                 <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
                                 <div className="h-4 w-1/2 bg-muted rounded"></div>
                              </div>
                           ) : suggestions && suggestions.length > 0 ? (
                              suggestions.map((s, idx) => (
                                 <button
                                    key={idx}
                                    className={`w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors ${
                                       selected?.display_name === s.display_name
                                          ? "bg-muted ring-1 ring-amber-500"
                                          : ""
                                    }`}
                                    onClick={() => handleSelect(s)}
                                 >
                                    <div className="text-sm font-medium">
                                       {s.display_name}
                                    </div>
                                    {s.address && (
                                       <div className="text-xs text-muted-foreground mt-1">
                                          {[
                                             s.address.road,
                                             s.address.city ||
                                                s.address.town ||
                                                s.address.village,
                                          ]
                                             .filter(Boolean)
                                             .join(", ")}
                                       </div>
                                    )}
                                 </button>
                              ))
                           ) : query.length >= 2 ? (
                              <div className="text-sm text-muted-foreground p-2">
                                 No addresses found. Try a different search.
                              </div>
                           ) : (
                              <div className="text-sm text-muted-foreground p-2">
                                 Type at least 2 characters to search
                              </div>
                           )}
                        </div>
                     </div>

                     {selected && (
                        <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg border">
                           <FormField
                              control={form.control}
                              name="house_number"
                              render={({ field }) => (
                                 <FormItem>
                                    <FormLabel>
                                       House number (optional)
                                    </FormLabel>
                                    <FormControl>
                                       <Input
                                          {...field}
                                          className="mt-1.5"
                                          placeholder="House / apartment number"
                                       />
                                    </FormControl>
                                    <FormMessage />
                                 </FormItem>
                              )}
                           />

                           <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                 <FormItem>
                                    <FormLabel>Contact phone</FormLabel>
                                    <FormControl>
                                       <PhoneField
                                          {...field}
                                          placeholder="+250... or 07..."
                                          className="mt-1.5"
                                          type="tel"
                                       />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground mt-1">
                                       Accepts +250XXXXXXXXX or 07XXXXXXXX
                                    </p>
                                 </FormItem>
                              )}
                           />
                        </div>
                     )}
                  </div>

                  <DialogFooter>
                     <div className="flex w-full justify-end space-x-2">
                        <Button
                           variant="outline"
                           onClick={() => onOpenChange?.(false)}
                           type="button"
                        >
                           Cancel
                        </Button>
                        <Button
                           type="submit"
                           disabled={
                              !selected ||
                              isSearching ||
                              isSaving ||
                              !form.formState.isValid
                           }
                           className="bg-amber-500 hover:bg-amber-600"
                        >
                           {isSaving ? "Saving..." : "Save Address"}
                        </Button>
                     </div>
                  </DialogFooter>
               </form>
            </Form>
         </DialogContent>
      </Dialog>
   );
}

export default AddressDialog;
