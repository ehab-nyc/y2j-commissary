import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { printToStarCloudPRNT, ReceiptData } from '@/lib/starPrinter';

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

      // Fetch Star CloudPRNT settings from app_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['star_cloudprnt_device_id', 'star_printer_width', 'star_cloudprnt_enabled']);

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

      if (!settingsMap.star_cloudprnt_enabled || settingsMap.star_cloudprnt_enabled !== 'true') {
        toast.error('Star CloudPRNT is disabled. Please enable it in Hardware Setup.');
        setIsPrinting(false);
        return;
      }

      if (!settingsMap.star_cloudprnt_device_id) {
        toast.error('Star CloudPRNT Device ID not set. Please configure it in Hardware Setup.');
        setIsPrinting(false);
        return;
      }

      const deviceId = settingsMap.star_cloudprnt_device_id;
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

      // Submit to CloudPRNT
      await printToStarCloudPRNT(deviceId, receiptData, paperWidth, supabase);

      toast.success('Print job submitted! Printer will print when it polls the server.');
      setIsPrinting(false);
    } catch (error) {
      console.error('CloudPRNT error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit print job';
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
      {isPrinting ? 'Submitting...' : 'Print to Star CloudPRNT'}
    </Button>
  );
}
