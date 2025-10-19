# Performance Optimization Design

## Overview

This design document outlines the technical approach for optimizing application performance when handling large product datasets (1000-10000 products). The solution focuses on simple modifications to existing components using pagination, infinite scroll, database indexing, and React optimization patterns.

## Architecture

### Current Architecture Issues

- **Monolithic Data Loading**: `getProducts()` loads all products at once
- **N+1 Query Problem**: Bulk pricing loaded separately for each product
- **Inefficient Rendering**: Product cards re-render unnecessarily
- **Missing Database Indexes**: Queries lack proper indexing for search operations

### Optimized Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │   React Query    │    │   Database      │
│                 │    │                  │    │                 │
│ ProductsManager │◄──►│ useInfiniteQuery │◄──►│ Paginated Query │
│ Sales Screen    │    │ Debounced Search │    │ Indexed Search  │
│ Barcode Scanner │    │ Optimized Cache  │    │ Bulk Operations │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Database Layer Enhancements

#### New Pagination Interface

```typescript
interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
  page: number;
}

interface ProductSearchParams {
  searchQuery?: string;
  categoryId?: string;
  page: number;
  limit: number;
}
```

#### Enhanced DatabaseService Methods

```typescript
class DatabaseService {
  // New paginated product query
  async getProductsPaginated(
    params: ProductSearchParams
  ): Promise<PaginatedResult<Product>>;

  // Optimized search for sales (lightweight)
  async searchProductsForSale(
    query: string,
    limit?: number
  ): Promise<Product[]>;

  // Barcode-specific search
  async findProductByBarcode(barcode: string): Promise<Product | null>;

  // Bulk pricing check (boolean only)
  async hasProductBulkPricing(productId: string): Promise<boolean>;
}
```

### 2. React Query Layer

#### New Infinite Query Hook

