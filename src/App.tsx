import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useTheme } from "./hooks/useTheme";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";

// Critical routes - load immediately
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Worker from "./pages/Worker";
import Manager from "./pages/Manager";
import Owner from "./pages/Owner";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import POS from "./pages/POS";

// Non-critical routes - lazy load for better performance
const ProcessedOrders = lazy(() => import("./pages/ProcessedOrders"));
const AdminHub = lazy(() => import("./pages/AdminHub"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProcessedOrders = lazy(() => import("./pages/admin/AdminProcessedOrders"));
const AdminDeletedOrders = lazy(() => import("./pages/admin/AdminDeletedOrders"));
const AdminViolations = lazy(() => import("./pages/admin/AdminViolations"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSMS = lazy(() => import("./pages/admin/AdminSMS"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminBalances = lazy(() => import("./pages/admin/AdminBalances"));
const AdminCartAssignments = lazy(() => import("./pages/admin/AdminCartAssignments"));
const Violations = lazy(() => import("./pages/Violations"));
const CustomerViolations = lazy(() => import("./pages/CustomerViolations"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Inventory = lazy(() => import("./pages/Inventory"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const StockTake = lazy(() => import("./pages/StockTake"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const EmployeeShifts = lazy(() => import("./pages/EmployeeShifts"));
const ReceiptSettings = lazy(() => import("./pages/ReceiptSettings"));
const HardwareSetup = lazy(() => import("./pages/HardwareSetup"));
const GPS = lazy(() => import("./pages/GPS"));
const FleetMap = lazy(() => import("./pages/FleetMap"));
const FleetVehicles = lazy(() => import("./pages/FleetVehicles"));
const FleetHistory = lazy(() => import("./pages/FleetHistory"));
const Geofencing = lazy(() => import("./pages/Geofencing"));
const GPSAlerts = lazy(() => import("./pages/GPSAlerts"));
const GPSSettings = lazy(() => import("./pages/GPSSettings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Returns = lazy(() => import("./pages/Returns"));
const ProductPerformance = lazy(() => import("./pages/ProductPerformance"));
const DataBackup = lazy(() => import("./pages/DataBackup"));
const SMSNotifications = lazy(() => import("./pages/SMSNotifications"));

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
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
          <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
          <Route path="/admin/deleted-orders" element={<ProtectedRoute requireRole="super_admin"><AdminDeletedOrders /></ProtectedRoute>} />
          <Route path="/admin/violations" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminViolations /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/sms" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminSMS /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminAnnouncements /></ProtectedRoute>} />
          <Route path="/admin/balances" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><AdminBalances /></ProtectedRoute>} />
          <Route path="/admin/cart-assignments" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><AdminCartAssignments /></ProtectedRoute>} />
          <Route path="/owner" element={<ProtectedRoute requireRole="owner"><Owner /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/customer-dashboard" element={<ProtectedRoute requireRole="customer"><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Analytics /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/stock-take" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><StockTake /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Customers /></ProtectedRoute>} />
          <Route path="/employee-shifts" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><EmployeeShifts /></ProtectedRoute>} />
          <Route path="/receipt-settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><ReceiptSettings /></ProtectedRoute>} />
          <Route path="/hardware-setup" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><HardwareSetup /></ProtectedRoute>} />
          <Route path="/returns" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Returns /></ProtectedRoute>} />
          <Route path="/product-performance" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><ProductPerformance /></ProtectedRoute>} />
          <Route path="/data-backup" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><DataBackup /></ProtectedRoute>} />
          <Route path="/sms-notifications" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><SMSNotifications /></ProtectedRoute>} />
          
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
        </Suspense>
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
