import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, HashRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LicenseActivationProvider } from "@/contexts/LicenseActivationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ElectronRequiredMessage } from "@/components/ElectronRequiredMessage";
import { isElectronEnvironment } from "@/lib/electron-check";
import LicenseGate from '@/components/LicenseGate';
import LicenseActivationModal from '@/components/LicenseActivationModal';

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import POSPage from "./pages/pos/POSPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import SupplierDetailPage from "./pages/suppliers/SupplierDetailPage";
import ItemsPage from "./pages/items/ItemsPage";
import SalesPage from "./pages/sales/SalesPage";
import SaleDetailPage from "./pages/sales/SaleDetailPage";
import CreateSalePage from "./pages/sales/CreateSalePage";
import EditSalePage from "./pages/sales/EditSalePage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import PurchaseDetailPage from "./pages/purchases/PurchaseDetailPage";
import CreatePurchasePage from "./pages/purchases/CreatePurchasePage";
import EditPurchasePage from "./pages/purchases/EditPurchasePage";
import ExpensesPage from "./pages/expenses/ExpensesPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import LedgerPage from "./pages/accounts/LedgerPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import GoodsPage from "./pages/goods/GoodsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  // Check if running in Electron environment
  const isElectron = isElectronEnvironment();
  
  if (!isElectron) {
    console.error('[App] ❌ Not running in Electron!');
    console.error('[App] Please use: npm run electron:dev');
    return (
      <ThemeProvider>
        <ElectronRequiredMessage />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <SidebarProvider>
            <TooltipProvider>
              <AuthProvider>
                <LicenseActivationProvider>
                  <LicenseActivationModal />
                  <Toaster />
                  <Sonner />
                  <HashRouter>
                    <LicenseGate>
                    <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  
                    {/* POS */}
                    <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
                    
                    {/* Customers */}
                    <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                    <Route path="/customers/new" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                    <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
                    
                    {/* Suppliers */}
                    <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                    <Route path="/suppliers/new" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                    <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetailPage /></ProtectedRoute>} />
                    
                    {/* Items */}
                    <Route path="/items" element={<ProtectedRoute><ItemsPage /></ProtectedRoute>} />
                    
                    {/* Sales */}
                    <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
                    <Route path="/sales/new" element={<ProtectedRoute><CreateSalePage /></ProtectedRoute>} />
                    <Route path="/sales/edit/:id" element={<ProtectedRoute><EditSalePage /></ProtectedRoute>} />
                    <Route path="/sales/:id" element={<ProtectedRoute><SaleDetailPage /></ProtectedRoute>} />
                    
                    {/* Purchases */}
                    <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
                    <Route path="/purchases/new" element={<ProtectedRoute><CreatePurchasePage /></ProtectedRoute>} />
                    <Route path="/purchases/edit/:id" element={<ProtectedRoute><EditPurchasePage /></ProtectedRoute>} />
                    <Route path="/purchases/:id" element={<ProtectedRoute><PurchaseDetailPage /></ProtectedRoute>} />
                    
                    {/* Expenses */}
                    <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
                    
                    {/* Goods (Operational Tracking) */}
                    <Route path="/goods" element={<ProtectedRoute><GoodsPage /></ProtectedRoute>} />
                    
                    {/* Accounts */}
                    <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
                    <Route path="/accounts/:id/ledger" element={<ProtectedRoute><LedgerPage /></ProtectedRoute>} />
                    
                    {/* Reports */}
                    <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                    
                    {/* Settings - Only admins can access */}
                    <Route path="/settings" element={<ProtectedRoute requiredRole={['super_admin', 'admin']}><SettingsPage /></ProtectedRoute>} />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                    </LicenseGate>
                  </HashRouter>
                </LicenseActivationProvider>
              </AuthProvider>
            </TooltipProvider>
          </SidebarProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
