import { Card } from "@/components/ui/card";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  box_size?: string;
}

interface ReceiptPreviewProps {
  orderNumber: string;
  customerName: string;
  items: ReceiptItem[];
  total: number;
  serviceFee: number;
  date: Date;
  cartName?: string | null;
  cartNumber?: string | null;
  processedBy?: string | null;
  template?: {
    header_text: string;
    footer_text: string;
    show_company_info: boolean;
    show_logo?: boolean;
    paper_width: number;
    logo_size?: number;
    logo_position?: 'left' | 'center' | 'right';
  };
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    tax_id: string;
  };
  logoUrl?: string | null;
}

export function ReceiptPreview({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
  cartName,
  cartNumber,
  processedBy,
  template,
  companyInfo,
  logoUrl,
}: ReceiptPreviewProps) {
  const subtotal = total - serviceFee;
  const paperWidth = template?.paper_width || 80;
  const logoSize = template?.logo_size || 100;
  const logoPosition = template?.logo_position || 'center';
  
  const getLogoAlignment = () => {
    switch (logoPosition) {
      case 'left': return 'items-start';
      case 'right': return 'items-end';
      default: return 'items-center';
    }
  };

  return (
    <Card
      className="mx-auto p-6 font-mono text-sm bg-white text-black"
      style={{ width: `${paperWidth}mm`, maxWidth: "100%" }}
    >
      {/* Header */}
      <div className="border-b-2 border-dashed border-black pb-4 mb-4">
        <div className={`flex gap-3 ${getLogoAlignment()}`}>
          {template?.show_logo && logoUrl && (
            <div className="flex-shrink-0">
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                style={{ maxHeight: `${logoSize}px` }}
                className="w-auto h-auto object-contain"
              />
            </div>
          )}
          {template?.show_company_info && companyInfo && (
            <div className="flex-1 text-left">
              <h2 className="text-base font-bold mb-1">{companyInfo.name}</h2>
              {companyInfo.address && (
                <p className="text-xs leading-tight">{companyInfo.address}</p>
              )}
              {companyInfo.phone && (
                <p className="text-xs leading-tight">{companyInfo.phone}</p>
              )}
              {companyInfo.tax_id && (
                <p className="text-xs leading-tight mt-1">Tax ID: {companyInfo.tax_id}</p>
              )}
            </div>
          )}
        </div>
        {template?.header_text && (
          <p className="text-xs mt-3 text-center">{template.header_text}</p>
        )}
      </div>

      {/* Order Info */}
      <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3">
        <div className="flex justify-between">
          <span>Order #:</span>
          <span className="font-bold">{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{customerName}</span>
        </div>
        {(cartName || cartNumber) && (
          <div className="flex justify-between">
            <span>Cart:</span>
            <span>{cartName || ''} {cartNumber || ''}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{date.toLocaleString()}</span>
        </div>
        {processedBy && (
          <div className="flex justify-between">
            <span>Processed by:</span>
            <span>{processedBy}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 border-b border-dashed border-black pb-3 mb-3">
        <div className="font-bold flex justify-between">
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between">
              <span className="flex-1">
                {item.name}
                {item.box_size && item.box_size !== "1 box" && (
                  <span className="text-xs"> ({item.box_size})</span>
                )}
              </span>
              <span className="ml-2">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-600">
              {item.quantity} x ${item.price.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 border-b-2 border-black pb-3 mb-3">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service Fee:</span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base mt-2">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      {template?.footer_text && (
        <div className="text-center text-xs mt-4">
          <p>{template.footer_text}</p>
        </div>
      )}
    </Card>
  );
}
