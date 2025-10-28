import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { ReceiptPreview } from "./ReceiptPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { printToStarPrinter, type ReceiptData } from "@/lib/starPrinter";

interface PrintReceiptProps {
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

export function PrintReceipt({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
  cartName,
  cartNumber,
  processedBy,
}: PrintReceiptProps) {
  const { data: template } = useQuery({
    queryKey: ["receipt-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "company_name",
          "receipt_company_address",
          "receipt_company_phone",
          "receipt_tax_id",
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      return {
        name: settingsMap.company_name || "",
        address: settingsMap.receipt_company_address || "",
        phone: settingsMap.receipt_company_phone || "",
        tax_id: settingsMap.receipt_tax_id || "",
      };
    },
  });

  const { data: companyLogo } = useQuery({
    queryKey: ["company-logo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_logos")
        .select("logo_url")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data?.logo_url || null;
    },
  });

  const { data: starPrinterSettings } = useQuery({
    queryKey: ["star-printer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["star_printer_ip", "star_printer_width", "star_printer_enabled"]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      return {
        printerIp: settingsMap.star_printer_ip || "",
        paperWidth: parseInt(settingsMap.star_printer_width || "80"),
        enabled: settingsMap.star_printer_enabled === "true",
      };
    },
  });

  const handleStarPrint = async () => {
    if (!starPrinterSettings?.enabled) {
      toast.error("Star printer not enabled. Please configure in Receipt Settings.");
      return;
    }

    if (!starPrinterSettings.printerIp) {
      toast.error("Printer IP not configured. Please set in Receipt Settings.");
      return;
    }

    // Check if Star WebPRNT library is loaded
    if (typeof (window as any).StarWebPrintBuilder === 'undefined') {
      toast.error("Loading Star printer library...");
      
      // Load the library
      const script = document.createElement('script');
      script.src = 'https://www.star-m.jp/products/s_print/sdk/starwebprintbuilder_v1.0.0.js';
      script.async = true;
      script.onload = () => {
        toast.success("Star printer library loaded. Please try again.");
      };
      script.onerror = () => {
        toast.error("Failed to load Star printer library");
      };
      document.head.appendChild(script);
      return;
    }

    try {
      const receiptData: ReceiptData = {
        orderNumber,
        customerName,
        items,
        total,
        serviceFee,
        date,
        cartName,
        cartNumber,
        processedBy,
        companyInfo: companySettings,
        headerText: template?.header_text || "",
        footerText: template?.footer_text || "",
        showLogo: template?.show_logo,
        logoUrl: companyLogo,
      };

      await printToStarPrinter(
        starPrinterSettings.printerIp,
        receiptData,
        starPrinterSettings.paperWidth
      );

      toast.success("Printing to Star printer...");
    } catch (error) {
      console.error("Star print error:", error);
      toast.error("Failed to print. Check printer connection.");
    }
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print receipts");
      return;
    }

    const receiptContent = document.getElementById("receipt-content");
    if (!receiptContent) return;

    // Get computed styles from the original element
    const allStyles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    const paperWidth = template?.paper_width || 80;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${orderNumber}</title>
          <style>
            ${allStyles}
            
            @media print {
              @page { 
                margin: 0;
                size: ${paperWidth}mm auto;
              }
              body { 
                margin: 0;
                padding: 0;
              }
              /* Hide browser print headers/footers */
              html, body {
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            body { 
              font-family: 'Courier New', monospace;
              width: ${paperWidth}mm;
              margin: 0 auto;
              padding: 0;
              font-size: 12px;
              line-height: 1.4;
              background: white;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${receiptContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast.success("Printing receipt...");
  };

  return (
    <div className="flex gap-2">
      {starPrinterSettings?.enabled && (
        <Button onClick={handleStarPrint} variant="default" className="gap-2">
          <Printer className="h-4 w-4" />
          Print (Star)
        </Button>
      )}
      <Button onClick={handleBrowserPrint} variant="outline" className="gap-2">
        <Printer className="h-4 w-4" />
        {starPrinterSettings?.enabled ? "Browser Print" : "Print Receipt"}
      </Button>

      <div id="receipt-content" className="hidden">
        {template && companySettings && (
          <ReceiptPreview
            orderNumber={orderNumber}
            customerName={customerName}
            items={items}
            total={total}
            serviceFee={serviceFee}
            date={date}
            cartName={cartName}
            cartNumber={cartNumber}
            processedBy={processedBy}
            template={{
              header_text: template.header_text || "",
              footer_text: template.footer_text || "",
              show_company_info: template.show_company_info,
              show_logo: template.show_logo,
              paper_width: template.paper_width,
            }}
            companyInfo={companySettings}
            logoUrl={companyLogo}
          />
        )}
      </div>
    </div>
  );
}
