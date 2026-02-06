'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  buildSearchIndex,
  fuzzySearch,
  type SearchItem,
} from '@/lib/search-index';
import { cn } from '@/lib/utils';
import {
  Search,
  Command,
  ArrowRight,
  Sparkles,
  Zap,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { roles } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build search index based on user roles
  const searchIndex = useMemo(() => buildSearchIndex(roles), [roles]);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return searchIndex.slice(0, 8); // Show top 8 when no query
    }
    return fuzzySearch(query, searchIndex);
  }, [query, searchIndex]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchItem[]>();

    for (const item of filteredResults) {
      const category = item.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }

    // Convert to array and sort by category name
    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        items,
        icon: items[0]?.categoryIcon,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredResults]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filteredResults.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredResults, onOpenChange]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      router.push(item.href);
      onOpenChange(false);
      setQuery('');
      setSelectedIndex(0);
    },
    [router, onOpenChange]
  );

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden sm:rounded-2xl [&>button]:hidden max-h-[85vh] flex flex-col">
        <DialogDescription className="sr-only">
          Search and navigate to any admin page
        </DialogDescription>

        {/* Modern Gradient Header */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/50">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Command Palette
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  Search pages, features, and actions instantly
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Search Input */}
          <div className="px-6 pb-4">
            <div className="relative flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
              <Search className="h-5 w-5 shrink-0 text-gray-400 mr-3" />
              <Input
                placeholder="Type to search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-gray-400"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="ml-2 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
              <div className="ml-3 flex items-center gap-1.5">
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 font-mono text-[11px] font-medium text-gray-600 shadow-sm">
                  <Command className="h-3 w-3" />K
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <ScrollArea className="flex-1 px-2">
          <div className="px-4 py-4">
            <AnimatePresence mode="wait">
              {filteredResults.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-12 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  {query ? (
                    <>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        No results found
                      </p>
                      <p className="text-sm text-gray-500">
                        Try a different search term or check your spelling
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        Start typing to search
                      </p>
                      <p className="text-sm text-gray-500">
                        Search across all admin pages and features
                      </p>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {groupedResults.map((group, groupIndex) => {
                    const CategoryIcon = group.icon;
                    let groupStartIndex = 0;

                    // Calculate starting index for this group
                    for (let i = 0; i < groupIndex; i++) {
                      groupStartIndex += groupedResults[i].items.length;
                    }

                    return (
                      <div key={group.category} className="space-y-2">
                        {/* Category Header */}
                        <div className="px-3 py-2 flex items-center gap-2">
                          {CategoryIcon && (
                            <CategoryIcon className="h-4 w-4 text-indigo-600" />
                          )}
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {group.category}
                          </span>
                          <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                          <span className="text-xs text-gray-400">
                            {group.items.length}
                          </span>
                        </div>

                        {/* Category Items */}
                        <div className="space-y-1.5">
                          {group.items.map((item, itemIndex) => {
                            const globalIndex = groupStartIndex + itemIndex;
                            const isSelected = selectedIndex === globalIndex;

                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.02 }}
                              >
                                <button
                                  onClick={() => handleSelect(item)}
                                  className={cn(
                                    'w-full px-4 py-3.5 text-left flex items-center gap-3 rounded-xl transition-all duration-200 group',
                                    'border border-transparent',
                                    isSelected
                                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-sm'
                                      : 'hover:bg-gray-50 hover:border-gray-200'
                                  )}
                                  onMouseEnter={() =>
                                    setSelectedIndex(globalIndex)
                                  }
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={cn(
                                          'font-semibold text-sm',
                                          isSelected
                                            ? 'text-indigo-900'
                                            : 'text-gray-900'
                                        )}
                                      >
                                        {item.title}
                                      </span>
                                      {item.parentTitle && (
                                        <span
                                          className={cn(
                                            'text-xs px-2 py-0.5 rounded-md',
                                            isSelected
                                              ? 'bg-indigo-100 text-indigo-700'
                                              : 'bg-gray-100 text-gray-600'
                                          )}
                                        >
                                          {item.parentTitle}
                                        </span>
                                      )}
                                    </div>
                                    {item.keywords.length > 0 && (
                                      <div
                                        className={cn(
                                          'text-xs mt-1 truncate flex items-center gap-1.5',
                                          isSelected
                                            ? 'text-indigo-600'
                                            : 'text-gray-500'
                                        )}
                                      >
                                        <Zap className="h-3 w-3" />
                                        {item.keywords.slice(0, 3).join(' • ')}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isSelected && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium"
                                      >
                                        <kbd className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 font-mono text-[10px] border border-indigo-200">
                                          Enter
                                        </kbd>
                                      </motion.div>
                                    )}
                                    <ArrowRight
                                      className={cn(
                                        'h-4 w-4 transition-all duration-200',
                                        isSelected
                                          ? 'opacity-100 text-indigo-600 translate-x-0'
                                          : 'opacity-0 group-hover:opacity-40 -translate-x-1'
                                      )}
                                    />
                                  </div>
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Modern Footer */}
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-gray-200 bg-white px-2 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                    <ArrowUp className="h-3 w-3" />
                    <ArrowDown className="h-3 w-3" />
                  </kbd>
                  <span className="text-xs text-gray-600 ml-1">Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-gray-200 bg-white px-2 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                    <CornerDownLeft className="h-3 w-3" />
                  </kbd>
                  <span className="text-xs text-gray-600 ml-1">Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-gray-200 bg-white px-2 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                    Esc
                  </kbd>
                  <span className="text-xs text-gray-600 ml-1">Close</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-700">
                {filteredResults.length}{' '}
                {filteredResults.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