```typescript
export const useProductsInfinite = (
  searchQuery?: string,
  categoryId?: string
) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', searchQuery, categoryId],
    queryFn: ({ pageParam = 1 }) =>
      db.getProductsPaginated({
        searchQuery,
        categoryId,
        page: pageParam,
        limit: 50,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### Specialized Sales Query Hook

```typescript
export const useProductSearchForSales = (query: string) => {
  return useQuery({
    queryKey: ['products', 'sales-search', query],
    queryFn: () => db.searchProductsForSale(query, 20),
    enabled: query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};
```

### 3. Component Optimizations

#### Optimized ProductCard Component

```typescript
interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  showBulkBadge?: boolean;
  compact?: boolean;
}

const ProductCard = React.memo(
  ({ product, onPress, showBulkBadge }: ProductCardProps) => {
    // Memoized calculations
    const profit = useMemo(
      () => product.price - product.cost,
      [product.price, product.cost]
    );
    const isLowStock = useMemo(
      () => product.quantity <= product.min_stock,
      [product.quantity, product.min_stock]
    );

    // Stable callback
    const handlePress = useCallback(
      () => onPress?.(product),
      [onPress, product.id]
    );

    return (
      <TouchableOpacity onPress={handlePress}>
        <Card>
          {/* Simplified card content */}
          <ProductBasicInfo product={product} />
          <ProductPricing price={product.price} profit={profit} />
          <ProductStock quantity={product.quantity} isLowStock={isLowStock} />
          {showBulkBadge && product.has_bulk_pricing && <BulkBadge />}
        </Card>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    // Optimized comparison
    return (
      prev.product.id === next.product.id &&
      prev.product.updated_at === next.product.updated_at
    );
  }
);
```

#### Enhanced ProductsManager with Infinite Scroll

```typescript
const ProductsManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Debounced search
  const debouncedSearchQuery = useDeferredValue(searchQuery);

  // Infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(debouncedSearchQuery, selectedCategory);

  // Flattened data
  const allProducts = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  // Optimized render item
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        showBulkBadge={true}
        onPress={handleProductPress}
      />
    ),
    [handleProductPress]
  );

  return (
    <FlatList
      data={allProducts}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() =>
        isFetchingNextPage ? <LoadingSpinner /> : null
      }
      // Performance optimizations
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews={true}
      getItemLayout={(_, index) => ({
        length: 120,
        offset: 120 * index,
        index,
      })}
    />
  );
};
```

### 4. Barcode Integration

#### Enhanced Barcode Scanner Hook

```typescript
export const useBarcodeActions = (context: 'sales' | 'inventory') => {
  const { db } = useDatabase();
  const queryClient = useQueryClient();

  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      try {
        const product = await db.findProductByBarcode(barcode);

        if (!product) {
          showToast('Product not found', 'error');
          return;
        }

        if (context === 'sales') {
          // Add to cart immediately
          addToCart(product);
          showToast(`Added ${product.name} to cart`, 'success');
        } else {
          // Search and highlight in inventory
          setSearchQuery(barcode);
          showToast(`Found ${product.name}`, 'success');
        }
      } catch (error) {
        showToast('Error scanning barcode', 'error');
      }
    },
    [context, db]
  );

  return { handleBarcodeScanned };
};
```

## Data Models

### Enhanced Product Interface

```typescript
interface Product {
  id: string;
  name: string;
  barcode?: string;
  category_id: string;
  category?: string; // For joined queries
  price: number;
  cost: number;
  quantity: number;
  min_stock: number;
  supplier_id?: string;
  supplier_name?: string; // For joined queries
  imageUrl?: string;
  has_bulk_pricing?: boolean; // Simple boolean flag
  created_at: string;
  updated_at: string;
}
```

### Database Schema Optimizations

```sql
-- New indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_updated ON products(category_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_search ON products(name, barcode);

-- Optimized bulk pricing check
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product_exists ON bulk_pricing(product_id);
```

## Error Handling

### Database Error Handling

```typescript
class DatabaseService {
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

### React Query Error Handling

```typescript
export const useProductsInfinite = (
  searchQuery?: string,
  categoryId?: string
) => {
  return useInfiniteQuery({
    // ... other options
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) return false;
      return failureCount < 3;
    },
    onError: (error) => {
      console.error('Products query failed:', error);
      showToast('Failed to load products', 'error');
    },
  });
};
```

## Testing Strategy

### Unit Tests

- Database pagination methods
- React Query hooks behavior
- Component memoization effectiveness
- Barcode scanning logic

### Integration Tests

- End-to-end infinite scroll behavior
- Search functionality across screens
- Barcode scanning integration
- Performance under load

### Performance Tests

```typescript
// Example performance test
describe('ProductsManager Performance', () => {
  it('should render 1000 products without lag', async () => {
    const startTime = performance.now();
    render(<ProductsManager />);

    // Wait for initial load
    await waitFor(() =>
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
  });

  it('should handle infinite scroll smoothly', async () => {
    const { getByTestId } = render(<ProductsManager />);
    const flatList = getByTestId('products-list');

    // Simulate scroll to end
    fireEvent.scroll(flatList, { nativeEvent: { contentOffset: { y: 5000 } } });

    // Should load next page without blocking UI
    await waitFor(() =>
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    );
  });
});
```

## Performance Monitoring

### Metrics to Track

- Initial load time (target: < 500ms)
- Search response time (target: < 200ms)
- Scroll performance (target: 60fps)
- Memory usage (target: < 100MB for 10k products)
- Cache hit rate (target: > 80%)

### Monitoring Implementation

```typescript
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (__DEV__ && renderTime > 100) {
        console.warn(`Slow render in ${componentName}: ${renderTime}ms`);
      }
    };
  });
};
```

## Migration Strategy

### Phase 1: Database Layer

1. Add new pagination methods to DatabaseService
2. Create database indexes
3. Test with existing components

### Phase 2: React Query Layer

1. Implement infinite query hooks
2. Add debounced search
3. Update cache configuration

### Phase 3: Component Updates

1. Optimize ProductCard with memoization
2. Update ProductsManager with infinite scroll
3. Enhance barcode scanning integration

### Phase 4: Testing and Optimization

1. Performance testing with large datasets
2. Memory usage optimization
3. Fine-tune cache settings

## Backward Compatibility

- Existing `useProducts()` hook remains functional
- Current ProductCard props are preserved
- Database schema changes are additive only
- All existing functionality continues to work during migration
