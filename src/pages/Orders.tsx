import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Trash2, Edit, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TranslateButton } from '@/components/TranslateButton';
import { PrintReceiptDialog } from '@/components/receipts/PrintReceiptDialog';
import { ArrowUpDown } from 'lucide-react';

type SortField = 'created_at' | 'status' | 'total' | 'customer' | 'cart';
type SortDirection = 'asc' | 'desc';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  box_size: string;
  product_id: string;
  order_id: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
  profiles?: {
    full_name: string | null;
    email: string;
    cart_name: string | null;
    cart_number: string | null;
  } | null;
  assigned_worker?: {
    full_name: string | null;
    email: string;
  } | null;
}

const Orders = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [serviceFee, setServiceFee] = useState<number>(10);
  const [translatedNotes, setTranslatedNotes] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchOrders();
    fetchCompanySettings();
    fetchServiceFee();
  }, []);

  const fetchServiceFee = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'service_fee')
      .single();
    
    if (data) {
      setServiceFee(parseFloat(data.value) || 10);
    }
  };

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'logo_url', 'company_address', 'company_email']);
    
    if (data) {
      const nameEntry = data.find(s => s.key === 'company_name');
      const logoEntry = data.find(s => s.key === 'logo_url');
      const addressEntry = data.find(s => s.key === 'company_address');
      const emailEntry = data.find(s => s.key === 'company_email');
      setCompanyName(nameEntry?.value || 'Company');
      setLogoUrl(logoEntry?.value || '');
      setCompanyAddress(addressEntry?.value || '');
      setCompanyEmail(emailEntry?.value || '');
    }
  };

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(full_name, email, cart_name, cart_number),
        assigned_worker:profiles!orders_assigned_worker_id_fkey(full_name, email),
        order_items(
          id,
          quantity,
          price,
          box_size,
          product_id,
          order_id,
          products(name)
        )
      `);

    // Only filter by customer_id for customers, staff see all orders
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    const isStaff = roles?.some(r => ['worker', 'manager', 'admin', 'super_admin'].includes(r.role));
    
    if (!isStaff) {
      query = query.eq('customer_id', user?.id);
    }
    
    query = query.is('deleted_at', null);
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const deleteOrderItem = async (itemId: string, orderId: string) => {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to delete item');
      return;
    }

    // Check if order has any remaining items
    const { data: remainingItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

    // If no items left, delete the order
    if (!remainingItems || remainingItems.length === 0) {
      await supabase.from('orders').delete().eq('id', orderId);
      toast.success('Order deleted (no items remaining)');
    } else {
      // Recalculate order total
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price')
        .eq('order_id', orderId);
      
      const newTotal = items?.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;
      
      await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);
      
      toast.success('Item removed from order');
    }

    fetchOrders();
  };

  const editOrderItem = async (item: OrderItem, orderId: string) => {
    // Verify order is still in pending status before allowing edit
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      toast.error('Failed to load order details');
      return;
    }

    if (order.status !== 'pending') {
      toast.error('Cannot edit orders that are being processed or completed');
      return;
    }

    // Store single item in sessionStorage to repopulate cart (cleared on tab close)
    const cartItem = {
      productId: item.product_id,
      quantity: item.quantity,
      boxSize: item.box_size,
    };
    
    sessionStorage.setItem('editOrderCart', JSON.stringify([cartItem]));
    sessionStorage.setItem('editOrderId', orderId);
    sessionStorage.setItem('editOrderItemId', item.id);
    sessionStorage.setItem('keepOrderId', 'true'); // Flag to keep same order
    
    toast.success('Redirecting to edit item...');
    navigate('/products');
  };

  const deleteOrder = async (orderId: string) => {
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      toast.error('Failed to delete order items');
      return;
    }

    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      toast.error('Failed to delete order');
      return;
    }

    toast.success('Order deleted successfully');
    fetchOrders();
  };

  const handleNotesEdit = (orderId: string, currentNotes: string | null) => {
    setEditingNotes(orderId);
    setNotesText(currentNotes || '');
  };

  const saveNotes = async (orderId: string) => {
    // Validation schema for notes
    const notesSchema = z.string().max(1000, 'Notes cannot exceed 1000 characters').trim();

    const validation = notesSchema.safeParse(notesText);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ notes: validation.data })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to save notes');
      return;
    }

    toast.success('Notes saved successfully');
    setEditingNotes(null);
    fetchOrders();
  };

  const cancelNotesEdit = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === 'total') {
      comparison = a.total - b.total;
    } else if (sortField === 'customer') {
      const nameA = a.profiles?.full_name || '';
      const nameB = b.profiles?.full_name || '';
      comparison = nameA.localeCompare(nameB);
    } else if (sortField === 'cart') {
      const cartA = a.profiles?.cart_name || a.profiles?.cart_number || '';
      const cartB = b.profiles?.cart_name || b.profiles?.cart_number || '';
      comparison = cartA.localeCompare(cartB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Create receipt data matching ReceiptTemplate format
    const receiptData = {
      id: order.id,
      created_at: order.created_at,
      customer_name: order.profiles?.full_name || 'Walk-in',
      cart_name: order.profiles?.cart_name || '',
      cart_number: order.profiles?.cart_number || '',
      processed_by: order.assigned_worker?.full_name || order.assigned_worker?.email || 'N/A',
      items: order.order_items.map(item => ({
        product_name: item.products.name,
        quantity: item.quantity,
        price: item.price,
        box_size: item.box_size || '1 box'
      })),
      total: order.total,
      service_fee: serviceFee,
      notes: order.notes
    };

    // Fetch template and company info
    Promise.all([
      supabase
        .from("receipt_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("app_settings")
        .select("*")
        .in("key", ["company_name", "receipt_company_address", "receipt_company_phone", "receipt_tax_id"]),
      supabase
        .from("company_logos")
        .select("logo_url")
        .eq("is_active", true)
        .maybeSingle()
    ])
      .then(([{ data: template }, { data: settings }, { data: logo }]) => {
        const settingsMap: Record<string, string> = {};
        settings?.forEach((setting) => {
          settingsMap[setting.key] = setting.value || "";
        });

        const companyInfo = {
          company_name: settingsMap.company_name || "Commissary",
          address: settingsMap.receipt_company_address || "",
          phone: settingsMap.receipt_company_phone || "",
          tax_id: settingsMap.receipt_tax_id || "",
          logo_url: logo?.logo_url || ""
        };

        // Generate receipt HTML using ReceiptTemplate structure
        const receiptHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${order.id.slice(0, 8)}</title>
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
                  max-width: ${template?.paper_width || 80}mm;
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
                ${template?.show_company_info ? `
                  <div class="text-center border-b-2">
                    ${template?.show_logo && companyInfo.logo_url ? `
                      <img src="${companyInfo.logo_url}" alt="Logo" />
                    ` : ''}
                    <h1 class="text-lg font-bold">${companyInfo.company_name}</h1>
                    ${companyInfo.address ? `<p class="text-xs">${companyInfo.address}</p>` : ''}
                    ${companyInfo.phone ? `<p class="text-xs">Tel: ${companyInfo.phone}</p>` : ''}
                    ${companyInfo.tax_id ? `<p class="text-xs">Tax ID: ${companyInfo.tax_id}</p>` : ''}
                  </div>
                ` : ''}
                
                ${template?.header_text ? `
                  <div class="text-center mb-4 font-bold">${template.header_text}</div>
                ` : ''}
                
                <div class="mb-4 text-xs">
                  <table>
                    <tr>
                      <td>Order #: ${receiptData.id.slice(0, 8)}</td>
                      <td style="text-align: right;">Customer: ${receiptData.customer_name}</td>
                    </tr>
                    <tr>
                      <td>Cart: ${receiptData.cart_name} ${receiptData.cart_number}</td>
                      <td style="text-align: right;">Processed by: ${receiptData.processed_by}</td>
                    </tr>
                  </table>
                  <p style="margin-top: 4px;">Date: ${new Date(receiptData.created_at).toLocaleString()}</p>
                </div>
                
                <div class="border-t-2 border-b-2" style="padding: 8px 0; margin-bottom: 16px;">
                  <div class="flex justify-between font-bold mb-2">
                    <span>Item</span>
                    <span>Amount</span>
                  </div>
                  ${receiptData.items.map(item => `
                    <div class="item-row">
                      <div class="flex justify-between">
                        <span>${item.product_name}</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div class="item-details">
                        ${item.quantity}x @ $${item.price} (${item.box_size})
                      </div>
                    </div>
                  `).join('')}
                </div>
                
                <div class="mb-4">
                  <div class="flex justify-between" style="margin-bottom: 4px;">
                    <span>Subtotal:</span>
                    <span>$${(receiptData.total - (receiptData.service_fee || 0)).toFixed(2)}</span>
                  </div>
                  ${receiptData.service_fee > 0 ? `
                    <div class="flex justify-between" style="margin-bottom: 4px;">
                      <span>Service Fee:</span>
                      <span>$${receiptData.service_fee.toFixed(2)}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between font-bold text-base border-t-2" style="padding-top: 8px;">
                    <span>TOTAL:</span>
                    <span>$${receiptData.total.toFixed(2)}</span>
                  </div>
                </div>
                
                ${receiptData.notes ? `
                  <div class="mb-4 text-xs" style="border-top: 1px solid #ccc; padding-top: 8px;">
                    <p class="font-bold">Notes:</p>
                    <p>${receiptData.notes}</p>
                  </div>
                ` : ''}
                
                ${template?.show_barcode ? `
                  <div class="text-center mb-4">
                    <div style="font-family: monospace; font-size: 10px; letter-spacing: 2px;">
                      ${receiptData.id.slice(0, 12).toUpperCase()}
                    </div>
                  </div>
                ` : ''}
                
                ${template?.footer_text ? `
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
      })
      .catch((error) => {
        console.error('Error printing receipt:', error);
        toast.error("Failed to load receipt template");
        printWindow.close();
      });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold">{t('orders.title')}</h1>
          <p className="text-muted-foreground">{t('orders.subtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('orders.noOrders')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('created_at')}
                className="gap-1"
              >
                Date <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('customer')}
                className="gap-1"
              >
                Customer <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('cart')}
                className="gap-1"
              >
                Cart <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('status')}
                className="gap-1"
              >
                Status <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('total')}
                className="gap-1"
              >
                Total <ArrowUpDown className="w-3 h-3" />
              </Button>
            </div>
            {sortedOrders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || 'N/A'}
                      </CardDescription>
                      {(order.profiles?.cart_name || order.profiles?.cart_number) && (
                        <CardDescription>
                          Cart: {order.profiles?.cart_name || ''} {order.profiles?.cart_number || ''}
                        </CardDescription>
                      )}
                      <CardDescription>
                        {format(new Date(order.created_at), 'PPp')}
                      </CardDescription>
                      {order.assigned_worker && (
                        <CardDescription>
                          Processed by: {order.assigned_worker.full_name || order.assigned_worker.email}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <span className="text-lg font-bold text-primary">
                        ${order.total.toFixed(2)}
                      </span>
                      <PrintReceiptDialog
                        orderNumber={order.id.slice(0, 8)}
                        customerName={order.profiles?.full_name || 'N/A'}
                        items={order.order_items.map(item => ({
                          name: item.products.name,
                          quantity: item.quantity,
                          price: item.price,
                          box_size: item.box_size,
                        }))}
                        total={order.total}
                        serviceFee={serviceFee}
                        date={new Date(order.created_at)}
                        cartName={order.profiles?.cart_name}
                        cartNumber={order.profiles?.cart_number}
                        processedBy={order.assigned_worker?.full_name || order.assigned_worker?.email}
                        onPOSPrint={() => printOrder(order)}
                      />
                      {order.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-1">
                              <Trash2 className="w-3 h-3" />
                              Delete Order
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entire Order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this order and all its items.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(order.id)}>
                                Delete Order
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Box Size</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        {order.status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.products.name}</TableCell>
                          <TableCell>{item.box_size || '1 box'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                          {order.status === 'pending' && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editOrderItem(item, order.id)}
                                  className="gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-1">
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {item.products.name} from your order.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteOrderItem(item.id, order.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="border-t">
                        <TableCell colSpan={order.status === 'pending' ? 4 : 4} className="text-right font-medium">
                          Subtotal:
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(order.total - serviceFee).toFixed(2)}
                        </TableCell>
                        {order.status === 'pending' && <TableCell></TableCell>}
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={order.status === 'pending' ? 4 : 4} className="text-right font-medium">
                          Service Fee:
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${serviceFee.toFixed(2)}
                        </TableCell>
                        {order.status === 'pending' && <TableCell></TableCell>}
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={order.status === 'pending' ? 4 : 4} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ${order.total.toFixed(2)}
                        </TableCell>
                        {order.status === 'pending' && <TableCell></TableCell>}
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
                
                {/* Order Notes Section */}
                <CardContent className="border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Order Notes
                      </h4>
                      {editingNotes !== order.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNotesEdit(order.id, order.notes)}
                        >
                          {order.notes ? 'Edit Notes' : 'Add Notes'}
                        </Button>
                      )}
                    </div>
                    
                    {editingNotes === order.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add any special instructions or notes for your order..."
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(order.id)}>
                            Save Notes
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelNotesEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : order.notes ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {translatedNotes[order.id] || order.notes}
                        </div>
                        <TranslateButton
                          text={order.notes}
                          context="order notes"
                          size="sm"
                          onTranslated={(translated) => {
                            setTranslatedNotes(prev => ({
                              ...prev,
                              [order.id]: translated
                            }));
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No notes added
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;
