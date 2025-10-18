import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useHolidayTheme = () => {
  const [isHolidayTheme, setIsHolidayTheme] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidayTheme();

    // Subscribe to changes
    const channel = supabase
      .channel('holiday_theme_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.holiday_theme',
        },
        (payload) => {
          const newValue = payload.new.value === 'true';
          setIsHolidayTheme(newValue);
          applyHolidayTheme(newValue);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHolidayTheme = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'holiday_theme')
        .single();

      const isEnabled = data?.value === 'true';
      setIsHolidayTheme(isEnabled);
      applyHolidayTheme(isEnabled);
    } catch (error) {
      console.error('Error fetching holiday theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyHolidayTheme = (enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('holiday');
    } else {
      root.classList.remove('holiday');
    }
  };

  return { isHolidayTheme, loading };
};
