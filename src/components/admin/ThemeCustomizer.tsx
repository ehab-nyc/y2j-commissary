import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
}

interface ThemeCustomizerProps {
  onSave: (name: string, description: string, colors: ThemeColors) => Promise<void>;
  initialColors?: ThemeColors;
}

const defaultColors: ThemeColors = {
  background: "0 0% 100%",
  foreground: "222.2 84% 4.9%",
  primary: "221.2 83.2% 53.3%",
  primaryForeground: "210 40% 98%",
  secondary: "210 40% 96.1%",
  secondaryForeground: "222.2 47.4% 11.2%",
  accent: "210 40% 96.1%",
  accentForeground: "222.2 47.4% 11.2%",
  muted: "210 40% 96.1%",
  mutedForeground: "215.4 16.3% 46.9%",
  card: "0 0% 100%",
  cardForeground: "222.2 84% 4.9%",
  border: "214.3 31.8% 91.4%",
};

export const ThemeCustomizer = ({ onSave, initialColors }: ThemeCustomizerProps) => {
  const [themeName, setThemeName] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<ThemeColors>(initialColors || defaultColors);
  const [isSaving, setIsSaving] = useState(false);

  // Update colors when initialColors prop changes
  useEffect(() => {
    if (initialColors) {
      setColors(initialColors);
    }
  }, [initialColors]);

  // Update colors when called from palette generator
  const applyColors = (newColors: ThemeColors) => {
    setColors(newColors);
  };

  // Expose applyColors globally for palette generator
  useEffect(() => {
    (window as any).applyThemeColors = applyColors;
    return () => {
      delete (window as any).applyThemeColors;
    };
  }, []);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!themeName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(themeName, description, colors);
      setThemeName("");
      setDescription("");
      setColors(defaultColors);
    } finally {
      setIsSaving(false);
    }
  };

  const colorFields: Array<{ key: keyof ThemeColors; label: string; group: string }> = [
    { key: "background", label: "Background", group: "Base" },
    { key: "foreground", label: "Foreground", group: "Base" },
    { key: "primary", label: "Primary", group: "Primary" },
    { key: "primaryForeground", label: "Primary Text", group: "Primary" },
    { key: "secondary", label: "Secondary", group: "Secondary" },
    { key: "secondaryForeground", label: "Secondary Text", group: "Secondary" },
    { key: "accent", label: "Accent", group: "Accent" },
    { key: "accentForeground", label: "Accent Text", group: "Accent" },
    { key: "muted", label: "Muted", group: "Muted" },
    { key: "mutedForeground", label: "Muted Text", group: "Muted" },
    { key: "card", label: "Card", group: "Card" },
    { key: "cardForeground", label: "Card Text", group: "Card" },
    { key: "border", label: "Border", group: "Other" },
  ];

  // Group colors by category
  const groupedColors = colorFields.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof colorFields>);

  // Apply preview styles dynamically
  const previewStyle = {
    '--preview-background': colors.background,
    '--preview-foreground': colors.foreground,
    '--preview-primary': colors.primary,
    '--preview-primary-foreground': colors.primaryForeground,
    '--preview-secondary': colors.secondary,
    '--preview-secondary-foreground': colors.secondaryForeground,
    '--preview-accent': colors.accent,
    '--preview-accent-foreground': colors.accentForeground,
    '--preview-muted': colors.muted,
    '--preview-muted-foreground': colors.mutedForeground,
    '--preview-card': colors.card,
    '--preview-card-foreground': colors.cardForeground,
    '--preview-border': colors.border,
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Create Custom Theme
          </CardTitle>
          <CardDescription>
            Design your own theme by customizing colors. Use HSL format (e.g., "221.2 83.2% 53.3%")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme-name">Theme Name *</Label>
              <Input
                id="theme-name"
                placeholder="My Custom Theme"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="theme-description">Description</Label>
              <Input
                id="theme-description"
                placeholder="A beautiful custom theme..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedColors).map(([group, fields]) => (
              <div key={group} className="space-y-3">
                <h4 className="font-semibold text-sm">{group}</h4>
                <div className="space-y-2">
                  {fields.map(field => (
                    <div key={field.key}>
                      <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
                      <Input
                        id={field.key}
                        value={colors[field.key]}
                        onChange={(e) => handleColorChange(field.key, e.target.value)}
                        placeholder="221.2 83.2% 53.3%"
                        className="font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Custom Theme"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>See how your theme looks in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            style={previewStyle}
            className="p-6 rounded-lg space-y-4"
            data-theme-preview
          >
            <style>{`
              [data-theme-preview] {
                background: hsl(var(--preview-background));
                color: hsl(var(--preview-foreground));
                border: 1px solid hsl(var(--preview-border));
              }
              [data-theme-preview] .preview-card {
                background: hsl(var(--preview-card));
                color: hsl(var(--preview-card-foreground));
                border: 1px solid hsl(var(--preview-border));
              }
              [data-theme-preview] .preview-primary {
                background: hsl(var(--preview-primary));
                color: hsl(var(--preview-primary-foreground));
              }
              [data-theme-preview] .preview-secondary {
                background: hsl(var(--preview-secondary));
                color: hsl(var(--preview-secondary-foreground));
              }
              [data-theme-preview] .preview-accent {
                background: hsl(var(--preview-accent));
                color: hsl(var(--preview-accent-foreground));
              }
              [data-theme-preview] .preview-muted {
                background: hsl(var(--preview-muted));
                color: hsl(var(--preview-muted-foreground));
              }
            `}</style>

            <div className="preview-card p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">Sample Card</h3>
              <p className="text-sm opacity-70">This is how text will look in your theme</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="preview-primary px-4 py-2 rounded-md text-sm font-medium">
                Primary Button
              </button>
              <button className="preview-secondary px-4 py-2 rounded-md text-sm font-medium">
                Secondary Button
              </button>
              <button className="preview-accent px-4 py-2 rounded-md text-sm font-medium">
                Accent Button
              </button>
            </div>

            <div className="flex gap-2">
              <span className="preview-primary px-2 py-1 rounded text-xs font-medium">Primary</span>
              <span className="preview-secondary px-2 py-1 rounded text-xs font-medium">Secondary</span>
              <span className="preview-muted px-2 py-1 rounded text-xs font-medium">Muted</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
