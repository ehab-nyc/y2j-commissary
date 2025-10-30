import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, ChevronDown, Cloud, FileText } from "lucide-react";
import { ReceiptPreview } from "./ReceiptPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queueCloudPRNTJob, type ReceiptData } from "@/lib/starPrinter";

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

  // Fetch CloudPRNT settings
  const { data: cloudPrinterSettings } = useQuery({
    queryKey: ["cloudprnt-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["cloudprnt_printer_mac", "star_paper_width", "cloudprnt_enabled"]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      return {
        printerMac: settingsMap.cloudprnt_printer_mac || "",
        paperWidth: parseInt(settingsMap.star_paper_width || "80"),
        enabled: settingsMap.cloudprnt_enabled === "true",
      };
    },
  });

  const handleCloudPrint = async () => {
    if (!cloudPrinterSettings?.enabled) {
      toast.error("CloudPRNT not enabled. Configure in Receipt Settings.");
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

      await queueCloudPRNTJob(
        cloudPrinterSettings.printerMac,
        receiptData,
        cloudPrinterSettings.paperWidth,
        supabase
      );

      toast.success("Print job queued! Printer will print shortly.");
    } catch (error) {
      console.error("CloudPRNT error:", error);
      toast.error("Failed to queue print job.");
    }
  };

  const handleBrowserPrint = () => {
    const receiptElement = document.getElementById("receipt-content");
    if (!receiptElement) {
      toast.error("Receipt template not loaded");
      return;
    }

    // Create a temporary container for print
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${orderNumber}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1.6cm; }
            }
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${receiptElement.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };


  return (
    <div className="flex gap-2">
      {cloudPrinterSettings?.enabled ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="gap-2">
              <Printer className="h-4 w-4" />
              CloudPRNT
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background z-50">
            <DropdownMenuItem onClick={handleCloudPrint} className="gap-2 cursor-pointer">
              <Cloud className="h-4 w-4" />
              Send to CloudPRNT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBrowserPrint} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Print Browser Receipt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="text-sm text-muted-foreground">
          Enable CloudPRNT in Receipt Settings to print
        </div>
      )}

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
