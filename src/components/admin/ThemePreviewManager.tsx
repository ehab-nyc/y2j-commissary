import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trackThemeAction } from "@/lib/themeAnalytics";

interface ThemePreviewManagerProps {
  currentTheme: string;
  onPreviewChange: () => void;
}

export const ThemePreviewManager = ({ currentTheme, onPreviewChange }: ThemePreviewManagerProps) => {
  const [isPreviewMode, setIsPreviewMode] = useState(() => {
    return localStorage.getItem('theme_preview_mode') === 'true';
  });

  const activatePreview = (themeName: string, colors?: any) => {
    localStorage.setItem('theme_preview_mode', 'true');
    localStorage.setItem('theme_preview_name', themeName);
    if (colors) {
      localStorage.setItem('theme_preview_colors', JSON.stringify(colors));
    } else {
      localStorage.removeItem('theme_preview_colors');
    }
    setIsPreviewMode(true);
    
    // Track preview action
    trackThemeAction(themeName, 'preview');
    
    onPreviewChange();
    toast.success("Preview mode activated", {
      description: "Navigate to different pages to test the theme"
    });
  };

  const deactivatePreview = () => {
    localStorage.removeItem('theme_preview_mode');
    localStorage.removeItem('theme_preview_name');
    localStorage.removeItem('theme_preview_colors');
    setIsPreviewMode(false);
    onPreviewChange();
    toast.info("Preview mode deactivated", {
      description: "Reverted to active theme"
    });
  };

  const previewTheme = localStorage.getItem('theme_preview_name');

  // Expose function globally for other components to activate preview
  if (typeof window !== 'undefined') {
    (window as any).activateThemePreview = activatePreview;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPreviewMode ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          Theme Preview Mode
        </CardTitle>
        <CardDescription>
          Test themes temporarily without saving. Preview mode persists across pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPreviewMode ? (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Preview mode is active. You're viewing: <strong>{previewTheme}</strong>
                <br />
                Current active theme: <strong>{currentTheme}</strong>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={deactivatePreview} variant="outline" className="flex-1">
                <EyeOff className="h-4 w-4 mr-2" />
                Exit Preview
              </Button>
            </div>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              No preview active. Click "Preview" on any theme to test it.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
