import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startThemeSession } from '@/lib/themeAnalytics';

export type AppTheme = 'default' | 'halloween' | 'halloween-minimal' | 'christmas' | 'christmas-wonderland' | 'liquid-glass' | 'gold-diamond';

export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<AppTheme>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for preview mode first
    const isPreviewMode = localStorage.getItem('theme_preview_mode') === 'true';
    
    if (isPreviewMode) {
      const previewTheme = localStorage.getItem('theme_preview_name');
      const previewColors = localStorage.getItem('theme_preview_colors');
      
      if (previewTheme) {
        const colors = previewColors ? JSON.parse(previewColors) : null;
        applyTheme(previewTheme as AppTheme, colors);
        setActiveTheme(previewTheme as AppTheme);
        setLoading(false);
        return;
      }
    }

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
          // Don't override if in preview mode
          if (localStorage.getItem('theme_preview_mode') === 'true') {
            return;
          }
          
          console.log('Theme change received via realtime:', payload);
          const newTheme = (payload.new.value || 'default') as AppTheme;
          setActiveTheme(newTheme);
          
          // Fetch theme colors if it's a custom theme
          supabase
            .from('themes')
            .select('colors')
            .eq('name', newTheme)
            .maybeSingle()
            .then(({ data }) => {
              applyTheme(newTheme, data?.colors);
            });
          
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
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_theme')
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching active theme in useTheme:', settingsError);
        setLoading(false);
        return;
      }

      const themeName = (settingsData?.value || 'default') as string;
      console.log('useTheme: Fetched active theme:', themeName);
      
      // Fetch theme data including custom colors
      const { data: themeData } = await supabase
        .from('themes')
        .select('colors')
        .eq('name', themeName)
        .maybeSingle();
      
      setActiveTheme(themeName as AppTheme);
      applyTheme(themeName as AppTheme, themeData?.colors);
      
      // Track theme activation
      startThemeSession(themeName);
      
      // Clear the reload flag once theme is successfully applied
      sessionStorage.removeItem('theme-reloaded');
    } catch (error) {
      console.error('Exception in fetchActiveTheme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: AppTheme, customColors?: any) => {
    const root = document.documentElement;
    
    console.log('Applying theme:', theme, customColors ? 'with custom colors' : '');
    
    // Only clear theme-related storage (not auth!)
    localStorage.removeItem('theme');
    localStorage.removeItem('theme-preference');
    
    // Remove ALL theme-related classes
    root.classList.remove('holiday', 'christmas-wonderland', 'christmas-animated', 'halloween', 'halloween-minimal', 'halloween-animated', 'halloween-speed-slow', 'halloween-speed-normal', 'halloween-speed-fast', 'liquid-glass', 'gold-diamond', 'dark', 'light');
    
    // Apply custom colors if available
    if (customColors && typeof customColors === 'object') {
      Object.entries(customColors).forEach(([key, value]) => {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value as string);
      });
      console.log('Custom theme colors applied');
      return;
    }
    
    // Apply the selected predefined theme
    if (theme === 'halloween') {
      root.classList.add('halloween');
      // Check if animations should be enabled (default: true)
      const animationsEnabled = localStorage.getItem('halloween_animations') !== 'false';
      const speed = localStorage.getItem('halloween_speed') || 'normal';
      if (animationsEnabled) {
        root.classList.add('halloween-animated');
        root.classList.add(`halloween-speed-${speed}`);
      }
      console.log('Halloween theme class added to HTML element', animationsEnabled ? `with animations (${speed})` : 'without animations');
    } else if (theme === 'halloween-minimal') {
      root.classList.add('halloween-minimal');
      console.log('Halloween Minimal theme class added to HTML element');
    } else if (theme === 'christmas') {
      root.classList.add('holiday');
      const christmasAnimations = localStorage.getItem('christmas_animations') !== 'false';
      if (christmasAnimations) {
        root.classList.add('christmas-animated');
      }
      console.log('Christmas theme class added to HTML element', christmasAnimations ? 'with animations' : 'without animations');
    } else if (theme === 'christmas-wonderland') {
      root.classList.add('christmas-wonderland');
      const christmasAnimations = localStorage.getItem('christmas_animations') !== 'false';
      if (christmasAnimations) {
        root.classList.add('christmas-animated');
      }
      console.log('Christmas Wonderland theme class added to HTML element', christmasAnimations ? 'with animations' : 'without animations');
    } else if (theme === 'liquid-glass') {
      root.classList.add('liquid-glass');
      console.log('Liquid Glass theme class added to HTML element');
    } else if (theme === 'gold-diamond') {
      root.classList.add('gold-diamond');
      console.log('Gold Diamond theme class added to HTML element');
    } else {
      console.log('Default theme applied (no theme class added)');
    }
    
    console.log('Current HTML classes:', root.className);
  };

  return { activeTheme, loading };
};
