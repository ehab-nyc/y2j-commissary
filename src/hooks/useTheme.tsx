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
          
          // Force reload in PWA to clear cached styles
          if (window.matchMedia('(display-mode: standalone)').matches) {
            window.location.reload();
          }
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
      
      // Check if we're in PWA mode
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const currentTheme = document.documentElement.classList.contains('halloween') ? 'halloween' :
                          document.documentElement.classList.contains('holiday') ? 'christmas' :
                          document.documentElement.classList.contains('christmas-wonderland') ? 'christmas-wonderland' : 'default';
      
      // If in PWA and cached theme doesn't match database theme, reload once
      if (isPWA && currentTheme !== theme && !sessionStorage.getItem('theme-reloaded')) {
        console.log('PWA theme mismatch detected, reloading...', { currentTheme, theme });
        sessionStorage.setItem('theme-reloaded', 'true');
        applyTheme(theme);
        window.location.reload();
        return;
      }
      
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
    
    // Only clear theme-related storage (not auth!)
    localStorage.removeItem('theme');
    localStorage.removeItem('theme-preference');
    
    // Remove ALL theme-related classes
    root.classList.remove('holiday', 'christmas-wonderland', 'halloween', 'dark', 'light');
    
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
