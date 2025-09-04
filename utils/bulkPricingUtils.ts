import { Product, BulkPricing } from '@/services/database';

interface CartItem extends Product {
  quantity: number;
}

interface BulkPricingResult {
  originalPrice: number;
  bulkPrice: number;
  totalSavings: number;
  appliedTier?: BulkPricing;
  discountPercentage: number;
}

/**
 * Calculate the best bulk pricing for a given product and quantity
 */
export const calculateBulkPrice = (
  product: Product,
  quantity: number
): BulkPricingResult => {
  const originalPrice = product.price * quantity;

  // If no bulk pricing or quantity is 0, return original price
  if (
    !product.bulk_pricing ||
    product.bulk_pricing.length === 0 ||
    quantity <= 0
  ) {
    return {
      originalPrice,
      bulkPrice: originalPrice,
      totalSavings: 0,
      discountPercentage: 0,
    };
  }

  // Find the best applicable tier (highest min_quantity that's <= our quantity)
  const applicableTiers = product.bulk_pricing
    .filter((tier) => tier.min_quantity <= quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity); // Sort descending

  if (applicableTiers.length === 0) {
    // No applicable tier, use original price
    return {
      originalPrice,
      bulkPrice: originalPrice,
      totalSavings: 0,
      discountPercentage: 0,
    };
  }

  const bestTier = applicableTiers[0];
  const bulkPrice = bestTier.bulk_price * quantity;
  const totalSavings = originalPrice - bulkPrice;
  const discountPercentage = (totalSavings / originalPrice) * 100;

  return {
    originalPrice,
    bulkPrice,
    totalSavings,
    appliedTier: bestTier,
    discountPercentage,
  };
};

/**
 * Calculate total cart value with bulk pricing applied
 */
export const calculateCartTotalWithBulkPricing = (
  cart: CartItem[]
): {
  originalTotal: number;
  bulkTotal: number;
  totalSavings: number;
  itemBreakdown: Array<{
    item: CartItem;
    pricing: BulkPricingResult;
  }>;
} => {
  let originalTotal = 0;
  let bulkTotal = 0;
  const itemBreakdown: Array<{
    item: CartItem;
    pricing: BulkPricingResult;
  }> = [];

  cart.forEach((item) => {
    const pricing = calculateBulkPrice(item, item.quantity);
    originalTotal += pricing.originalPrice;
    bulkTotal += pricing.bulkPrice;

    itemBreakdown.push({
      item,
      pricing,
    });
  });

  return {
    originalTotal,
    bulkTotal,
    totalSavings: originalTotal - bulkTotal,
    itemBreakdown,
  };
};

/**
 * Get the next bulk pricing tier for a product (for upselling)
 */
export const getNextBulkTier = (
  product: Product,
  currentQuantity: number
): BulkPricing | null => {
  if (!product.bulk_pricing || product.bulk_pricing.length === 0) {
    return null;
  }

  // Find the next tier with higher min_quantity
  const nextTiers = product.bulk_pricing
    .filter((tier) => tier.min_quantity > currentQuantity)
    .sort((a, b) => a.min_quantity - b.min_quantity); // Sort ascending

  return nextTiers.length > 0 ? nextTiers[0] : null;
};

/**
 * Format bulk pricing savings for display
 */
export const formatBulkSavings = (
  savings: number,
  locale: string = 'en'
): string => {
  if (savings <= 0) return '';

  const formattedAmount = new Intl.NumberFormat('en-US').format(savings);
  return locale === 'my'
    ? `${formattedAmount} MMK ချွေတာ`
    : `Save ${formattedAmount} MMK`;
};

/**
 * Check if a product has bulk pricing configured
 */
export const hasBulkPricing = (product: Product): boolean => {
  return product.bulk_pricing && product.bulk_pricing.length > 0;
};

/**
 * Get bulk pricing summary for display
 */
export const getBulkPricingSummary = (product: Product): string => {
  if (!hasBulkPricing(product)) return '';

  const tiers = product.bulk_pricing!.sort(
    (a, b) => a.min_quantity - b.min_quantity
  );
  const minTier = tiers[0];
  const maxDiscount = Math.max(
    ...tiers.map(
      (tier) => ((product.price - tier.bulk_price) / product.price) * 100
    )
  );

  return `Buy ${minTier.min_quantity}+ for up to ${maxDiscount.toFixed(
    0
  )}% off`;
};
