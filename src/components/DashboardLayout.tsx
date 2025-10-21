import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, ShoppingBag, Package, Users, BarChart3, ShoppingCart, UserCircle, AlertCircle, Languages, ClipboardList, Clock, FileText, Wrench, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [companyName, setCompanyName] = useState('Commissary');
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  useEffect(() => {
    fetchCompanyName();
  }, []);

  const fetchCompanyName = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'company_name')
      .single();
    
    if (data?.value) {
      setCompanyName(data.value);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { path: '/products', label: 'Products', icon: ShoppingBag, show: true },
    { path: '/orders', label: t('nav.myOrders'), icon: ShoppingCart, show: hasRole('customer') },
    { path: '/my-violations', label: 'My Violations', icon: AlertCircle, show: hasRole('customer') },
    { path: '/worker', label: t('nav.ordersQueue'), icon: Package, show: hasRole('worker') || hasRole('manager') },
    { path: '/processed-orders', label: 'My Processed Orders', icon: Package, show: hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin') },
    { path: '/violations', label: t('nav.violations'), icon: AlertCircle, show: hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin') },
    { path: '/manager', label: t('nav.management'), icon: BarChart3, show: hasRole('manager') },
    { path: '/admin', label: t('nav.adminPanel'), icon: Users, show: hasRole('admin') || hasRole('super_admin') },
    { path: '/pos', label: 'POS', icon: BarChart3, show: hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin') },
    { path: '/gps', label: 'GPS', icon: MapPin, show: hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin') },
    { path: '/profile', label: t('nav.profile'), icon: UserCircle, show: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl">{companyName}</span>
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
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Languages className="w-4 h-4" />
                    {i18n.language === 'ar' ? 'عربي' : 'EN'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => changeLanguage('en')}>
                    🇬🇧 English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('ar')}>
                    🇸🇦 العربية (Arabic)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50 text-xs">
                    ━━━ AI Translation Available ━━━
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-xs opacity-70">
                    🇪🇸 Spanish • 🇫🇷 French • 🇩🇪 German
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-xs opacity-70">
                    🇨🇳 Chinese • And more via translate buttons
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                {t('nav.signOut')}
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
