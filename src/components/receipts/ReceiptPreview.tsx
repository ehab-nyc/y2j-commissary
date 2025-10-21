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
  template?: {
    header_text: string;
    footer_text: string;
    show_company_info: boolean;
    paper_width: number;
  };
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    tax_id: string;
  };
}

export function ReceiptPreview({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
  template,
  companyInfo,
}: ReceiptPreviewProps) {
  const subtotal = total - serviceFee;
  const paperWidth = template?.paper_width || 80;

  return (
    <Card
      className="mx-auto p-6 font-mono text-sm bg-white text-black"
      style={{ width: `${paperWidth}mm`, maxWidth: "100%" }}
    >
      {/* Header */}
      <div className="text-center space-y-2 border-b-2 border-dashed border-black pb-4 mb-4">
        {template?.show_company_info && companyInfo && (
          <>
            <h2 className="text-lg font-bold">{companyInfo.name}</h2>
            {companyInfo.address && (
              <p className="text-xs">{companyInfo.address}</p>
            )}
            {companyInfo.phone && <p className="text-xs">{companyInfo.phone}</p>}
            {companyInfo.tax_id && (
              <p className="text-xs">Tax ID: {companyInfo.tax_id}</p>
            )}
          </>
        )}
        {template?.header_text && (
          <p className="text-xs mt-2">{template.header_text}</p>
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
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{date.toLocaleString()}</span>
        </div>
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
