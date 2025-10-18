import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppTheme = 'default' | 'christmas';

export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<AppTheme>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTheme();

    // Subscribe to changes
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
          const newTheme = (payload.new.value || 'default') as AppTheme;
          setActiveTheme(newTheme);
          applyTheme(newTheme);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveTheme = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_theme')
        .single();

      const theme = (data?.value || 'default') as AppTheme;
      setActiveTheme(theme);
      applyTheme(theme);
    } catch (error) {
      console.error('Error fetching active theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: AppTheme) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('holiday', 'christmas');
    
    // Apply the selected theme
    if (theme === 'christmas') {
      root.classList.add('holiday'); // Using 'holiday' class for backward compatibility with CSS
    }
  };

  return { activeTheme, loading };
};
