import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppTheme = 'default' | 'halloween' | 'christmas' | 'christmas-wonderland';

export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<AppTheme>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTheme();

    // Subscribe to changes with better error handling
    const channel = supabase
      .channel('theme_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.active_theme',
        },
        (payload) => {
          console.log('Theme change received via realtime:', payload);
          const newTheme = (payload.new.value || 'default') as AppTheme;
          setActiveTheme(newTheme);
          applyTheme(newTheme);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_theme')
        .maybeSingle();

      if (error) {
        console.error('Error fetching active theme in useTheme:', error);
        setLoading(false);
        return;
      }

      const theme = (data?.value || 'default') as AppTheme;
      console.log('useTheme: Fetched active theme:', theme);
      setActiveTheme(theme);
      applyTheme(theme);
    } catch (error) {
      console.error('Exception in fetchActiveTheme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: AppTheme) => {
    const root = document.documentElement;
    
    console.log('Applying theme:', theme);
    
    // Remove ALL theme-related classes (including old 'dark' class from next-themes)
    root.classList.remove('holiday', 'christmas-wonderland', 'halloween', 'dark', 'light');
    
    // Clear any theme localStorage from old next-themes system
    localStorage.removeItem('theme');
    
    // Apply the selected theme
    if (theme === 'halloween') {
      root.classList.add('halloween');
      console.log('Halloween theme class added to HTML element');
    } else if (theme === 'christmas') {
      root.classList.add('holiday');
      console.log('Christmas theme class added to HTML element');
    } else if (theme === 'christmas-wonderland') {
      root.classList.add('christmas-wonderland');
      console.log('Christmas Wonderland theme class added to HTML element');
    } else {
      console.log('Default theme applied (no theme class added)');
    }
    
    console.log('Current HTML classes:', root.className);
  };

  return { activeTheme, loading };
};
