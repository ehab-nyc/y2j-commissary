// Star Printer utilities for TSP143IV-UE with CloudPRNT support

// Lazy load Star WebPRNT scripts
let scriptsLoading = false;
let scriptsLoaded = false;

export async function loadStarPrinterScripts(): Promise<void> {
  if (scriptsLoaded) return;
  if (scriptsLoading) {
    // Wait for scripts to finish loading
    return new Promise((resolve) => {
      const checkLoaded = setInterval(() => {
        if (scriptsLoaded) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
    });
  }

  scriptsLoading = true;

  return new Promise((resolve, reject) => {
    const builder = document.createElement('script');
    builder.src = 'https://cdn.jsdelivr.net/gh/star-micronics/starwebprnt-sdk@main/Sample/js/StarWebPrintBuilder.js';
    builder.async = true;
    
    const trader = document.createElement('script');
    trader.src = 'https://cdn.jsdelivr.net/gh/star-micronics/starwebprnt-sdk@main/Sample/js/StarWebPrintTrader.js';
    trader.async = true;

    let builderLoaded = false;
    let traderLoaded = false;

    const checkBothLoaded = () => {
      if (builderLoaded && traderLoaded) {
        scriptsLoaded = true;
        scriptsLoading = false;
        resolve();
      }
    };

    builder.onload = () => {
      builderLoaded = true;
      checkBothLoaded();
    };

    trader.onload = () => {
      traderLoaded = true;
      checkBothLoaded();
    };

    builder.onerror = () => reject(new Error('Failed to load StarWebPrintBuilder'));
    trader.onerror = () => reject(new Error('Failed to load StarWebPrintTrader'));

    document.head.appendChild(builder);
    document.head.appendChild(trader);
  });
}

export interface StarPrinterSettings {
  printerIp: string;
  paperWidth: number;
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

// Build receipt content using Star WebPRNT commands
export async function buildStarReceipt(data: ReceiptData, paperWidth: number = 80): Promise<string> {
  // Ensure scripts are loaded
  await loadStarPrinterScripts();
  
  // Check if Star WebPRNT is available
  if (typeof (window as any).StarWebPrintBuilder === 'undefined') {
    throw new Error('Star WebPRNT library not loaded');
  }

  const builder = new (window as any).StarWebPrintBuilder();
  const charWidth = paperWidth === 58 ? 32 : 48;
  
  let request = '';
  
  // Initialize
  request += builder.createInitializationElement();
  
  // Center alignment for header
  request += builder.createAlignmentElement({ position: 'center' });
  
  // Company info header
  if (data.companyInfo?.name) {
    request += builder.createTextElement({ 
      data: data.companyInfo.name + '\n',
      emphasis: true,
      width: 2,
      height: 2
    });
    
    if (data.companyInfo.address) {
      request += builder.createTextElement({ data: data.companyInfo.address + '\n' });
    }
    if (data.companyInfo.phone) {
      request += builder.createTextElement({ data: 'Tel: ' + data.companyInfo.phone + '\n' });
    }
    if (data.companyInfo.tax_id) {
      request += builder.createTextElement({ data: 'Tax ID: ' + data.companyInfo.tax_id + '\n' });
    }
    
    request += builder.createTextElement({ data: '--------------------------------\n' });
  }

  // Custom header text
  if (data.headerText) {
    request += builder.createTextElement({ 
      data: data.headerText + '\n',
      emphasis: true
    });
  }

  // Order information - left aligned
  request += builder.createAlignmentElement({ position: 'left' });
  request += builder.createTextElement({ 
    data: `Order #: ${data.orderNumber.slice(0, 8)}\n`
  });
  request += builder.createTextElement({ 
    data: `Customer: ${data.customerName}\n`
  });
  if (data.cartName && data.cartNumber) {
    request += builder.createTextElement({ 
      data: `Cart: ${data.cartName} ${data.cartNumber}\n`
    });
  }
  if (data.processedBy) {
    request += builder.createTextElement({ 
      data: `Processed by: ${data.processedBy}\n`
    });
  }
  request += builder.createTextElement({ 
    data: `Date: ${data.date.toLocaleString()}\n`
  });

  request += builder.createTextElement({ data: '--------------------------------\n' });

  // Items header
  request += builder.createTextElement({ 
    data: padRight('Item', charWidth - 10) + padLeft('Amount', 10) + '\n',
    emphasis: true
  });

  // Items
  data.items.forEach(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    request += builder.createTextElement({ 
      data: padRight(item.name, charWidth - 10) + padLeft('$' + itemTotal, 10) + '\n'
    });
    request += builder.createTextElement({ 
      data: `  ${item.quantity}x @ $${item.price} (${item.box_size || 'N/A'})\n`
    });
  });

  request += builder.createTextElement({ data: '--------------------------------\n' });

  // Totals
  const subtotal = (data.total - data.serviceFee).toFixed(2);
  request += builder.createTextElement({ 
    data: padRight('Subtotal:', charWidth - 10) + padLeft('$' + subtotal, 10) + '\n'
  });

  if (data.serviceFee > 0) {
    request += builder.createTextElement({ 
      data: padRight('Service Fee:', charWidth - 10) + padLeft('$' + data.serviceFee.toFixed(2), 10) + '\n'
    });
  }

  request += builder.createTextElement({ data: '================================\n' });
  
  request += builder.createTextElement({ 
    data: padRight('TOTAL:', charWidth - 10) + padLeft('$' + data.total.toFixed(2), 10) + '\n',
    emphasis: true,
    width: 2,
    height: 2
  });

  // Footer
  if (data.footerText) {
    request += builder.createTextElement({ data: '--------------------------------\n' });
    request += builder.createAlignmentElement({ position: 'center' });
    request += builder.createTextElement({ 
      data: data.footerText + '\n',
      emphasis: true
    });
  }

  // Powered by
  request += builder.createAlignmentElement({ position: 'center' });
  request += builder.createTextElement({ 
    data: '\nPowered by Commissary POS\n'
  });

  // Cut paper
  request += builder.createCutPaperElement({ feed: true, type: 'partial' });

  return request;
}

// Helper methods for formatting
function padRight(str: string, length: number): string {
  return str.length >= length 
    ? str.substring(0, length) 
    : str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number): string {
  return str.length >= length 
    ? str.substring(0, length) 
    : ' '.repeat(length - str.length) + str;
}


// Legacy WebPRNT print function (deprecated)
// For direct IP printing via Star WebPRNT
export async function printToStarPrinter(
  printerIp: string, 
  receiptData: ReceiptData,
  paperWidth: number = 80
): Promise<void> {
  // Ensure scripts are loaded
  await loadStarPrinterScripts();
  
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof (window as any).StarWebPrintTrader === 'undefined') {
        reject(new Error('Star WebPRNT library not loaded'));
        return;
      }

      const request = await buildStarReceipt(receiptData, paperWidth);
      const url = `http://${printerIp}/StarWebPRNT/SendMessage`;
      const papertype = paperWidth === 58 ? 'normal' : 'normal';
      
      const trader = new (window as any).StarWebPrintTrader({ url, papertype });

      trader.onReceive = (response: any) => {
        console.log('Print job sent successfully', response);
        resolve();
      };

      trader.onError = (error: any) => {
        console.error('Print error:', error);
        reject(new Error(`Print failed: ${error.status || 'Unknown error'}`));
      };

      trader.sendMessage({ request });
    } catch (error) {
      reject(error);
    }
  });
}

// Check if Star printer is available (WebPRNT only)
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
