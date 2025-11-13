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
import { Printer, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { ReceiptPreview } from "./ReceiptPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Extended type for receipt template with new properties
type ReceiptTemplate = {
  header_text: string;
  footer_text: string;
  show_company_info: boolean;
  show_logo?: boolean;
  paper_width: number;
  show_barcode: boolean;
  text_size?: number;
  font_family?: string;
  print_margin?: number;
  logo_size?: number;
  logo_position?: 'left' | 'center' | 'right';
};

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
  const [zoom, setZoom] = useState(100);
  
  const { data: template } = useQuery<ReceiptTemplate | null>({
    queryKey: ["receipt-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ReceiptTemplate | null;
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

    const receiptHtml = generateReceiptHTML();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };


  const generateReceiptContent = () => {
    return `
      <div style="font-family: ${template?.font_family || 'Courier New, monospace'}; max-width: ${template?.paper_width || 80}mm; font-size: ${template?.text_size || 12}px; color: black; font-weight: 600;">
        ${template?.show_company_info ? `
          <div style="text-align: ${template?.logo_position || 'center'}; border-bottom: 2px solid black; padding-bottom: 16px; margin-bottom: 16px;">
            ${template?.show_logo && companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: ${template?.logo_size || 100}px; margin: 0 ${template?.logo_position === 'center' ? 'auto' : '0'} 8px ${template?.logo_position === 'right' ? 'auto' : '0'}; display: block; filter: contrast(1.2) brightness(0.9);" />` : ''}
            <h1 style="font-size: 16px; font-weight: bold; margin: 0;">${companySettings?.name}</h1>
            ${companySettings?.address ? `<p style="font-size: 10px; margin: 4px 0;">${companySettings.address}</p>` : ''}
            ${companySettings?.phone ? `<p style="font-size: 10px; margin: 4px 0;">Tel: ${companySettings.phone}</p>` : ''}
            ${companySettings?.tax_id ? `<p style="font-size: 10px; margin: 4px 0;">Tax ID: ${companySettings.tax_id}</p>` : ''}
          </div>
        ` : ''}
        
        ${template?.header_text ? `<div style="text-align: center; margin-bottom: 16px; font-weight: bold;">${template.header_text}</div>` : ''}
        
        <div style="margin-bottom: 16px; font-size: 10px;">
          <table style="width: 100%;">
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
        
        <div style="border-top: 2px solid black; border-bottom: 2px solid black; padding: 8px 0; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px;">
            <span>Item</span>
            <span>Amount</span>
          </div>
          ${items.map(item => `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div style="font-size: 10px; color: black; margin-left: 8px; font-weight: 500;">
                ${item.quantity}x @ $${item.price} (${item.box_size || '1 box'})
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>$${(total - serviceFee).toFixed(2)}</span>
          </div>
          ${serviceFee > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Service Fee:</span>
              <span>$${serviceFee.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 2px solid black; padding-top: 8px;">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
        
        ${template?.show_barcode ? `
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-family: monospace; font-size: 10px; letter-spacing: 2px;">
              ${orderNumber.toUpperCase()}
            </div>
          </div>
        ` : ''}
        
        ${template?.footer_text ? `
          <div style="text-align: center; margin-top: 16px; border-top: 2px solid black; padding-top: 16px; font-weight: bold;">
            ${template.footer_text}
          </div>
        ` : ''}
        
        <div style="text-align: center; font-size: 10px; margin-top: 16px;">
          Powered by Commissary POS
        </div>
      </div>
    `;
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${orderNumber}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: ${template?.print_margin || 1.6}cm; }
            }
            body {
              font-family: ${template?.font_family || 'Courier New, monospace'};
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
            }
          </style>
        </head>
        <body>
          ${generateReceiptContent()}
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;
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
              <DialogTitle className="flex items-center justify-between">
                <span>Receipt Preview</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-normal text-muted-foreground min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
              <DialogDescription>
                Preview the receipt before printing
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-auto">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  transition: "transform 0.2s ease-out",
                }}
              >
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
    </>
  );
}
