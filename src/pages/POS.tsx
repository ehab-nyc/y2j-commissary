import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Package, ShoppingCart, FileText, Wrench, Users, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Import existing page components
import ProductsPage from './Products';
import InventoryPage from './Inventory';
import OrdersPage from './Orders';
import PurchaseOrdersPage from './PurchaseOrders';
import ReceiptSettingsPage from './ReceiptSettings';
import HardwareSetupPage from './HardwareSetup';
import CustomersPage from './Customers';
import StockTakePage from './StockTake';
import EmployeeShiftsPage from './EmployeeShifts';
import AnalyticsPage from './Analytics';

const POS = () => {
  const { hasRole } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground">Manage all POS operations in one place</p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mx-auto mb-6">
          <TabsTrigger value="products" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Products
          </TabsTrigger>
          
          {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" />
              Inventory
            </TabsTrigger>
          )}
          
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Orders
          </TabsTrigger>
          
          {(hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
            <>
              <TabsTrigger value="purchase-orders" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Purchase Orders
              </TabsTrigger>
              
              <TabsTrigger value="customers" className="gap-2">
                <Users className="w-4 h-4" />
                Customers
              </TabsTrigger>
              
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </>
          )}
          
          {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
            <>
              <TabsTrigger value="stock-take" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Stock Take
              </TabsTrigger>
              
              <TabsTrigger value="time-clock" className="gap-2">
                <Clock className="w-4 h-4" />
                Time Clock
              </TabsTrigger>
            </>
          )}
          
          {(hasRole('admin') || hasRole('super_admin')) && (
            <>
              <TabsTrigger value="receipt-settings" className="gap-2">
                <FileText className="w-4 h-4" />
                Receipts
              </TabsTrigger>
              
              <TabsTrigger value="hardware" className="gap-2">
                <Wrench className="w-4 h-4" />
                Hardware
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="products" className="mt-0">
          <ProductsPage />
        </TabsContent>

        {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <TabsContent value="inventory" className="mt-0">
            <InventoryPage />
          </TabsContent>
        )}

        <TabsContent value="orders" className="mt-0">
          <OrdersPage />
        </TabsContent>

        {(hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <TabsContent value="purchase-orders" className="mt-0">
            <PurchaseOrdersPage />
          </TabsContent>
        )}

        {(hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="customers" className="mt-0">
              <CustomersPage />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <AnalyticsPage />
            </TabsContent>
          </>
        )}

        {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="stock-take" className="mt-0">
              <StockTakePage />
            </TabsContent>

            <TabsContent value="time-clock" className="mt-0">
              <EmployeeShiftsPage />
            </TabsContent>
          </>
        )}

        {(hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="receipt-settings" className="mt-0">
              <ReceiptSettingsPage />
            </TabsContent>

            <TabsContent value="hardware" className="mt-0">
              <HardwareSetupPage />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default POS;
