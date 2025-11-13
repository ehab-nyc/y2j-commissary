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

      // Build Star WebPRNT commands
      const printerCommands = await buildStarReceipt(
        receiptData,
        paperWidth
      );

      // Send to printer using Star WebPRNT
      const printerUrl = `http://${printerIp}/StarWebPRNT/SendMessage`;
      
      // Create a hidden iframe to send the print job
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="http://${printerIp}/StarWebPRNT/StarWebPrintBuilder.js"></script>
            <script src="http://${printerIp}/StarWebPRNT/StarWebPrintTrader.js"></script>
          </head>
          <body>
            <script>
              window.onload = function() {
                try {
                  var trader = new StarWebPrintTrader({
                    url: '${printerUrl}',
                    timeout: 10000
                  });
                  
                  trader.onReceive = function(response) {
                    window.parent.postMessage({ success: true }, '*');
                  };
                  
                  trader.onError = function(response) {
                    window.parent.postMessage({ success: false, error: response.message }, '*');
                  };
                  
                  trader.sendMessage({ request: ${JSON.stringify(printerCommands)} });
                } catch (error) {
                  window.parent.postMessage({ success: false, error: error.message }, '*');
                }
              };
            </script>
          </body>
          </html>
        `);
        doc.close();

        // Listen for print result
        const handleMessage = (event: MessageEvent) => {
          if (event.data.success !== undefined) {
            window.removeEventListener('message', handleMessage);
            document.body.removeChild(iframe);
            
            if (event.data.success) {
              toast.success('Receipt sent to Star printer successfully!');
            } else {
              toast.error(`Print failed: ${event.data.error || 'Unknown error'}`);
            }
            setIsPrinting(false);
          }
        };
        window.addEventListener('message', handleMessage);

        // Timeout after 15 seconds
        setTimeout(() => {
          if (iframe.parentNode) {
            window.removeEventListener('message', handleMessage);
            document.body.removeChild(iframe);
            toast.error('Print timeout. Please check printer connection.');
            setIsPrinting(false);
          }
        }, 15000);
      }
    } catch (error) {
      console.error('Star print error:', error);
      toast.error('Failed to print to Star printer');
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
