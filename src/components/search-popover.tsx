"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { searchProductsByName } from "@/integrations/supabase/store";
import type { SearchResult } from "@/integrations/supabase/store";
import { useLanguage } from "@/contexts/LanguageContext";

export function SearchPopover() {
    const router = useRouter();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const debouncedSearch = useDebounce(searchQuery, 300);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            const searchResults = await searchProductsByName(debouncedSearch);
            setResults(searchResults);
            setLoading(false);
        };

        performSearch();
    }, [debouncedSearch]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/products?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery("");
            setIsFocused(false);
        }
    };
    
    const handleResultClick = () => {
        setSearchQuery("");
        setIsFocused(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showPopover = isFocused && searchQuery.length > 0;

    return (
        <div
            ref={popoverRef}
            className="items-center flex-1 max-w-xs md:max-w-sm mx-2 md:mx-6 relative"
        >
            <form onSubmit={handleSearchSubmit} className="w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    type="search"
                    placeholder={t("products.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    className="pl-10 text-xs sm:text-sm py-2"
                    aria-label={t("products.search")}
                />
            </form>
            {showPopover && (
                <div className="absolute top-full mt-2 w-full bg-background border rounded-md shadow-lg z-10 p-2">
                    {loading && (
                        <div className="p-4 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!loading && debouncedSearch.length > 1 && results.length === 0 && (
                         <p className="text-sm text-center text-muted-foreground p-4">No products found.</p>
                    )}
                    {results.length > 0 && (
                        <div className="space-y-1">
                            {results.map(product => (
                                <Link
                                    href={`/products/${product.id}`}
                                    key={product.id}
                                    onClick={handleResultClick}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                                >
                                    <Image 
                                        src={product.main_image_url || '/placeholder.svg'} 
                                        alt={product.name} 
                                        width={40} 
                                        height={40} 
                                        className="h-10 w-10 object-cover rounded-md bg-gray-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{product.short_description || "View product details"}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}