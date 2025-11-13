import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, Eye } from "lucide-react";
import { ReceiptPreview } from "./ReceiptPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [previewOpen, setPreviewOpen] = useState(false);
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
    <>
      <div className="flex gap-2 flex-col sm:flex-row w-full">
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 flex-1">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Receipt Preview</DialogTitle>
              <DialogDescription>
                Preview the receipt before printing
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
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
                template={template}
                companyInfo={{
                  name: companySettings?.name || "",
                  address: companySettings?.address || "",
                  phone: companySettings?.phone || "",
                  tax_id: companySettings?.tax_id || "",
                }}
                logoUrl={companyLogo || undefined}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button 
                variant="default" 
                className="gap-2" 
                onClick={() => {
                  handleBrowserPrint();
                  setPreviewOpen(false);
                }}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button variant="default" className="gap-2 flex-1" onClick={handleBrowserPrint}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

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
    </>
  );
}
