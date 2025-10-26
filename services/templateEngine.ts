import { ShopSettings } from './shopSettingsStorage';
import * as FileSystem from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';

export interface ReceiptTemplate {
  id: string;
  name: string;
  description: string;
  htmlTemplate: string;
  cssStyles: string;
}

export interface ReceiptData {
  saleId: string;
  items: Array<{
    product: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    discount: number;
    subtotal: number;
  }>;
  total: number;
  paymentMethod: string;
  note?: string;
  date: Date;
}

export interface TemplateContext {
  shopSettings: ShopSettings | null;
  receiptData: ReceiptData;
  formatters: {
    formatMMK: (amount: number) => string;
    formatDate: (date: Date) => string;
  };
  translations: {
    [key: string]: string;
  };
}

export class TemplateEngine {
  private templates: Map<string, ReceiptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // Initialize default templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReceiptTemplate[] = [
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional receipt design with clean lines',
        htmlTemplate: this.getClassicTemplate(),
        cssStyles: this.getClassicStyles(),
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with better spacing',
        htmlTemplate: this.getModernTemplate(),
        cssStyles: this.getModernStyles(),
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Compact, simple layout',
        htmlTemplate: this.getMinimalTemplate(),
        cssStyles: this.getMinimalStyles(),
      },
      // {
      //   id: 'elegant',
      //   name: 'Elegant',
      //   description: 'Professional, stylish appearance',
      //   htmlTemplate: this.getElegantTemplate(),
      //   cssStyles: this.getElegantStyles(),
      // },
    ];

    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  // Get all available templates
  getAvailableTemplates(): ReceiptTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get specific template
  getTemplate(templateId: string): ReceiptTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // Build template context
  buildTemplateContext(
    shopSettings: ShopSettings | null,
    receiptData: ReceiptData,
    translations: { [key: string]: string } = {}
  ): TemplateContext {
    return {
      shopSettings,
      receiptData,
      formatters: {
        formatMMK: this.formatCurrency, // Keep the same interface name for backward compatibility
        formatDate: this.formatDate,
      },
      translations,
    };
  }

  // Convert local image to base64 data URL for PDF compatibility
  private async convertImageToBase64(imagePath: string): Promise<string> {
    try {
      // Check if file exists
      const logoFile = new FileSystem.File(imagePath);
      if (!(await logoFile.exists)) {
        console.warn('Logo file does not exist:', imagePath);
        return '';
      }

      // Read file as base64
      const base64 = await readAsStringAsync(imagePath, { encoding: 'base64' });

      // Determine MIME type from file extension
      const extension = imagePath.split('.').pop()?.toLowerCase();
      let mimeType = 'image/jpeg'; // default

      switch (extension) {
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        default:
          mimeType = 'image/jpeg';
      }

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      return '';
    }
  }

  // Render receipt with template
  async renderReceipt(
    templateId: string,
    context: TemplateContext,
    isPreview: boolean = false
  ): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    try {
      // Compile template with context
      let html = template.htmlTemplate;

      // Replace shop information
      if (context.shopSettings) {
        html = html.replace(
          /{{shopName}}/g,
          context.shopSettings.shopName || ''
        );
        html = html.replace(/{{address}}/g, context.shopSettings.address || '');
        html = html.replace(/{{phone}}/g, context.shopSettings.phone || '');
        html = html.replace(
          /{{receiptFooter}}/g,
          context.shopSettings.receiptFooter || ''
        );
        html = html.replace(
          /{{thankYouMessage}}/g,
          context.shopSettings.thankYouMessage || ''
        );

        // Handle logo - convert to base64 for PDF compatibility
        if (context.shopSettings.logoPath) {
          const logoBase64 = await this.convertImageToBase64(
            context.shopSettings.logoPath
          );
          if (logoBase64) {
            html = html.replace(/{{logoSrc}}/g, logoBase64);
            html = html.replace(/{{showLogo}}/g, 'block');
          } else {
            // If conversion fails, hide logo
            html = html.replace(/{{logoSrc}}/g, '');
            html = html.replace(/{{showLogo}}/g, 'none');
          }
        } else {
          html = html.replace(/{{logoSrc}}/g, '');
          html = html.replace(/{{showLogo}}/g, 'none');
        }
      } else {
        // No shop settings - use defaults
        html = html.replace(/{{shopName}}/g, 'Mobile POS');
        html = html.replace(/{{address}}/g, '');
        html = html.replace(/{{phone}}/g, '');
        html = html.replace(
          /{{receiptFooter}}/g,
          'Thank you for your business!'
        );
        html = html.replace(/{{thankYouMessage}}/g, '');
        html = html.replace(/{{logoSrc}}/g, '');
        html = html.replace(/{{showLogo}}/g, 'none');
      }

      // Replace receipt data
      html = html.replace(/{{saleId}}/g, context.receiptData.saleId);
      html = html.replace(
        /{{date}}/g,
        context.formatters.formatDate(context.receiptData.date)
      );
      html = html.replace(
        /{{paymentMethod}}/g,
        context.receiptData.paymentMethod.toUpperCase()
      );
      html = html.replace(
        /{{total}}/g,
        context.formatters.formatMMK(context.receiptData.total)
      );
      html = html.replace(/{{note}}/g, context.receiptData.note || '');

      // Replace items
      const itemsHtml = context.receiptData.items
        .map(
          (item) => `
        <div class="item">
          <div class="item-name">${item.product.name}</div>
          <div class="item-details">
            <span>${item.quantity} x ${context.formatters.formatMMK(
            item.product.price
          )}</span>
            <span>${context.formatters.formatMMK(item.subtotal)}</span>
          </div>
          ${
            item.discount > 0
              ? `
            <div class="item-details discount">
              <span>Discount</span>
              <span>-${context.formatters.formatMMK(item.discount)}</span>
            </div>
          `
              : ''
          }
        </div>
      `
        )
        .join('');

      html = html.replace(/{{items}}/g, itemsHtml);

      // Calculate dynamic page height based on number of items
      const itemCount = context.receiptData.items.length;
      const dynamicHeight = 9 + itemCount * 1.5; // 8in default + 2in per item

      // Combine with CSS - add responsive styles for preview
      const responsiveCSS = isPreview ? this.getResponsivePreviewCSS() : '';
      let cssStyles = template.cssStyles;

      // Replace the static page size with dynamic calculation
      cssStyles = cssStyles.replace(
        /@page\s*{[^}]*}/,
        `@page { margin: 0.5in 0; size: 8.5in ${dynamicHeight}in; }`
      );

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Receipt #${context.receiptData.saleId}</title>
            <style>
              ${cssStyles}
              ${responsiveCSS}
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      return fullHtml;
    } catch (error) {
      console.error('Failed to render template:', error);
      throw new Error('Failed to render receipt template');
    }
  }

  // Preview template with sample data
  async previewTemplate(
    templateId: string,
    shopSettings: ShopSettings | null,
    isPreview: boolean = true
  ): Promise<string> {
    const sampleData: ReceiptData = {
      saleId: '12345',
      items: [
        {
          product: { id: '1', name: 'Coca Cola 330ml', price: 800 },
          quantity: 3,
          discount: 0,
          subtotal: 2400,
        },
        {
          product: { id: '2', name: 'Instant Noodles', price: 1200 },
          quantity: 2,
          discount: 100,
          subtotal: 2300,
        },
        {
          product: { id: '3', name: 'White Rice 1kg', price: 2500 },
          quantity: 1,
          discount: 0,
          subtotal: 2500,
        },
        {
          product: { id: '4', name: 'Cooking Oil 1L', price: 3500 },
          quantity: 1,
          discount: 200,
          subtotal: 3300,
        },
      ],
      total: 10500,
      paymentMethod: 'CASH',
      note: 'Thank you for shopping with us!',
      date: new Date(),
    };

    const context = this.buildTemplateContext(shopSettings, sampleData);
    return this.renderReceipt(templateId, context, isPreview);
  }

  // Get responsive CSS for preview mode
  private getResponsivePreviewCSS(): string {
    return `
      /* Responsive styles for preview mode */
      @media screen {
        .receipt {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 10px !important;
          box-sizing: border-box;
        }
        
        body {
          padding: 10px !important;
          margin: 0 !important;
        }
        
        /* Ensure text scales appropriately */
        .shop-name, h1 {
          font-size: clamp(16px, 4vw, 24px) !important;
        }
        
        .item-name {
          font-size: clamp(14px, 3.5vw, 16px) !important;
        }
        
        .total-line, .total-row {
          font-size: clamp(16px, 4vw, 20px) !important;
        }
        
        /* Improve spacing for wider screens */
        .header {
          padding: 15px !important;
        }
        
        .items-section, .receipt-info, .receipt-details {
          padding: 15px !important;
        }
        
        /* Logo sizing for preview */
        .logo {
          max-width: min(100px, 25vw) !important;
          max-height: min(100px, 25vw) !important;
        }
      }
    `;
  }

  // Utility formatters - use currency-aware formatting
  private formatCurrency = (amount: number): string => {
    // Import currency formatter dynamically to avoid circular dependencies
    try {
      const { currencySettingsService } = require('./currencySettingsService');
      return currencySettingsService.formatPrice(amount);
    } catch (error) {
      console.warn(
        'Failed to use currency formatter, falling back to MMK:',
        error
      );
      // Fallback to MMK formatting
      return (
        new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount) + ' MMK'
      );
    }
  };

  private formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Template HTML definitions
  private getClassicTemplate(): string {
    return `
      <div class="width-spacer"></div>
      <table class="full-width-table">
        <tr>
          <td class="full-width-cell">
            <div class="receipt">
              <div class="width-spacer"></div>
              <div class="header">
                <div class="shop-name">{{shopName}}</div>
                <div class="shop-address">{{address}}</div>
                <div class="shop-phone">{{phone}}</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="receipt-info">
                <div class="info-line">
                  <span>Receipt #:</span>
                  <span>{{saleId}}</span>
                </div>
                <div class="info-line">
                  <span>Date:</span>
                  <span>{{date}}</span>
                </div>
                <div class="info-line">
                  <span>Payment:</span>
                  <span>{{paymentMethod}}</span>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="items">
                {{items}}
              </div>
              
              <div class="divider"></div>
              
              <div class="total">
                <div class="total-line">
                  <span>TOTAL</span>
                  <span>{{total}}</span>
                </div>
              </div>
              
              <div class="footer">
                <div class="thank-you">{{thankYouMessage}}</div>
                <div class="footer-message">{{receiptFooter}}</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  private getClassicStyles(): string {
    return `
      @page {
        margin: 0.5in;
        size: 8.5in 8in;
      }
      * {
        box-sizing: border-box;
      }
      html {
        width: 100%;
        height: 100%;
      }
      body {
        font-family: 'Courier New', monospace;
        margin: 0;
        padding: 0;
        font-size: 36px;
        line-height: 1.5;
        background: white;
        color: #000;
        width: 100%;
        min-height: 100vh;
      }
      .receipt {
        width: 100%;
        min-width: 100%;
        margin: 0;
        padding: 0;
        background: white;
        display: block;
      }
     
      
      /* Force content to expand using table layout */
      .full-width-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        min-width: 100%;
      }
      .full-width-cell {
        width: 100%;
        padding: 0;
      }
      
      /* Force width with invisible spacer */
      .width-spacer {
        width: 100%;
        height: 1px;
        background: transparent;
        border: none;
        margin: 0;
        padding: 0;
        display: block;
      }
      
      /* Ensure all content uses full width */
      .header, .receipt-info, .items, .total, .footer {
        width: 100%;
        display: block;
      }
      
      /* Responsive design for different screen sizes */
      @media screen and (max-width: 480px) {
        body { padding: 15px; font-size: 13px; }
        .receipt { max-width: 100%; }
      }
      
      /* Thermal printer optimization (when printing to small paper) */
      @media print and (max-width: 3.5in) {
        @page { margin: 0.1in; }
        body { padding: 8px; font-size: 11px; }
        .receipt { max-width: 100%; }
      }
      
      /* Standard printer optimization */
      @media print and (min-width: 3.5in) {
        body { padding: 15px; }
        .receipt { max-width: 350px; }
      }
      .header {
        text-align: center;
        margin-bottom: 15px;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
      }
      .logo {
        display: block;
        max-width: 80px;
        max-height: 80px;
        margin: 0 auto 10px auto;
        object-fit: contain;
        border-radius: 4px;
      }
      .shop-name {
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 8px;
        word-wrap: break-word;
      }
      .shop-address, .shop-phone {
        font-size: 36px;
        margin-bottom: 4px;
        word-wrap: break-word;
      }
      .divider {
        border-top: 1px dashed #000;
        margin: 15px 0;
      }
      .receipt-info {
        margin-bottom: 15px;
        font-size: 36px;
      }
      
      /* Responsive adjustments for thermal printing */
      @media print and (max-width: 3.5in) {
        .header { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
        .logo { max-width: 50px; max-height: 50px; margin-bottom: 6px; }
        .shop-name { font-size: 14px; margin-bottom: 4px; }
        .shop-address, .shop-phone { font-size: 10px; margin-bottom: 2px; }
        .divider { margin: 8px 0; }
        .receipt-info { margin-bottom: 8px; font-size: 10px; }
      }
      .info-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 36px;
      }
      .items {
        margin-bottom: 20px;
      }
      .item {
        margin-bottom: 12px;
        border-bottom: 1px dashed #ccc;
        padding-bottom: 8px;
      }
      .item-name {
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 40px;
        word-wrap: break-word;
      }
      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 36px;
        align-items: center;
      }
      .item-details.discount {
        color: #dc3545;
        font-size: 32px;
        margin-top: 2px;
      }
      .total {
        margin-bottom: 15px;
        border-top: 2px solid #000;
        padding-top: 15px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        font-size: 48px;
        margin-bottom: 8px;
      }
      .footer {
        text-align: center;
        font-size: 32px;
        border-top: 1px dashed #000;
        padding-top: 15px;
        margin-top: 25px;
      }
      
      /* Responsive adjustments for thermal printing */
      @media print and (max-width: 3.5in) {
        .info-line { margin-bottom: 2px; font-size: 10px; }
        .items { margin-bottom: 10px; }
        .item { margin-bottom: 6px; padding-bottom: 4px; }
        .item-name { margin-bottom: 2px; font-size: 12px; }
        .item-details { font-size: 10px; }
        .item-details.discount { font-size: 9px; margin-top: 1px; }
        .total { margin-bottom: 8px; border-top: 1px solid #000; padding-top: 8px; }
        .total-line { font-size: 14px; margin-bottom: 4px; }
        .footer { font-size: 9px; padding-top: 8px; margin-top: 12px; }
      }
      .thank-you {
        margin-bottom: 5px;
        font-weight: bold;
      }
      .footer-message {
        margin-bottom: 5px;
      }
    `;
  }

  private getModernTemplate(): string {
    return `
      <div class="width-spacer"></div>
      <table class="full-width-table">
        <tr>
          <td class="full-width-cell">
            <div class="receipt">
              <div class="width-spacer"></div>
              <div class="header">
                <h1 class="shop-name">{{shopName}}</h1>
                <p class="shop-address">{{address}}</p>
                <p class="shop-phone">{{phone}}</p>
              </div>
              
              <div class="receipt-info">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Receipt</span>
                    <span class="value">#{{saleId}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date</span>
                    <span class="value">{{date}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Payment</span>
                    <span class="value">{{paymentMethod}}</span>
                  </div>
                </div>
              </div>
              
              <div class="items-section">
                <h3>Items</h3>
                <div class="items">
                  {{items}}
                </div>
              </div>
              
              <div class="total-section">
                <div class="total-line">
                  <span class="total-label">TOTAL</span>
                  <span class="total-amount">{{total}}</span>
                </div>
              </div>
              
              <div class="footer">
                <p class="thank-you">{{thankYouMessage}}</p>
                <p class="footer-message">{{receiptFooter}}</p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  private getModernStyles(): string {
    return `
      @page {
        margin: 0;
        size: 8.5in 8in;
      }
      * {
        box-sizing: border-box;
      }
      html {
        width: 100%;
        height: 100%;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 0;
        font-size: 36px;
        line-height: 1.5;
        background: white;
        color: #333;
        width: 100%;
        min-height: 100vh;
      }
      .receipt {
        width: 100%;
        min-width: 100%;
        margin: 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        display: block;
      }
      
      /* Force content to expand using table layout */
      .full-width-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        min-width: 100%;
      }
      .full-width-cell {
        width: 100%;
        padding: 0;
      }
      
      /* Force width with invisible spacer */
      .width-spacer {
        width: 100%;
        height: 1px;
        background: transparent;
        border: none;
        margin: 0;
        padding: 0;
        display: block;
      }
      
      /* Ensure all content uses full width */
      .header, .receipt-info, .items-section, .total-section, .footer {
        width: 100%;
        display: block;
      }
      
      /* Responsive design for different screen sizes */
      @media screen and (max-width: 480px) {
        body { padding: 15px; font-size: 13px; }
        .receipt { max-width: 100%; }
      }
      
      /* Thermal printer optimization (when printing to small paper) */
      @media print and (max-width: 3.5in) {
        @page { margin: 0.1in; }
        body { padding: 8px; font-size: 11px; }
        .receipt { max-width: 100%; border-radius: 0; }
      }
      
      /* Standard printer optimization */
      @media print and (min-width: 3.5in) {
        body { padding: 15px; }
        .receipt { max-width: 350px; border-radius: 0; }
      }
      .header {
        text-align: center;
        padding: 20px;
        background: #f8f9fa;
        border-bottom: 2px solid #e9ecef;
      }
      .logo {
        display: block;
        max-width: 100px;
        max-height: 100px;
        margin: 0 auto 15px auto;
        border-radius: 8px;
        object-fit: contain;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .shop-name {
        font-size: 48px;
        font-weight: 700;
        margin: 0 0 10px 0;
        color: #212529;
      }
      .shop-address, .shop-phone {
        margin: 5px 0;
        color: #6c757d;
        font-size: 36px;
      }
      
      /* Responsive adjustments for thermal printing */
      @media print and (max-width: 3.5in) {
        .header { padding: 10px; }
        .logo { max-width: 60px; max-height: 60px; margin-bottom: 8px; }
        .shop-name { font-size: 14px; margin-bottom: 6px; }
        .shop-address, .shop-phone { font-size: 10px; margin: 2px 0; }
        .items-section h3 { font-size: 12px; }
        .item-name { font-size: 12px; }
        .item-details { font-size: 10px; }
        .total-label, .total-amount { font-size: 14px; }
        .thank-you { font-size: 10px; }
        .footer-message { font-size: 9px; }
      }
      .receipt-info {
        padding: 20px;
        background: white;
      }
      .info-grid {
        display: grid;
        gap: 12px;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .label {
        font-weight: 500;
        color: #6c757d;
      }
      .value {
        font-weight: 600;
        color: #212529;
      }
      .items-section {
        padding: 0 20px;
      }
      .items-section h3 {
        margin: 0 0 15px 0;
        font-size: 40px;
        font-weight: 600;
        color: #212529;
      }
      .item {
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f1f3f4;
      }
      .item:last-child {
        border-bottom: none;
      }
      .item-name {
        font-weight: 600;
        margin-bottom: 5px;
        color: #212529;
        font-size: 40px;
      }
      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 36px;
        color: #6c757d;
      }
      .item-details.discount {
        color: #dc3545;
        font-weight: 500;
      }
      .total-section {
        padding: 20px;
        background: #f8f9fa;
        border-top: 2px solid #e9ecef;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .total-label {
        font-size: 48px;
        font-weight: 700;
        color: #212529;
      }
      .total-amount {
        font-size: 48px;
        font-weight: 700;
        color: #28a745;
      }
      .footer {
        padding: 20px;
        text-align: center;
        background: white;
      }
      .thank-you {
        margin: 0 0 10px 0;
        font-weight: 600;
        color: #212529;
        font-size: 36px;
      }
      .footer-message {
        margin: 0;
        font-size: 32px;
        color: #6c757d;
      }
    `;
  }

  private getMinimalTemplate(): string {
    return `
      <div class="width-spacer"></div>
      <table class="full-width-table">
        <tr>
          <td class="full-width-cell">
            <div class="receipt">
              <div class="width-spacer"></div>
              <div class="header">
                <div class="shop-name">{{shopName}}</div>
                <div class="contact">{{address}} • {{phone}}</div>
              </div>
              
              <div class="meta">
                #{{saleId}} • {{date}} • {{paymentMethod}}
              </div>
              
              <div class="items">
                {{items}}
              </div>
              
              <div class="total">{{total}}</div>
              
              <div class="footer">
                <div>{{thankYouMessage}}</div>
                <div>{{receiptFooter}}</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  private getMinimalStyles(): string {
    return `
      @page {
        margin: 0 0.5in;
        size: 8.5in 8in;
      }
      * {
        box-sizing: border-box;
      }
      html {
        width: 100%;
        height: 100%;
      }
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
        font-size: 36px;
        line-height: 1.5;
        background: white;
        color: #333;
        width: 100%;
        min-height: 100vh;
      }
      .receipt {
        width: 100%;
        min-width: 100%;
        margin: 0;
        display: block;
      }
      
      /* Force content to expand using table layout */
      .full-width-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        min-width: 100%;
      }
      .full-width-cell {
        width: 100%;
        padding: 0;
      }
      
      /* Force width with invisible spacer */
      .width-spacer {
        width: 100%;
        height: 1px;
        background: transparent;
        border: none;
        margin: 0;
        padding: 0;
        display: block;
      }
      
      /* Ensure all content uses full width */
      .header, .meta, .items, .total, .footer {
        width: 100%;
        display: block;
      }
      
      /* Responsive design for different screen sizes */
      @media screen and (max-width: 480px) {
        body { padding: 12px; font-size: 12px; }
        .receipt { max-width: 100%; }
      }
      
      /* Thermal printer optimization (when printing to small paper) */
      @media print and (max-width: 3.5in) {
        @page { margin: 0.1in; }
        body { padding: 6px; font-size: 10px; }
        .receipt { max-width: 100%; }
      }
      
      /* Standard printer optimization */
      @media print and (min-width: 3.5in) {
        body { padding: 12px; }
        .receipt { max-width: 300px; }
      }
      .header {
        text-align: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #eee;
      }
      .logo {
        display: block;
        max-width: 80px;
        max-height: 80px;
        margin: 0 auto 10px auto;
        object-fit: contain;
        border-radius: 4px;
      }
      .shop-name {
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 8px;
        word-wrap: break-word;
      }
      .contact {
        font-size: 36px;
        color: #666;
      }
      .meta {
        text-align: center;
        font-size: 36px;
        color: #666;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
      .items {
        margin-bottom: 20px;
      }
      .item {
        margin-bottom: 12px;
        border-bottom: 1px dashed #ccc;
        padding-bottom: 8px;
      }
      .item-name {
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 40px;
      }
      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 36px;
        color: #666;
      }
      .item-details.discount {
        color: #999;
         font-size: 32px;
        margin-top: 2px;
      }
      .total {
        text-align: center;
        font-size: 48px;
        font-weight: 700;
        margin: 15px 0;
        padding: 15px 0;
        border-top: 2px solid #333;
        border-bottom: 1px solid #eee;
      }
      .footer {
        text-align: center;
        font-size: 32px;
        color: #666;
        line-height: 1.6;
         padding-top: 15px;
        margin-top: 25px;
      }
      .footer div {
        margin-bottom: 3px;
      }
    `;
  }

  private getElegantTemplate(): string {
    return `
      <div class="width-spacer"></div>
      <table class="full-width-table">
        <tr>
          <td class="full-width-cell">
            <div class="receipt">
              <div class="width-spacer"></div>
              <div class="header">
                <div class="shop-name">{{shopName}}</div>
                <div class="shop-details">
                  <div class="address">{{address}}</div>
                  <div class="phone">{{phone}}</div>
                </div>
              </div>
              
              <div class="receipt-details">
                <table class="info-table">
                  <tr><td>Receipt Number</td><td>{{saleId}}</td></tr>
                  <tr><td>Date & Time</td><td>{{date}}</td></tr>
                  <tr><td>Payment Method</td><td>{{paymentMethod}}</td></tr>
                </table>
              </div>
              
              <div class="items-section">
                <div class="section-title">Items Purchased</div>
                <div class="items">
                  {{items}}
                </div>
              </div>
              
              <div class="total-section">
                <div class="total-row">
                  <span class="total-label">Total Amount</span>
                  <span class="total-value">{{total}}</span>
                </div>
              </div>
              
              <div class="footer">
                <div class="thank-you">{{thankYouMessage}}</div>
                <div class="footer-note">{{receiptFooter}}</div>
                <div class="signature">Thank you for choosing us</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  private getElegantStyles(): string {
    return `
      @page {
        margin: 0;
        size: A4;
      }
      * {
        box-sizing: border-box;
      }
      html {
        width: 100%;
        height: 100%;
      }
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        margin: 0;
        padding: 0;
        font-size: 36px;
        line-height: 1.5;
        background: white;
        color: #2c3e50;
        width: 100%;
        min-height: 100vh;
      }
      .receipt {
        width: 100%;
        min-width: 100%;
        margin: 0;
        background: white;
        display: block;
      }
      
      /* Force content to expand using table layout */
      .full-width-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        min-width: 100%;
      }
      .full-width-cell {
        width: 100%;
        padding: 0;
      }
      
      /* Force width with invisible spacer */
      .width-spacer {
        width: 100%;
        height: 1px;
        background: transparent;
        border: none;
        margin: 0;
        padding: 0;
        display: block;
      }
      
      /* Ensure all content uses full width */
      .header, .receipt-details, .items-section, .total-section, .footer {
        width: 100%;
        display: block;
      }
      
      /* Responsive design for different screen sizes */
      @media screen and (max-width: 480px) {
        body { padding: 15px; font-size: 13px; }
        .receipt { max-width: 100%; }
      }
      
      /* Thermal printer optimization (when printing to small paper) */
      @media print and (max-width: 3.5in) {
        @page { margin: 0.1in; }
        body { padding: 8px; font-size: 11px; }
        .receipt { max-width: 100%; border-width: 1px; }
      }
      
      /* Standard printer optimization */
      @media print and (min-width: 3.5in) {
        body { padding: 20px; }
        .receipt { max-width: 380px; }
      }
      .header {
        text-align: center;
        padding: 15px 20px;
        background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
        color: white;
      }
      .logo {
        display: block;
        max-width: 80px;
        max-height: 80px;
        margin: 0 auto 10px auto;
        border: 3px solid white;
        border-radius: 50%;
        object-fit: cover;
        background: white;
      }
      .shop-name {
        font-size: 48px;
        font-weight: 700;
        margin-bottom: 8px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .shop-details {
        font-size: 36px;
        opacity: 0.9;
      }
      .address, .phone {
        margin: 3px 0;
      }
      .receipt-details {
        padding: 15px;
        background: #ecf0f1;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
      }
      .info-table td {
        padding: 4px 0;
        border-bottom: 1px dotted #bdc3c7;
        font-size: 36px;
      }
      .info-table td:first-child {
        font-weight: 600;
        color: #34495e;
      }
      .info-table td:last-child {
        text-align: right;
        font-weight: 500;
      }
      .items-section {
        padding: 15px;
      }
      .section-title {
        font-size: 40px;
        font-weight: 700;
        margin-bottom: 10px;
        color: #34495e;
        text-align: center;
        border-bottom: 2px solid #34495e;
        padding-bottom: 5px;
      }
      .item {
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #ecf0f1;
      }
      .item:last-child {
        border-bottom: none;
      }
      .item-name {
        font-weight: 600;
        margin-bottom: 5px;
        color: #2c3e50;
        font-size: 40px;
      }
      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 36px;
        color: #7f8c8d;
        font-style: italic;
      }
      .item-details.discount {
        color: #e74c3c;
        font-weight: 500;
      }
      .total-section {
        padding: 15px;
        background: #34495e;
        color: white;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .total-label {
        font-size: 48px;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .total-value {
        font-size: 48px;
        font-weight: 700;
      }
      .footer {
        padding: 15px 20px;
        text-align: center;
        background: #ecf0f1;
      }
      .thank-you {
        font-size: 40px;
        font-weight: 600;
        margin-bottom: 5px;
        color: #34495e;
      }
      .footer-note {
        font-size: 36px;
        margin-bottom: 8px;
        color: #7f8c8d;
        font-style: italic;
      }
      .signature {
        font-size: 32px;
        color: #95a5a6;
        border-top: 1px solid #bdc3c7;
        padding-top: 8px;
        margin-top: 10px;
      }
    `;
  }
}
