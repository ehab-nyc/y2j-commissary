import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useTheme } from "./hooks/useTheme";
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

const queryClient = new QueryClient();

const AppContent = () => {
  useTheme();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requireRole="customer"><Orders /></ProtectedRoute>} />
          <Route path="/my-violations" element={<ProtectedRoute requireRole="customer"><CustomerViolations /></ProtectedRoute>} />
          <Route path="/worker" element={<ProtectedRoute requireAnyRole={['worker', 'manager']}><Worker /></ProtectedRoute>} />
          <Route path="/processed-orders" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'admin', 'super_admin']}><ProcessedOrders /></ProtectedRoute>} />
          <Route path="/violations" element={<ProtectedRoute requireAnyRole={['worker', 'manager', 'super_admin']}><Violations /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute requireRole="manager"><Manager /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAnyRole={['admin', 'super_admin']}><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
