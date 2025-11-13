import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildStarReceipt, ReceiptData } from '@/lib/starPrinter';

interface PrintWithStarProps {
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
}

export function PrintWithStar({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
  cartName,
  cartNumber,
  processedBy,
}: PrintWithStarProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintToStar = async () => {
    try {
      setIsPrinting(true);

      // Fetch Star printer settings from app_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['star_printer_ip', 'star_printer_width', 'star_printer_enabled']);

      if (settingsError) {
        toast.error('Failed to load printer settings');
        setIsPrinting(false);
        return;
      }

      // Parse settings
      const settingsMap: Record<string, string> = {};
      settingsData?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || '';
      });

      if (!settingsMap.star_printer_enabled || settingsMap.star_printer_enabled !== 'true') {
        toast.error('Star printer is disabled. Please enable it in Hardware Setup.');
        setIsPrinting(false);
        return;
      }

      if (!settingsMap.star_printer_ip) {
        toast.error('Star printer IP address not set. Please configure it in Hardware Setup.');
        setIsPrinting(false);
        return;
      }

      const printerIp = settingsMap.star_printer_ip;
      const paperWidth = parseInt(settingsMap.star_printer_width || '80');

      // Build receipt data
      const receiptData: ReceiptData = {
        orderNumber: orderNumber.slice(0, 8),
        date: date,
        customerName: customerName,
        cartName: cartName || undefined,
        cartNumber: cartNumber || undefined,
        processedBy: processedBy || undefined,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          box_size: item.box_size,
        })),
        total: total,
        serviceFee: serviceFee,
      };

      // Build Star WebPRNT commands (this loads the scripts from the printer)
      const printerCommands = await buildStarReceipt(
        receiptData,
        printerIp,
        paperWidth
      );

      // Check if StarWebPrintTrader is available
      if (typeof (window as any).StarWebPrintTrader === 'undefined') {
        toast.error('Star printer library failed to load. Please refresh the page.');
        setIsPrinting(false);
        return;
      }

      // Send to printer using Star WebPRNT (using already loaded scripts)
      const printerUrl = `http://${printerIp}/StarWebPRNT/SendMessage`;
      
      const trader = new (window as any).StarWebPrintTrader({
        url: printerUrl,
        timeout: 10000
      });

      trader.onReceive = (response: any) => {
        console.log('Print success:', response);
        toast.success('Receipt sent to Star printer successfully!');
        setIsPrinting(false);
      };

      trader.onError = (response: any) => {
        console.error('Print error:', response);
        toast.error(`Print failed: ${response.message || 'Unknown error'}`);
        setIsPrinting(false);
      };

      // Send the print job
      trader.sendMessage({ request: printerCommands });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (isPrinting) {
          toast.error('Print timeout. Please check printer connection.');
          setIsPrinting(false);
        }
      }, 15000);
    } catch (error) {
      console.error('Star print error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to print';
      toast.error(errorMessage);
      setIsPrinting(false);
    }
  };

  return (
    <Button
      onClick={handlePrintToStar}
      disabled={isPrinting}
      variant="outline"
      className="gap-2"
    >
      <Printer className="h-4 w-4" />
      {isPrinting ? 'Printing...' : 'Print to Star Printer'}
    </Button>
  );
}
