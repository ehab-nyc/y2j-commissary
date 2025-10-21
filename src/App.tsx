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
import Admin from "./pages/Admin";
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
import POS from "./pages/POS";

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
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requireRole="customer"><Orders /></ProtectedRoute>} />
          <Route path="/my-violations" element={<ProtectedRoute requireRole="customer"><CustomerViolations /></ProtectedRoute>} />
          <Route path="/worker" element={<ProtectedRoute requireAnyRole={['worker', 'manager']}><Worker /></ProtectedRoute>} />
          <Route path="/processed-orders" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><ProcessedOrders /></ProtectedRoute>} />
          <Route path="/violations" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Violations /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute requireRole="manager"><Manager /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Analytics /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/stock-take" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><StockTake /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requireAnyRole={['manager', 'admin', 'super_admin']}><Customers /></ProtectedRoute>} />
          <Route path="/employee-shifts" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><EmployeeShifts /></ProtectedRoute>} />
          <Route path="/receipt-settings" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><ReceiptSettings /></ProtectedRoute>} />
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
