import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ShoppingCart, FileText, Wrench, Users, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Import existing page components
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

  // Build available tabs based on user role
  const availableTabs = useMemo(() => {
    const tabs = [];
    
    if (hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) {
      tabs.push(
        { value: 'inventory', label: 'Inventory', icon: Package },
        { value: 'stock-take', label: 'Stock Take', icon: ClipboardList },
        { value: 'time-clock', label: 'Time Clock', icon: Clock }
      );
    }
    
    tabs.push({ value: 'orders', label: 'Orders', icon: ShoppingCart });
    
    if (hasRole('manager') || hasRole('admin') || hasRole('super_admin')) {
      tabs.push(
        { value: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
        { value: 'customers', label: 'Customers', icon: Users },
        { value: 'analytics', label: 'Analytics', icon: BarChart3 }
      );
    }
    
    if (hasRole('admin') || hasRole('super_admin')) {
      tabs.push(
        { value: 'receipt-settings', label: 'Receipts', icon: FileText },
        { value: 'hardware', label: 'Hardware', icon: Wrench }
      );
    }
    
    return tabs;
  }, [hasRole]);

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.value || 'orders');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground">Manage all POS operations in one place</p>
        </div>
        
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-[220px]">
            <SelectValue>
              {availableTabs.find(tab => tab.value === activeTab)?.label || 'Select Section'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} className="w-full">

        {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <TabsContent value="inventory">
            <InventoryPage />
          </TabsContent>
        )}

        <TabsContent value="orders">
          <OrdersPage />
        </TabsContent>

        {(hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <TabsContent value="purchase-orders">
            <PurchaseOrdersPage />
          </TabsContent>
        )}

        {(hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="customers">
              <CustomersPage />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsPage />
            </TabsContent>
          </>
        )}

        {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="stock-take">
              <StockTakePage />
            </TabsContent>

            <TabsContent value="time-clock">
              <EmployeeShiftsPage />
            </TabsContent>
          </>
        )}

        {(hasRole('admin') || hasRole('super_admin')) && (
          <>
            <TabsContent value="receipt-settings">
              <ReceiptSettingsPage />
            </TabsContent>

            <TabsContent value="hardware">
              <HardwareSetupPage />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default POS;
