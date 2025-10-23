import { forwardRef } from "react";

interface ReceiptTemplateProps {
  order: any;
  template: any;
  companyInfo: any;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ order, template, companyInfo }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-[80mm] mx-auto font-mono text-sm"
        style={{ width: `${template?.paper_width || 80}mm` }}
      >
        {/* Header */}
        {template?.show_company_info && (
          <div className="text-center mb-4 border-b-2 border-black pb-4">
            {template?.show_logo && companyInfo?.logo_url && (
              <img
                src={companyInfo.logo_url}
                alt="Logo"
                className="h-16 mx-auto mb-2"
              />
            )}
            <h1 className="text-lg font-bold">{companyInfo?.company_name || "Commissary"}</h1>
            {companyInfo?.address && (
              <p className="text-xs">{companyInfo.address}</p>
            )}
            {companyInfo?.phone && (
              <p className="text-xs">Tel: {companyInfo.phone}</p>
            )}
            {companyInfo?.tax_id && (
              <p className="text-xs">Tax ID: {companyInfo.tax_id}</p>
            )}
          </div>
        )}

        {/* Custom Header Text */}
        {template?.header_text && (
          <div className="text-center mb-4 font-bold">
            {template.header_text}
          </div>
        )}

      {/* Order Info */}
      <div className="mb-4 text-xs">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="w-1/2">Order #: {order?.id?.slice(0, 8)}</td>
              <td className="w-1/2 text-right">Customer: {order?.customer_name || "Walk-in"}</td>
            </tr>
            <tr>
              <td className="w-1/2">Cart: {order?.cart_name || ''} {order?.cart_number || ''}</td>
              <td className="w-1/2 text-right">Processed by: {order?.processed_by || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1">Date: {new Date(order?.created_at).toLocaleString()}</p>
      </div>

        {/* Items */}
        <div className="border-t-2 border-b-2 border-black py-2 mb-4">
          <div className="flex justify-between font-bold mb-2">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {order?.items?.map((item: any, index: number) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between">
                <span>{item.product_name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600 ml-2">
                {item.quantity}x @ ${item.price} ({item.box_size})
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>${(order?.total - (order?.service_fee || 0)).toFixed(2)}</span>
          </div>
          {order?.service_fee > 0 && (
            <div className="flex justify-between mb-1">
              <span>Service Fee:</span>
              <span>${order.service_fee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2">
            <span>TOTAL:</span>
            <span>${order?.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Order Notes */}
        {order?.notes && (
          <div className="mb-4 text-xs border-t border-gray-300 pt-2">
            <p className="font-bold">Notes:</p>
            <p>{order.notes}</p>
          </div>
        )}

        {/* Barcode */}
        {template?.show_barcode && (
          <div className="text-center mb-4">
            <div className="font-mono text-xs tracking-widest">
              {order?.id?.slice(0, 12).toUpperCase()}
            </div>
          </div>
        )}

        {/* Footer */}
        {template?.footer_text && (
          <div className="text-center mt-4 border-t-2 border-black pt-4 font-bold">
            {template.footer_text}
          </div>
        )}

        <div className="text-center text-xs mt-4">
          Powered by Commissary POS
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
