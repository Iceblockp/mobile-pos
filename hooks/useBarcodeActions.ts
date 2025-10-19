import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { Product } from '@/services/database';

export type BarcodeContext = 'sales' | 'inventory' | 'general';

interface BarcodeActionOptions {
  context: BarcodeContext;
  onProductFound?: (product: Product) => void;
  onProductNotFound?: (barcode: string) => void;
  onError?: (error: Error) => void;
  onSuccess?: (product: Product, action: string) => void;
}

interface BarcodeActionResult {
  success: boolean;
  product?: Product;
  action?: string;
  error?: string;
}

/**
 * Unified barcode handling hook for different contexts
 */
export const useBarcodeActions = (options: BarcodeActionOptions) => {
  const { db } = useDatabase();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { context, onProductFound, onProductNotFound, onError, onSuccess } =
    options;

  /**
   * Provide haptic feedback if available
   */
  const triggerHapticFeedback = useCallback(
    (type: 'success' | 'error' | 'warning' = 'success') => {
      if (Platform.OS === 'ios') {
        try {
          const { HapticFeedback } = require('expo-haptics');
          switch (type) {
            case 'success':
              HapticFeedback?.impactAsync(
                HapticFeedback.ImpactFeedbackStyle.Light
              );
              break;
            case 'error':
              HapticFeedback?.notificationAsync(
                HapticFeedback.NotificationFeedbackType.Error
              );
              break;
            case 'warning':
              HapticFeedback?.notificationAsync(
                HapticFeedback.NotificationFeedbackType.Warning
              );
              break;
          }
        } catch (error) {
          // Haptic feedback not available, continue silently
        }
      }
    },
    []
  );

  /**
   * Handle barcode scanning for sales context
   */
  const handleSalesBarcode = useCallback(
    async (barcode: string, product: Product): Promise<BarcodeActionResult> => {
      try {
        // Check if product is in stock
        if (product.quantity <= 0) {
          triggerHapticFeedback('warning');

          Alert.alert(
            t('sales.productNotAvailable'),
            t('sales.productOutOfStock', { name: product.name }),
            [{ text: t('common.ok'), style: 'default' }]
          );

          return {
            success: false,
            product,
            error: 'out_of_stock',
          };
        }

        // Add to cart or trigger callback
        if (onProductFound) {
          onProductFound(product);
        }

        triggerHapticFeedback('success');

        const action = 'added_to_cart';
        showToast(t('messages.addedToCart', { name: product.name }), 'success');

        if (onSuccess) {
          onSuccess(product, action);
        }

        return {
          success: true,
          product,
          action,
        };
      } catch (error) {
        triggerHapticFeedback('error');
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [onProductFound, onError, onSuccess, showToast, t, triggerHapticFeedback]
  );

  /**
   * Handle barcode scanning for inventory context
   */
  const handleInventoryBarcode = useCallback(
    async (barcode: string, product: Product): Promise<BarcodeActionResult> => {
      try {
        // For inventory, we typically want to search/highlight the product
        if (onProductFound) {
          onProductFound(product);
        }

        triggerHapticFeedback('success');

        const action = 'product_found';
        showToast(
          t('inventory.productFound', { name: product.name }),
          'success'
        );

        if (onSuccess) {
          onSuccess(product, action);
        }

        return {
          success: true,
          product,
          action,
        };
      } catch (error) {
        triggerHapticFeedback('error');
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [onProductFound, onError, onSuccess, showToast, t, triggerHapticFeedback]
  );

  /**
   * Handle barcode scanning for general context
   */
  const handleGeneralBarcode = useCallback(
    async (barcode: string, product: Product): Promise<BarcodeActionResult> => {
      try {
        if (onProductFound) {
          onProductFound(product);
        }

        triggerHapticFeedback('success');

        const action = 'product_scanned';
        showToast(t('common.productFound', { name: product.name }), 'success');

        if (onSuccess) {
          onSuccess(product, action);
        }

        return {
          success: true,
          product,
          action,
        };
      } catch (error) {
        triggerHapticFeedback('error');
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [onProductFound, onError, onSuccess, showToast, t, triggerHapticFeedback]
  );

  /**
   * Main barcode scanning handler
   */
  const handleBarcodeScanned = useCallback(
    async (barcode: string): Promise<BarcodeActionResult> => {
      try {
        // Validate barcode
        if (!barcode || barcode.trim().length === 0) {
          triggerHapticFeedback('error');
          Alert.alert(t('common.error'), t('barcode.invalidBarcode'));
          return {
            success: false,
            error: 'invalid_barcode',
          };
        }

        // Use optimized database lookup
        const product = await db?.findProductByBarcode(barcode.trim());

        if (!product) {
          triggerHapticFeedback('warning');

          const contextSpecificMessage =
            context === 'sales'
              ? t('sales.noProductFoundWithBarcode', { barcode })
              : context === 'inventory'
              ? t('inventory.noProductFoundWithBarcode', { barcode })
              : t('common.noProductFoundWithBarcode', { barcode });

          Alert.alert(t('common.productNotFound'), contextSpecificMessage, [
            { text: t('common.ok'), style: 'default' },
            {
              text: t('common.searchManually'),
              onPress: () => {
                if (onProductNotFound) {
                  onProductNotFound(barcode);
                }
              },
            },
          ]);

          return {
            success: false,
            error: 'product_not_found',
          };
        }

        // Handle based on context
        switch (context) {
          case 'sales':
            return await handleSalesBarcode(barcode, product);
          case 'inventory':
            return await handleInventoryBarcode(barcode, product);
          case 'general':
          default:
            return await handleGeneralBarcode(barcode, product);
        }
      } catch (error) {
        triggerHapticFeedback('error');
        console.error('Error in barcode scanning:', error);

        Alert.alert(t('common.error'), t('barcode.scanningError'));

        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error('Barcode scanning failed')
          );
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [
      db,
      context,
      handleSalesBarcode,
      handleInventoryBarcode,
      handleGeneralBarcode,
      onProductNotFound,
      onError,
      t,
      triggerHapticFeedback,
    ]
  );

  /**
   * Quick barcode validation
   */
  const validateBarcode = useCallback((barcode: string): boolean => {
    return Boolean(barcode && barcode.trim().length > 0);
  }, []);

  /**
   * Get context-specific messages
   */
  const getContextMessages = useCallback(() => {
    switch (context) {
      case 'sales':
        return {
          scanning: t('sales.scanningProduct'),
          success: t('sales.productAddedToCart'),
          notFound: t('sales.productNotFound'),
          error: t('sales.scanningError'),
        };
      case 'inventory':
        return {
          scanning: t('inventory.scanningProduct'),
          success: t('inventory.productFound'),
          notFound: t('inventory.productNotFound'),
          error: t('inventory.scanningError'),
        };
      default:
        return {
          scanning: t('common.scanningProduct'),
          success: t('common.productFound'),
          notFound: t('common.productNotFound'),
          error: t('common.scanningError'),
        };
    }
  }, [context, t]);

  return {
    handleBarcodeScanned,
    validateBarcode,
    getContextMessages,
    triggerHapticFeedback,
  };
};
