import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { ReceiptPreview } from "./ReceiptPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";

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
}

export function PrintReceipt({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print receipts");
      return;
    }

    const receiptContent = document.getElementById("receipt-content");
    if (!receiptContent) return;

    // Sanitize HTML to prevent XSS attacks
    const sanitizedHTML = DOMPurify.sanitize(receiptContent.innerHTML, {
      ALLOWED_TAGS: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['class', 'style'],
    });

    const paperWidth = template?.paper_width || 80;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${orderNumber}</title>
          <style>
            @media print {
              @page { 
                margin: 0;
                size: ${paperWidth}mm auto;
              }
              body { 
                margin: 0;
                padding: 0;
              }
            }
            body { 
              font-family: 'Courier New', monospace;
              width: ${paperWidth}mm;
              margin: 0 auto;
              padding: 2mm;
              font-size: 12px;
              line-height: 1.4;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${sanitizedHTML}
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
    <div>
      <Button onClick={handlePrint} variant="outline" className="gap-2">
        <Printer className="h-4 w-4" />
        Print Receipt
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
            template={{
              header_text: template.header_text || "",
              footer_text: template.footer_text || "",
              show_company_info: template.show_company_info,
              paper_width: template.paper_width,
            }}
            companyInfo={companySettings}
          />
        )}
      </div>
    </div>
  );
}
