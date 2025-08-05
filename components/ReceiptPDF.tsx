import React from 'react';
import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from '@/context/LocalizationContext';

interface CartItem {
  product: {
    id: number;
    name: string;
    price: number;
  };
  quantity: number;
  discount: number;
  subtotal: number;
}

interface ReceiptData {
  saleId: number;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  note?: string;
  date: Date;
}

export const generateReceiptPDF = async (receiptData: ReceiptData) => {
  const { saleId, items, total, paymentMethod, note, date } = receiptData;

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Receipt #${saleId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          padding: 20px;
          max-width: 300px;
          margin: 0 auto;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .store-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .store-info {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }
        
        .receipt-info {
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        .receipt-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .items-header {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 8px 0;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 11px;
        }
        
        .item-name {
          flex: 1;
          margin-right: 10px;
        }
        
        .item-qty-price {
          text-align: right;
          min-width: 80px;
        }
        
        .item-subtotal {
          text-align: right;
          min-width: 60px;
          font-weight: bold;
        }
        
        .item-discount {
          color: #e74c3c;
          font-size: 10px;
          margin-left: 10px;
        }
        
        .totals-section {
          border-top: 1px dashed #000;
          padding-top: 10px;
          margin-top: 15px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .final-total {
          border-top: 1px solid #000;
          padding-top: 8px;
          margin-top: 8px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .payment-info {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px dashed #000;
          text-align: center;
        }
        
        .note-section {
          margin-top: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #000;
          font-size: 10px;
          color: #666;
        }
        
        .thank-you {
          font-weight: bold;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <div class="store-name">Mobile POS</div>
        <div class="store-info">Point of Sale System</div>
        <div class="store-info">Thank you for your business!</div>
      </div>
      
      <div class="receipt-info">
        <div class="receipt-info-row">
          <span>Receipt #:</span>
          <span>${saleId}</span>
        </div>
        <div class="receipt-info-row">
          <span>Date:</span>
          <span>${formatDate(date)}</span>
        </div>
        <div class="receipt-info-row">
          <span>Payment:</span>
          <span>${paymentMethod.toUpperCase()}</span>
        </div>
      </div>
      
      <div class="items-header">
        ITEMS PURCHASED
      </div>
      
      ${items
        .map(
          (item) => `
        <div class="item-row">
          <div class="item-name">${item.product.name}</div>
          <div class="item-qty-price">${item.quantity} x ${formatMMK(
            item.product.price
          )}</div>
          <div class="item-subtotal">${formatMMK(item.subtotal)}</div>
        </div>
        ${
          item.discount > 0
            ? `
          <div class="item-discount">Discount: -${formatMMK(
            item.discount
          )}</div>
        `
            : ''
        }
      `
        )
        .join('')}
      
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatMMK(
            items.reduce(
              (sum, item) => sum + item.quantity * item.product.price,
              0
            )
          )}</span>
        </div>
        ${
          items.some((item) => item.discount > 0)
            ? `
          <div class="total-row">
            <span>Total Discount:</span>
            <span>-${formatMMK(
              items.reduce((sum, item) => sum + item.discount, 0)
            )}</span>
          </div>
        `
            : ''
        }
        <div class="total-row final-total">
          <span>TOTAL:</span>
          <span>${formatMMK(total)}</span>
        </div>
      </div>
      
      <div class="payment-info">
        <strong>PAID BY ${paymentMethod.toUpperCase()}</strong>
      </div>
      
      ${
        note
          ? `
        <div class="note-section">
          <strong>Note:</strong><br>
          ${note}
        </div>
      `
          : ''
      }
      
      <div class="footer">
        <div class="thank-you">Thank you for your purchase!</div>
        <div>Generated by Mobile POS</div>
        <div>${formatDate(new Date())}</div>
      </div>
    </body>
    </html>
  `;

  try {
    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Open print dialog
    await Print.printAsync({
      uri,
      printerUrl: undefined, // This will show printer selection dialog
    });

    return uri;
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    Alert.alert('Print Error', 'Failed to generate receipt. Please try again.');
    throw error;
  }
};

export const shareReceiptPDF = async (receiptData: ReceiptData) => {
  try {
    const htmlContent = `<!-- Same HTML content as above -->`;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt #${receiptData.saleId}`,
      });
    } else {
      Alert.alert(
        'Sharing not available',
        'Sharing is not available on this device'
      );
    }

    return uri;
  } catch (error) {
    console.error('Error sharing receipt PDF:', error);
    Alert.alert('Share Error', 'Failed to share receipt. Please try again.');
    throw error;
  }
};
