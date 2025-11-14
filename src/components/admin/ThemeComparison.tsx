import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftRight } from "lucide-react";

interface ThemeComparisonProps {
  availableThemes: string[];
}

export const ThemeComparison = ({ availableThemes }: ThemeComparisonProps) => {
  const [leftTheme, setLeftTheme] = useState<string>(availableThemes[0] || "default");
  const [rightTheme, setRightTheme] = useState<string>(availableThemes[1] || "halloween");

  const getThemeClass = (themeName: string): string => {
    const themeMap: Record<string, string> = {
      'default': '',
      'halloween': 'halloween',
      'halloween-minimal': 'halloween-minimal',
      'christmas': 'holiday',
      'christmas-wonderland': 'christmas-wonderland',
      'liquid-glass': 'liquid-glass',
      'gold-diamond': 'gold-diamond',
    };
    return themeMap[themeName] || '';
  };

  const swapThemes = () => {
    const temp = leftTheme;
    setLeftTheme(rightTheme);
    setRightTheme(temp);
  };

  const ThemePreviewPane = ({ theme }: { theme: string }) => {
    const themeClass = getThemeClass(theme);
    
    return (
      <div className={`${themeClass} flex-1 p-6 space-y-6 bg-background rounded-lg border`}>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2 capitalize">
            {theme.replace(/-/g, ' ')}
          </h3>
          <p className="text-sm text-muted-foreground">Preview theme styling</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Buttons</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="default">Primary</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="destructive">Destructive</Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Badges</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Form Controls</Label>
            <div className="space-y-3 mt-2">
              <Input placeholder="Enter text..." />
              <div className="flex items-center space-x-2">
                <Switch id={`switch-${theme}`} />
                <Label htmlFor={`switch-${theme}`}>Enable feature</Label>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample Card</CardTitle>
              <CardDescription>Card with content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is how cards look with this theme. Notice the background, borders, and text colors.
              </p>
            </CardContent>
          </Card>

          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium text-foreground">Muted Background</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for subtle containers and disabled states
            </p>
          </div>

          <div className="p-4 rounded-lg bg-accent">
            <p className="text-sm font-medium text-accent-foreground">Accent Background</p>
            <p className="text-xs text-accent-foreground/80 mt-1">
              Used for highlights and emphasis
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Theme Comparison
        </CardTitle>
        <CardDescription>
          Compare two themes side-by-side to see which one fits your needs best
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Left Theme</Label>
            <Select value={leftTheme} onValueChange={setLeftTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={swapThemes}>
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <Label>Right Theme</Label>
            <Select value={rightTheme} onValueChange={setRightTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 min-h-[600px]">
          <ThemePreviewPane theme={leftTheme} />
          <ThemePreviewPane theme={rightTheme} />
        </div>
      </CardContent>
    </Card>
  );
};
