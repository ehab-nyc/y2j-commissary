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
    if (!template || !companySettings) {
      toast.error("Receipt template not loaded");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    // Generate receipt HTML with inline styles matching the preview
    const receiptHtml = `
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
              background: white;
              color: black;
            }
            .receipt {
              max-width: ${template.paper_width || 80}mm;
              margin: 0 auto;
              font-size: 12px;
            }
            .text-center { text-align: center; }
            .border-b-2 { border-bottom: 2px solid black; padding-bottom: 16px; margin-bottom: 16px; }
            .border-t-2 { border-top: 2px solid black; padding-top: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .mt-4 { margin-top: 16px; }
            .pt-4 { padding-top: 16px; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 16px; }
            .text-xs { font-size: 10px; }
            .text-base { font-size: 14px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            .item-row { margin-bottom: 8px; }
            .item-details { font-size: 10px; color: #666; margin-left: 8px; }
            img { max-height: 64px; margin: 0 auto 8px; display: block; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${template.show_company_info ? `
              <div class="text-center border-b-2">
                ${template.show_logo && companyLogo ? `
                  <img src="${companyLogo}" alt="Logo" />
                ` : ''}
                <h1 class="text-lg font-bold">${companySettings.name}</h1>
                ${companySettings.address ? `<p class="text-xs">${companySettings.address}</p>` : ''}
                ${companySettings.phone ? `<p class="text-xs">Tel: ${companySettings.phone}</p>` : ''}
                ${companySettings.tax_id ? `<p class="text-xs">Tax ID: ${companySettings.tax_id}</p>` : ''}
              </div>
            ` : ''}
            
            ${template.header_text ? `
              <div class="text-center mb-4 font-bold">${template.header_text}</div>
            ` : ''}
            
            <div class="mb-4 text-xs">
              <table>
                <tr>
                  <td>Order #: ${orderNumber}</td>
                  <td style="text-align: right;">Customer: ${customerName}</td>
                </tr>
                <tr>
                  <td>Cart: ${cartName || ''} ${cartNumber || ''}</td>
                  <td style="text-align: right;">Processed by: ${processedBy || 'N/A'}</td>
                </tr>
              </table>
              <p style="margin-top: 4px;">Date: ${date.toLocaleString()}</p>
            </div>
            
            <div class="border-t-2 border-b-2" style="padding: 8px 0; margin-bottom: 16px;">
              <div class="flex justify-between font-bold mb-2">
                <span>Item</span>
                <span>Amount</span>
              </div>
              ${items.map(item => `
                <div class="item-row">
                  <div class="flex justify-between">
                    <span>${item.name}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div class="item-details">
                    ${item.quantity}x @ $${item.price} (${item.box_size || '1 box'})
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="mb-4">
              <div class="flex justify-between" style="margin-bottom: 4px;">
                <span>Subtotal:</span>
                <span>$${(total - serviceFee).toFixed(2)}</span>
              </div>
              ${serviceFee > 0 ? `
                <div class="flex justify-between" style="margin-bottom: 4px;">
                  <span>Service Fee:</span>
                  <span>$${serviceFee.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between font-bold text-base border-t-2" style="padding-top: 8px;">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
            
            ${template.show_barcode ? `
              <div class="text-center mb-4">
                <div style="font-family: monospace; font-size: 10px; letter-spacing: 2px;">
                  ${orderNumber.toUpperCase()}
                </div>
              </div>
            ` : ''}
            
            ${template.footer_text ? `
              <div class="text-center mt-4 border-t-2 pt-4 font-bold">
                ${template.footer_text}
              </div>
            ` : ''}
            
            <div class="text-center text-xs mt-4">
              Powered by Commissary POS
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
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
