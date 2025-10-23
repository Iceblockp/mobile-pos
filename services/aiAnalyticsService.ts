import { GoogleGenAI } from '@google/genai';
import { APIKeyManager } from './apiKeyManager';
import { DatabaseService } from './database';
import {
  AIRequest,
  ShopDataExport,
  AIGenerationConfig,
} from '../types/aiAnalytics';
import {
  createAIAnalyticsError,
  categorizeError,
  isNetworkError,
} from '../utils/aiAnalyticsErrors';
import {
  AI_CONFIG,
  REQUEST_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from '../utils/aiAnalyticsConfig';

export class AIAnalyticsService {
  private static instance: AIAnalyticsService;
  private apiKeyManager: APIKeyManager;
  private databaseService: DatabaseService | null = null;
  private genAI: GoogleGenAI | null = null;

  constructor() {
    this.apiKeyManager = APIKeyManager.getInstance();
  }

  public static getInstance(): AIAnalyticsService {
    if (!AIAnalyticsService.instance) {
      AIAnalyticsService.instance = new AIAnalyticsService();
    }
    return AIAnalyticsService.instance;
  }

  /**
   * Sets the database service instance
   */
  public setDatabaseService(db: DatabaseService): void {
    this.databaseService = db;
  }

  /**
   * Initializes the Google GenAI client
   */
  private initializeAI(apiKey: string): void {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Sends a question to the AI service and returns the response
   */
  async sendQuestion(question: string): Promise<string> {
    if (!question || question.trim().length === 0) {
      throw createAIAnalyticsError('UNKNOWN_ERROR', 'Question cannot be empty');
    }

    // Check if database service is available
    if (!this.databaseService) {
      throw createAIAnalyticsError(
        'UNKNOWN_ERROR',
        'Database service not initialized. Please wait for the app to load completely.'
      );
    }

    // Check if API key is configured
    const apiKey = await this.apiKeyManager.getApiKey();
    if (!apiKey) {
      throw createAIAnalyticsError('NO_API_KEY', 'API key not configured');
    }

    // Get shop data
    const shopData = await this.getShopData();
    if (!shopData || shopData.metadata.totalRecords === 0) {
      throw createAIAnalyticsError(
        'NO_DATA',
        'No shop data available for analysis'
      );
    }

    // Format request
    const aiRequest: AIRequest = {
      question: question.trim(),
      shopData,
      context: 'Myanmar POS System Analytics',
    };

    // Send request with retry logic
    return await this.sendRequestWithRetry(aiRequest, apiKey);
  }

  /**
   * Formats shop data for AI analysis
   */
  formatDataForAI(shopData: ShopDataExport): string {
    const summary = {
      metadata: shopData.metadata,
      summary: {
        totalProducts: shopData.products.length,
        totalSales: shopData.sales.length,
        totalCustomers: shopData.customers.length,
        totalSuppliers: shopData.suppliers.length,
        totalExpenses: shopData.expenses.length,
        totalStockMovements: shopData.stockMovements.length,
      },
      recentSales: shopData.sales.slice(-10), // Last 10 sales
      topProducts: this.getTopProducts(shopData),
      lowStockProducts: this.getLowStockProducts(shopData),
      recentExpenses: shopData.expenses.slice(-5), // Last 5 expenses
      customerSummary: this.getCustomerSummary(shopData),
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Gets shop data using the database directly for AI analysis
   */
  private async getShopData(): Promise<ShopDataExport> {
    if (!this.databaseService) {
      throw createAIAnalyticsError(
        'UNKNOWN_ERROR',
        'Database service not initialized'
      );
    }

    try {
      const db = this.databaseService;

      // Get basic data
      const products = await db.getProducts();
      const categories = await db.getCategories();
      const suppliers = await db.getSuppliers();
      const customers = await db.getCustomers();

      // Get recent sales data (limit for performance)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
      const endDate = new Date();

      const sales = await db.getSalesByDateRangeTimezoneAware(
        startDate,
        endDate,
        -390,
        200
      ); // Limit to 200 recent sales

      // Get sales with items for recent sales only
      const salesWithItems = await Promise.all(
        sales.slice(0, 50).map(async (sale) => {
          // Limit to 50 most recent for AI analysis
          const items = await db.getSaleItems(sale.id);
          return { ...sale, items };
        })
      );

      // Get recent expenses and stock movements
      const expenses = await db.getExpensesByDateRange(startDate, endDate, 100);
      const stockMovements = await db.getStockMovements({}, 1, 100);

      const totalRecords =
        products.length +
        salesWithItems.length +
        customers.length +
        suppliers.length +
        expenses.length +
        stockMovements.length;

      return {
        products,
        sales: salesWithItems,
        customers,
        suppliers,
        expenses,
        stockMovements,
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords,
        },
      };
    } catch (error) {
      console.error('Error getting shop data:', error);
      throw createAIAnalyticsError(
        'UNKNOWN_ERROR',
        'Failed to retrieve shop data'
      );
    }
  }

  /**
   * Sends request to Gemini API with retry logic
   */
  private async sendRequestWithRetry(
    aiRequest: AIRequest,
    apiKey: string
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.sendGeminiRequest(aiRequest, apiKey);
      } catch (error) {
        lastError = error as Error;

        // Don't retry for certain error types
        const errorType = categorizeError(error);
        if (errorType === 'INVALID_API_KEY' || errorType === 'NO_DATA') {
          throw error;
        }

        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY * attempt);
        }
      }
    }

    // All retries failed
    const errorType = categorizeError(lastError);
    throw createAIAnalyticsError(
      errorType,
      `Request failed after ${MAX_RETRIES} attempts`,
      lastError || undefined
    );
  }

  /**
   * Sends request to Gemini API using the modern @google/genai library
   */
  private async sendGeminiRequest(
    aiRequest: AIRequest,
    apiKey: string
  ): Promise<string> {
    // Initialize AI client if not already done
    if (!this.genAI) {
      this.initializeAI(apiKey);
    }

    const formattedData = this.formatDataForAI(aiRequest.shopData);

    const prompt = `
You are an AI assistant helping a Myanmar shop owner analyze their business data. 
Please provide insights in simple, actionable language that a small business owner can understand.

Question: ${aiRequest.question}

Shop Data Context:
${formattedData}

Please analyze this data and provide practical recommendations. Focus on:
1. Clear, simple explanations
2. Actionable advice
3. Specific numbers when relevant
4. Business insights that help make decisions

Respond in a friendly, helpful tone as if speaking directly to the shop owner.
    `.trim();

    try {
      if (!this.genAI) {
        throw createAIAnalyticsError(
          'UNKNOWN_ERROR',
          'AI client not initialized'
        );
      }

      // Use the modern library's generateContent method
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const aiResponse = response.text;

      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error('Empty response from AI service');
      }

      return aiResponse.trim();
    } catch (error: unknown) {
      // Handle library-specific errors
      if (error instanceof Error) {
        if (
          error.message.includes('API_KEY_INVALID') ||
          error.message.includes('401')
        ) {
          throw createAIAnalyticsError('INVALID_API_KEY', 'Invalid API key');
        }
        if (
          error.message.includes('timeout') ||
          error.message.includes('TIMEOUT')
        ) {
          throw createAIAnalyticsError('TIMEOUT_ERROR', 'Request timed out');
        }
        if (isNetworkError(error)) {
          throw createAIAnalyticsError(
            'NETWORK_ERROR',
            'Network connection failed'
          );
        }
      }

      throw error;
    }
  }

  /**
   * Helper method to get top selling products
   */
  private getTopProducts(shopData: ShopDataExport): any[] {
    const productSales = new Map<string, number>();

    shopData.sales.forEach((sale) => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const current = productSales.get(item.productId) || 0;
          productSales.set(item.productId, current + (item.quantity || 0));
        });
      }
    });

    return Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const product = shopData.products.find((p) => p.id === productId);
        return {
          productId,
          productName: product?.name || 'Unknown',
          totalSold: quantity,
        };
      });
  }

  /**
   * Helper method to get low stock products
   */
  private getLowStockProducts(shopData: ShopDataExport): any[] {
    return shopData.products
      .filter((product) => (product.stock || 0) < (product.minStock || 5))
      .slice(0, 5)
      .map((product) => ({
        id: product.id,
        name: product.name,
        currentStock: product.stock || 0,
        minStock: product.minStock || 5,
      }));
  }

  /**
   * Helper method to get customer summary
   */
  private getCustomerSummary(shopData: ShopDataExport): any {
    const customerPurchases = new Map<string, number>();

    shopData.sales.forEach((sale) => {
      if (sale.customerId) {
        const current = customerPurchases.get(sale.customerId) || 0;
        customerPurchases.set(sale.customerId, current + (sale.total || 0));
      }
    });

    const topCustomers = Array.from(customerPurchases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([customerId, totalSpent]) => {
        const customer = shopData.customers.find((c) => c.id === customerId);
        return {
          customerId,
          customerName: customer?.name || 'Unknown',
          totalSpent,
        };
      });

    return {
      totalCustomers: shopData.customers.length,
      activeCustomers: customerPurchases.size,
      topCustomers,
    };
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
