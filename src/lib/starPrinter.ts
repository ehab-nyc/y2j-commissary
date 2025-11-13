// Star CloudPRNT utilities for TSP143IV-UE

export interface StarPrinterSettings {
  deviceId: string;
  paperWidth: 58 | 80;
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
  cartName?: string;
  cartNumber?: string;
  processedBy?: string;
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

/**
 * Build Star receipt data (plain text format for CloudPRNT)
 */
export function buildStarReceipt(
  data: ReceiptData,
  paperWidth: number = 80
): string {
  const lineWidth = paperWidth === 58 ? 32 : 48;
  let receipt = '';

  // Header
  receipt += centerText('RECEIPT', lineWidth) + '\n';
  receipt += centerText('Your Company Name', lineWidth) + '\n';
  receipt += centerText('123 Main Street', lineWidth) + '\n';
  receipt += centerText('City, State 12345', lineWidth) + '\n';
  receipt += centerText('Phone: (555) 123-4567', lineWidth) + '\n\n';

  // Order details
  receipt += '-'.repeat(lineWidth) + '\n';
  receipt += `Order #: ${data.orderNumber}\n`;
  receipt += `Date: ${data.date.toLocaleString()}\n`;
  receipt += `Customer: ${data.customerName}\n`;

  if (data.cartName) {
    receipt += `Cart: ${data.cartName}\n`;
  }
  if (data.cartNumber) {
    receipt += `Cart #: ${data.cartNumber}\n`;
  }
  if (data.processedBy) {
    receipt += `Processed by: ${data.processedBy}\n`;
  }

  receipt += '-'.repeat(lineWidth) + '\n\n';

  // Items header
  receipt += 'Items:\n';
  receipt += '-'.repeat(lineWidth) + '\n';

  // Items list
  for (const item of data.items) {
    const itemName = item.box_size ? `${item.name} (${item.box_size})` : item.name;
    const lineTotal = `$${(item.price * item.quantity).toFixed(2)}`;

    // Item name line
    receipt += itemName + '\n';

    // Quantity and price line
    const qty = `x${item.quantity}`;
    const qtyPriceLine = padRight(qty, lineWidth - lineTotal.length) + lineTotal;
    receipt += '  ' + qtyPriceLine + '\n';
  }

  receipt += '-'.repeat(lineWidth) + '\n';

  // Totals
  const subtotal = data.total - data.serviceFee;
  receipt += padRight('Subtotal:', lineWidth - 10) + padLeft(`$${subtotal.toFixed(2)}`, 10) + '\n';
  receipt += padRight('Service Fee:', lineWidth - 10) + padLeft(`$${data.serviceFee.toFixed(2)}`, 10) + '\n';
  receipt += '='.repeat(lineWidth) + '\n';
  receipt += padRight('TOTAL:', lineWidth - 10) + padLeft(`$${data.total.toFixed(2)}`, 10) + '\n';
  receipt += '='.repeat(lineWidth) + '\n\n';

  // Footer
  receipt += centerText('Thank you for your business!', lineWidth) + '\n';
  receipt += centerText('Visit us again soon', lineWidth) + '\n\n';

  return receipt;
}

/**
 * Helper function to pad string right
 */
function padRight(str: string, length: number): string {
  return str + ' '.repeat(Math.max(0, length - str.length));
}

/**
 * Helper function to pad string left
 */
function padLeft(str: string, length: number): string {
  return ' '.repeat(Math.max(0, length - str.length)) + str;
}

/**
 * Helper function to center text
 */
function centerText(str: string, lineWidth: number): string {
  const padding = Math.max(0, Math.floor((lineWidth - str.length) / 2));
  return ' '.repeat(padding) + str;
}

/**
 * Print to Star CloudPRNT
 */
export async function printToStarCloudPRNT(
  deviceId: string,
  receiptData: ReceiptData,
  paperWidth: number = 80,
  supabaseClient: any
): Promise<void> {
  // Build receipt (plain text)
  const receiptText = buildStarReceipt(receiptData, paperWidth);

  // Submit job to CloudPRNT endpoint
  const { data, error } = await supabaseClient.functions.invoke('star-cloudprnt', {
    body: {
      device_id: deviceId,
      job_data: {
        request: receiptText,
        mediaTypes: ['text/plain', 'application/vnd.star.starprnt'],
      },
    },
  });

  if (error) {
    console.error('CloudPRNT error:', error);
    throw new Error(`Failed to submit print job: ${error.message || 'Unknown error'}`);
  }

  console.log('Print job submitted:', data?.job_id);
}

/**
 * Check Star CloudPRNT connection
 */
export async function checkStarCloudPRNTConnection(
  deviceId: string,
  supabaseClient: any
): Promise<boolean> {
  try {
    // Test connection by calling the edge function with deviceId as query param
    const { error } = await supabaseClient.functions.invoke(`star-cloudprnt?deviceId=${deviceId}`);

    // If no error, connection is working
    return !error;
  } catch (error) {
    console.error('CloudPRNT connection test failed:', error);
    return false;
  }
}
