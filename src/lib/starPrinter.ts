// Star WebPRNT utilities for TSP143IV-UE and other Star printers

export interface StarPrinterSettings {
  printerIp: string;
  paperWidth: number; // 58mm or 80mm
  enabled: boolean;
}

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    box_size?: string;
  }>;
  total: number;
  serviceFee: number;
  date: Date;
  cartName?: string | null;
  cartNumber?: string | null;
  processedBy?: string | null;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    tax_id: string;
  };
  headerText?: string;
  footerText?: string;
  showLogo?: boolean;
  logoUrl?: string | null;
}

// Star WebPRNT builder class
export class StarWebPrintBuilder {
  private request: any;

  constructor() {
    // Check if Star WebPRNT is available
    if (typeof (window as any).StarWebPrintBuilder === 'undefined') {
      throw new Error('Star WebPRNT library not loaded');
    }
    this.request = new (window as any).StarWebPrintBuilder();
  }

  // Build receipt content using Star WebPRNT commands
  buildReceipt(data: ReceiptData, paperWidth: number = 80): any {
    const charWidth = paperWidth === 58 ? 32 : 48;
    
    this.request.onReceive = (response: any) => {
      console.log('Star Printer Response:', response);
    };

    this.request.onError = (error: any) => {
      console.error('Star Printer Error:', error);
    };

    // Initialize
    this.request.createAlignmentElement({ position: 'center' });
    
    // Header with company info
    if (data.companyInfo?.name) {
      this.request.createTextElement({ 
        data: data.companyInfo.name + '\n',
        emphasis: true,
        width: 2,
        height: 2
      });
      
      if (data.companyInfo.address) {
        this.request.createTextElement({ data: data.companyInfo.address + '\n' });
      }
      if (data.companyInfo.phone) {
        this.request.createTextElement({ data: 'Tel: ' + data.companyInfo.phone + '\n' });
      }
      if (data.companyInfo.tax_id) {
        this.request.createTextElement({ data: 'Tax ID: ' + data.companyInfo.tax_id + '\n' });
      }
      
      this.request.createRulerElement({ thickness: 'medium' });
    }

    // Custom header text
    if (data.headerText) {
      this.request.createTextElement({ 
        data: data.headerText + '\n',
        emphasis: true
      });
    }

    // Order information
    this.request.createAlignmentElement({ position: 'left' });
    this.request.createTextElement({ 
      data: `Order #: ${data.orderNumber.slice(0, 8)}\n`
    });
    this.request.createTextElement({ 
      data: `Customer: ${data.customerName}\n`
    });
    if (data.cartName && data.cartNumber) {
      this.request.createTextElement({ 
        data: `Cart: ${data.cartName} ${data.cartNumber}\n`
      });
    }
    if (data.processedBy) {
      this.request.createTextElement({ 
        data: `Processed by: ${data.processedBy}\n`
      });
    }
    this.request.createTextElement({ 
      data: `Date: ${data.date.toLocaleString()}\n`
    });

    this.request.createRulerElement({ thickness: 'medium' });

    // Items header
    this.request.createTextElement({ 
      data: this.padRight('Item', charWidth - 10) + this.padLeft('Amount', 10) + '\n',
      emphasis: true
    });

    // Items
    data.items.forEach(item => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      this.request.createTextElement({ 
        data: this.padRight(item.name, charWidth - 10) + this.padLeft('$' + itemTotal, 10) + '\n'
      });
      this.request.createTextElement({ 
        data: `  ${item.quantity}x @ $${item.price} (${item.box_size || 'N/A'})\n`,
        font: 'font_b'
      });
    });

    this.request.createRulerElement({ thickness: 'medium' });

    // Totals
    const subtotal = (data.total - data.serviceFee).toFixed(2);
    this.request.createTextElement({ 
      data: this.padRight('Subtotal:', charWidth - 10) + this.padLeft('$' + subtotal, 10) + '\n'
    });

    if (data.serviceFee > 0) {
      this.request.createTextElement({ 
        data: this.padRight('Service Fee:', charWidth - 10) + this.padLeft('$' + data.serviceFee.toFixed(2), 10) + '\n'
      });
    }

    this.request.createRulerElement({ thickness: 'thick' });
    
    this.request.createTextElement({ 
      data: this.padRight('TOTAL:', charWidth - 10) + this.padLeft('$' + data.total.toFixed(2), 10) + '\n',
      emphasis: true,
      width: 2,
      height: 2
    });

    // Footer
    if (data.footerText) {
      this.request.createRulerElement({ thickness: 'medium' });
      this.request.createAlignmentElement({ position: 'center' });
      this.request.createTextElement({ 
        data: data.footerText + '\n',
        emphasis: true
      });
    }

    // Powered by
    this.request.createAlignmentElement({ position: 'center' });
    this.request.createTextElement({ 
      data: '\nPowered by Commissary POS\n',
      font: 'font_b'
    });

    // Cut paper
    this.request.createCutPaperElement({ feed: true, type: 'partial' });

    return this.request;
  }

  // Helper methods for formatting
  private padRight(str: string, length: number): string {
    return str.length >= length 
      ? str.substring(0, length) 
      : str + ' '.repeat(length - str.length);
  }

  private padLeft(str: string, length: number): string {
    return str.length >= length 
      ? str.substring(0, length) 
      : ' '.repeat(length - str.length) + str;
  }
}

// Send print job to Star printer
export async function printToStarPrinter(
  printerIp: string, 
  receiptData: ReceiptData,
  paperWidth: number = 80
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const builder = new StarWebPrintBuilder();
      const request = builder.buildReceipt(receiptData, paperWidth);

      // Send to printer
      const url = `http://${printerIp}/StarWebPRNT/SendMessage`;
      
      request.onSuccess = () => {
        console.log('Print job sent successfully');
        resolve();
      };

      request.onError = (error: any) => {
        console.error('Print error:', error);
        reject(new Error(`Print failed: ${error.status || 'Unknown error'}`));
      };

      request.send(url);
    } catch (error) {
      reject(error);
    }
  });
}

// Check if Star printer is available
export async function checkStarPrinterConnection(printerIp: string): Promise<boolean> {
  try {
    const response = await fetch(`http://${printerIp}/StarWebPRNT/SendMessage`, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return true;
  } catch (error) {
    console.error('Star printer connection check failed:', error);
    return false;
  }
}
