import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export class PaymentMethodService {
  private static readonly STORAGE_KEY = '@payment_methods';

  private static readonly DEFAULT_METHODS: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      icon: 'Banknote',
      color: '#10B981',
      isDefault: true,
    },
  ];

  /**
   * Get all payment methods from AsyncStorage
   * Returns default cash method if no custom methods exist
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);

      if (!stored) {
        // Initialize with default cash method
        await this.initializeDefaultMethods();
        return [...this.DEFAULT_METHODS];
      }

      const methods = JSON.parse(stored) as PaymentMethod[];

      // Validate stored data
      if (!Array.isArray(methods) || methods.length === 0) {
        await this.initializeDefaultMethods();
        return [...this.DEFAULT_METHODS];
      }

      // Ensure cash method exists
      const hasCash = methods.some((method) => method.id === 'cash');
      if (!hasCash) {
        const updatedMethods = [this.DEFAULT_METHODS[0], ...methods];
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(updatedMethods)
        );
        return updatedMethods;
      }

      return methods;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      // Fallback to default methods
      return [...this.DEFAULT_METHODS];
    }
  }

  /**
   * Add a new custom payment method
   */
  static async addPaymentMethod(
    method: Omit<PaymentMethod, 'id'>
  ): Promise<void> {
    try {
      const existingMethods = await this.getPaymentMethods();

      // Generate unique ID
      const id = `custom_${Date.now()}`;

      // Validate method data
      if (!method.name || !method.name.trim()) {
        throw new Error('Payment method name is required');
      }

      if (method.name.trim().length > 50) {
        throw new Error('Payment method name is too long');
      }

      // Check for duplicate names
      const nameExists = existingMethods.some(
        (existing) =>
          existing.name.toLowerCase() === method.name.trim().toLowerCase()
      );

      if (nameExists) {
        throw new Error('Payment method with this name already exists');
      }

      const newMethod: PaymentMethod = {
        id,
        name: method.name.trim(),
        icon: method.icon || 'CreditCard',
        color: method.color || '#3B82F6',
        isDefault: false,
      };

      const updatedMethods = [...existingMethods, newMethod];
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedMethods)
      );
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Remove a custom payment method
   * Cannot remove the default cash method
   */
  static async removePaymentMethod(methodId: string): Promise<void> {
    try {
      if (methodId === 'cash') {
        throw new Error('Cannot remove the default cash payment method');
      }

      const existingMethods = await this.getPaymentMethods();
      const filteredMethods = existingMethods.filter(
        (method) => method.id !== methodId
      );

      // Ensure at least cash method remains
      if (filteredMethods.length === 0) {
        await this.initializeDefaultMethods();
        return;
      }

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filteredMethods)
      );
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Get the default payment method (always cash)
   */
  static async getDefaultPaymentMethod(): Promise<PaymentMethod> {
    try {
      const methods = await this.getPaymentMethods();
      const cashMethod = methods.find((method) => method.id === 'cash');

      if (cashMethod) {
        return cashMethod;
      }

      // Fallback to default cash method
      return this.DEFAULT_METHODS[0];
    } catch (error) {
      console.error('Error getting default payment method:', error);
      return this.DEFAULT_METHODS[0];
    }
  }

  /**
   * Initialize default payment methods in AsyncStorage
   */
  private static async initializeDefaultMethods(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.DEFAULT_METHODS)
      );
    } catch (error) {
      console.error('Error initializing default payment methods:', error);
      throw error;
    }
  }

  /**
   * Reset to default payment methods (for testing or recovery)
   */
  static async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await this.initializeDefaultMethods();
    } catch (error) {
      console.error('Error resetting payment methods:', error);
      throw error;
    }
  }

  /**
   * Validate payment method data
   */
  static validatePaymentMethod(method: Partial<PaymentMethod>): string[] {
    const errors: string[] = [];

    if (!method.name || !method.name.trim()) {
      errors.push('Payment method name is required');
    }

    if (method.name && method.name.trim().length > 50) {
      errors.push('Payment method name is too long (max 50 characters)');
    }

    if (method.icon && typeof method.icon !== 'string') {
      errors.push('Payment method icon must be a string');
    }

    if (method.color && typeof method.color !== 'string') {
      errors.push('Payment method color must be a string');
    }

    return errors;
  }
}
