"use client";

import { Product } from "@/integrations/supabase/products";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";

interface ProductSelectProps {
  onSelect: (product: Product) => void;
  products: Product[];
  selectedProduct?: Product | null;
  isLoading?: boolean;
}

export function ProductSelect({
  onSelect,
  products,
  selectedProduct,
  isLoading,
}: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const truncateWords = (s: string | undefined, count = 5) => {
    if (!s) return "";
    const parts = s.trim().split(/\s+/);
    if (parts.length <= count) return s;
    return parts.slice(0, count).join(" ") + "...";
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span title={selectedProduct.name}>
              {truncateWords(selectedProduct.name, 5)}
            </span>
          ) : (
            "Select product..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={query}
            onValueChange={(val) => setQuery(val)}
          />
          <CommandEmpty>
            {isLoading ? "Loading products..." : "No product found."}
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {products
              .filter(
                (p) =>
                  !query || p.name.toLowerCase().includes(query.toLowerCase())
              )
              .map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProduct?.id === product.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-3 w-full">
                    {product.main_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <Image
                        src={optimizeImageUrl(
                          product.main_image_url || "/placeholder.svg",
                          {
                            width: 80,
                            quality: 70,
                          }
                        )}
                        alt={product.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-slate-100" />
                    )}
                    <div className="flex-1 text-left truncate">
                      {product.name}
                    </div>
                    <span className="ml-auto text-muted-foreground">
                      {product.price?.toLocaleString()} RWF
                    </span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
