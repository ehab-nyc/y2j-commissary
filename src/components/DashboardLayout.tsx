import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingBag, Package, Users, BarChart3, ShoppingCart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { path: '/products', label: 'Products', icon: ShoppingBag, show: true },
    { path: '/orders', label: 'My Orders', icon: ShoppingCart, show: hasRole('customer') },
    { path: '/worker', label: 'Orders Queue', icon: Package, show: hasRole('worker') || hasRole('manager') },
    { path: '/manager', label: 'Management', icon: BarChart3, show: hasRole('manager') },
    { path: '/admin', label: 'Admin Panel', icon: Users, show: hasRole('admin') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl">Commissary</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              {navItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden border-b bg-card/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="flex overflow-x-auto px-4 gap-2 py-2">
          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className="gap-2 whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
