import { ShopSettings } from '@/services/shopSettingsStorage';

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

export class ESCPOSConverter {
  // ESC/POS Commands for Xprinter P300
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';

  // Basic commands
  private static readonly INIT = ESCPOSConverter.ESC + '@';
  private static readonly LINE_FEED = '\x0A';
  private static readonly CUT_PAPER = ESCPOSConverter.GS + 'V\x00';

  // Text alignment
  private static readonly ALIGN_LEFT = ESCPOSConverter.ESC + 'a\x00';
  private static readonly ALIGN_CENTER = ESCPOSConverter.ESC + 'a\x01';
  private static readonly ALIGN_RIGHT = ESCPOSConverter.ESC + 'a\x02';

  // Text formatting
  private static readonly BOLD_ON = ESCPOSConverter.ESC + 'E\x01';
  private static readonly BOLD_OFF = ESCPOSConverter.ESC + 'E\x00';
  private static readonly DOUBLE_HEIGHT_ON = ESCPOSConverter.ESC + '!\x10';
  private static readonly DOUBLE_HEIGHT_OFF = ESCPOSConverter.ESC + '!\x00';

  // Paper width for 58mm (384 dots, ~32 characters)
  private static readonly PAPER_WIDTH = 32;

  /**
   * Convert receipt data to ESC/POS commands for Xprinter P300
   */
  static convertReceipt(
    receiptData: ReceiptData,
    shopSettings: ShopSettings | null
  ): string {
    let commands = '';

    // Initialize printer
    commands += this.INIT;

    // Header section
    commands += this.ALIGN_CENTER;
    commands += this.BOLD_ON;
    commands += this.DOUBLE_HEIGHT_ON;
    commands += (shopSettings?.shopName || 'Mobile POS') + this.LINE_FEED;
    commands += this.DOUBLE_HEIGHT_OFF;
    commands += this.BOLD_OFF;

    if (shopSettings?.address) {
      commands += shopSettings.address + this.LINE_FEED;
    }
    if (shopSettings?.phone) {
      commands += shopSettings.phone + this.LINE_FEED;
    }

    // Separator line
    commands += this.padLine('-') + this.LINE_FEED;

    // Receipt info
    commands += this.ALIGN_LEFT;
    commands += `Receipt #: ${receiptData.saleId}` + this.LINE_FEED;
    commands += `Date: ${this.formatDate(receiptData.date)}` + this.LINE_FEED;
    commands +=
      `Payment: ${receiptData.paymentMethod.toUpperCase()}` + this.LINE_FEED;

    // Separator line
    commands += this.padLine('-') + this.LINE_FEED;

    // Items
    for (const item of receiptData.items) {
      // Item name
      commands +=
        this.truncateText(item.product.name, this.PAPER_WIDTH) + this.LINE_FEED;

      // Quantity x Price = Subtotal
      const qtyPrice = `${item.quantity} x ${this.formatMMK(
        item.product.price
      )}`;
      const subtotal = this.formatMMK(item.subtotal);
      commands += this.formatLine(qtyPrice, subtotal) + this.LINE_FEED;

      // Discount if any
      if (item.discount > 0) {
        const discountLine = this.formatLine(
          'Discount',
          `-${this.formatMMK(item.discount)}`
        );
        commands += discountLine + this.LINE_FEED;
      }
    }

    // Separator line
    commands += this.padLine('-') + this.LINE_FEED;

    // Total
    commands += this.BOLD_ON;
    commands += this.DOUBLE_HEIGHT_ON;
    commands +=
      this.formatLine('TOTAL', this.formatMMK(receiptData.total)) +
      this.LINE_FEED;
    commands += this.DOUBLE_HEIGHT_OFF;
    commands += this.BOLD_OFF;

    // Note if any
    if (receiptData.note) {
      commands += this.LINE_FEED;
      commands += 'Note: ' + receiptData.note + this.LINE_FEED;
    }

    // Footer
    commands += this.LINE_FEED;
    commands += this.ALIGN_CENTER;
    if (shopSettings?.thankYouMessage) {
      commands += shopSettings.thankYouMessage + this.LINE_FEED;
    }
    if (shopSettings?.receiptFooter) {
      commands += shopSettings.receiptFooter + this.LINE_FEED;
    }

    // Final spacing and cut
    commands += this.LINE_FEED;
    commands += this.LINE_FEED;
    commands += this.CUT_PAPER;

    return commands;
  }

  /**
   * Format currency amount
   */
  private static formatMMK(amount: number): string {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  }

  /**
   * Format date for receipt
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Create a line with text on left and right
   */
  private static formatLine(left: string, right: string): string {
    const maxWidth = this.PAPER_WIDTH;
    const leftTruncated = this.truncateText(left, maxWidth - right.length - 1);
    const spaces = maxWidth - leftTruncated.length - right.length;
    return leftTruncated + ' '.repeat(Math.max(1, spaces)) + right;
  }

  /**
   * Create a line filled with character
   */
  private static padLine(char: string): string {
    return char.repeat(this.PAPER_WIDTH);
  }

  /**
   * Truncate text to fit width
   */
  private static truncateText(text: string, maxWidth: number): string {
    if (text.length <= maxWidth) {
      return text;
    }
    return text.substring(0, maxWidth - 3) + '...';
  }
}
