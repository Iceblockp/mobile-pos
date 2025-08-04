import { useMemo, useCallback } from 'react';
import { Product } from '@/services/database';

interface UseOptimizedListProps {
  data: Product[];
  searchQuery: string;
  selectedCategory: string | number;
  sortBy: 'name' | 'updated_at' | 'none';
  sortOrder: 'asc' | 'desc';
}

export const useOptimizedList = ({
  data,
  searchQuery,
  selectedCategory,
  sortBy,
  sortOrder,
}: UseOptimizedListProps) => {
  // Memoized filtered and sorted data
  const filteredData = useMemo(() => {
    if (!data.length) return [];

    let filtered = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = data.filter((product) => {
        return (
          product.name.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      });
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((product) =>
        typeof selectedCategory === 'string'
          ? product.category === selectedCategory
          : product.category_id === selectedCategory
      );
    }

    // Apply sorting only when user explicitly chooses to sort
    if (sortBy === 'none') {
      return filtered; // No sorting by default
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        // COMMENTED OUT: Name sorting is too slow for large datasets
        // const comparison = a.name.localeCompare(b.name);
        // return sortOrder === 'asc' ? comparison : -comparison;
        return 0; // No sorting for name field currently
      } else {
        const aTime = new Date(a.updated_at || 0).getTime();
        const bTime = new Date(b.updated_at || 0).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }
    });
  }, [data, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Product) => item.id.toString(), []);

  // Memoized get item layout for better performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 120, // Approximate item height
      offset: 120 * index,
      index,
    }),
    []
  );

  return {
    filteredData,
    keyExtractor,
    getItemLayout,
  };
};
