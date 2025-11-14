import { supabase } from "@/integrations/supabase/client";

export type ThemeActionType = 'activate' | 'preview' | 'favorite' | 'unfavorite';

export const trackThemeAction = async (
  themeName: string,
  actionType: ThemeActionType,
  sessionDuration?: number
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("theme_analytics")
      .insert({
        user_id: user.id,
        theme_name: themeName,
        action_type: actionType,
        session_duration: sessionDuration,
      });
  } catch (error) {
    console.error("Failed to track theme action:", error);
  }
};

// Track session duration for theme usage
let themeSessionStart: number | null = null;
let currentThemeName: string | null = null;

export const startThemeSession = (themeName: string) => {
  // End previous session if exists
  if (themeSessionStart && currentThemeName) {
    const duration = Math.floor((Date.now() - themeSessionStart) / 1000);
    trackThemeAction(currentThemeName, 'activate', duration);
  }
  
  // Start new session
  themeSessionStart = Date.now();
  currentThemeName = themeName;
};

export const endThemeSession = () => {
  if (themeSessionStart && currentThemeName) {
    const duration = Math.floor((Date.now() - themeSessionStart) / 1000);
    trackThemeAction(currentThemeName, 'activate', duration);
    themeSessionStart = null;
    currentThemeName = null;
  }
};
