import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useTheme } from "./hooks/useTheme";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Worker from "./pages/Worker";
import ProcessedOrders from "./pages/ProcessedOrders";
import Manager from "./pages/Manager";
import AdminHub from "./pages/AdminHub";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProcessedOrders from "./pages/admin/AdminProcessedOrders";
import AdminViolations from "./pages/admin/AdminViolations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSMS from "./pages/admin/AdminSMS";
import AdminSettings from "./pages/admin/AdminSettings";
import Profile from "./pages/Profile";
import Violations from "./pages/Violations";
import CustomerViolations from "./pages/CustomerViolations";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Inventory from "./pages/Inventory";
import PurchaseOrders from "./pages/PurchaseOrders";
import StockTake from "./pages/StockTake";
import Customers from "./pages/Customers";
import EmployeeShifts from "./pages/EmployeeShifts";
import ReceiptSettings from "./pages/ReceiptSettings";
import HardwareSetup from "./pages/HardwareSetup";
import POS from "./pages/POS";
import GPS from "./pages/GPS";
import FleetMap from "./pages/FleetMap";
import FleetVehicles from "./pages/FleetVehicles";
import FleetHistory from "./pages/FleetHistory";
import Geofencing from "./pages/Geofencing";
import GPSAlerts from "./pages/GPSAlerts";
import GPSSettings from "./pages/GPSSettings";

const queryClient = new QueryClient();

const AppContent = () => {
  const { activeTheme, loading } = useTheme();
  
  console.log('App theme state:', { activeTheme, loading });
  
  return (
    <>
      <Toaster />
      <Sonner />
      <PWAUpdatePrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requireAnyRole={['customer', 'worker', 'manager', 'admin', 'super_admin']}><Orders /></ProtectedRoute>} />
          <Route path="/my-violations" element={<ProtectedRoute requireRole="customer"><CustomerViolations /></ProtectedRoute>} />
          <Route path="/worker" element={<ProtectedRoute requireAnyRole={['worker', 'manager']}><Worker /></ProtectedRoute>} />
          <Route path="/processed-orders" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><ProcessedOrders /></ProtectedRoute>} />
          <Route path="/violations" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Violations /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute requireRole="manager"><Manager /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminHub /></ProtectedRoute>} />
          
          {/* Admin Sub-Routes */}
          <Route path="/admin/products" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/processed-orders" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminProcessedOrders /></ProtectedRoute>} />
          <Route path="/admin/violations" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminViolations /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/sms" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminSMS /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Analytics /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/stock-take" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><StockTake /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Customers /></ProtectedRoute>} />
          <Route path="/employee-shifts" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><EmployeeShifts /></ProtectedRoute>} />
          <Route path="/receipt-settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><ReceiptSettings /></ProtectedRoute>} />
          <Route path="/hardware-setup" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><HardwareSetup /></ProtectedRoute>} />
          
          {/* GPS Routes */}
          <Route path="/gps" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><GPS /></ProtectedRoute>} />
          <Route path="/gps/fleet-map" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><FleetMap /></ProtectedRoute>} />
          <Route path="/gps/vehicles" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><FleetVehicles /></ProtectedRoute>} />
          <Route path="/gps/history" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><FleetHistory /></ProtectedRoute>} />
          <Route path="/gps/geofencing" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Geofencing /></ProtectedRoute>} />
          <Route path="/gps/alerts" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><GPSAlerts /></ProtectedRoute>} />
          <Route path="/gps/settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><GPSSettings /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
