import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppTheme } from "@/hooks/useTheme";

interface ThemePreviewProps {
  theme: string;
  onActivate: () => void;
  isActive: boolean;
}

export const ThemePreview = ({ theme, onActivate, isActive }: ThemePreviewProps) => {
  const getThemeClass = (themeName: string): AppTheme => {
    const themeMap: Record<string, AppTheme> = {
      'default': 'default',
      'halloween': 'halloween',
      'halloween-minimal': 'halloween-minimal',
      'christmas': 'christmas',
      'christmas-wonderland': 'christmas-wonderland',
      'liquid-glass': 'liquid-glass',
      'gold-diamond': 'gold-diamond',
    };
    return themeMap[themeName] || 'default';
  };

  const applyPreviewTheme = () => {
    const themeClass = getThemeClass(theme);
    const classes = ['halloween', 'halloween-minimal', 'holiday', 'christmas-wonderland', 'liquid-glass', 'gold-diamond'];
    
    return themeClass === 'default' ? '' : 
           themeClass === 'christmas' ? 'holiday' : 
           themeClass;
  };

  const previewClass = applyPreviewTheme();

  return (
    <Card className="relative overflow-hidden">
      <div className={previewClass}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">{theme.replace(/-/g, ' ')}</CardTitle>
              <CardDescription>Preview this theme</CardDescription>
            </div>
            {isActive && (
              <Badge variant="default" className="ml-2">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-card border">
            <h4 className="font-semibold text-card-foreground mb-2">Sample Card</h4>
            <p className="text-sm text-muted-foreground">This is how text looks in this theme</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="default">Primary Button</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="outline">Outline</Button>
          </div>

          <div className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>

          <Button 
            onClick={onActivate} 
            className="w-full"
            variant={isActive ? "outline" : "default"}
            disabled={isActive}
          >
            {isActive ? 'Currently Active' : 'Activate Theme'}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
};
