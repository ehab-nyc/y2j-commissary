import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface ColorPaletteGeneratorProps {
  onApplyPalette: (colors: Record<string, string>) => void;
}

// Convert hex to HSL
const hexToHSL = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

// Generate complementary color
const shiftHue = (hsl: string, degrees: number): string => {
  const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return hsl;
  
  let h = parseInt(match[1]);
  const s = match[2];
  const l = match[3];
  
  h = (h + degrees) % 360;
  if (h < 0) h += 360;
  
  return `${h} ${s}% ${l}%`;
};

// Adjust lightness
const adjustLightness = (hsl: string, adjustment: number): string => {
  const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return hsl;
  
  const h = match[1];
  const s = match[2];
  let l = parseInt(match[3]);
  
  l = Math.max(0, Math.min(100, l + adjustment));
  
  return `${h} ${s}% ${l}%`;
};

export const ColorPaletteGenerator = ({ onApplyPalette }: ColorPaletteGeneratorProps) => {
  const [baseColor, setBaseColor] = useState("#3b82f6");
  const [generatedPalette, setGeneratedPalette] = useState<Record<string, string> | null>(null);

  const generatePalette = () => {
    const baseHSL = hexToHSL(baseColor);
    
    // Generate a harmonious color palette using color theory
    const palette = {
      // Base colors
      primary: baseHSL,
      primaryForeground: "0 0% 98%",
      
      // Complementary colors (30 degrees shift)
      secondary: shiftHue(baseHSL, 30),
      secondaryForeground: adjustLightness(shiftHue(baseHSL, 30), -40),
      
      // Accent (complementary - 180 degrees)
      accent: shiftHue(baseHSL, 180),
      accentForeground: "0 0% 98%",
      
      // Muted variations
      muted: adjustLightness(baseHSL, 40),
      mutedForeground: adjustLightness(baseHSL, -25),
      
      // Background variations
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      
      // Card variations
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      
      // Border
      border: adjustLightness(baseHSL, 50),
    };

    setGeneratedPalette(palette);
    toast.success("Color palette generated!");
  };

  const applyPalette = () => {
    if (generatedPalette) {
      onApplyPalette(generatedPalette);
      toast.success("Palette applied to theme customizer!");
    }
  };

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    toast.success("Color copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Palette Generator
        </CardTitle>
        <CardDescription>
          Generate harmonious color schemes from a single base color using color theory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="base-color">Base Color</Label>
            <div className="flex gap-2">
              <Input
                id="base-color"
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 font-mono"
              />
            </div>
          </div>
        </div>

        <Button onClick={generatePalette} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Palette
        </Button>

        {generatedPalette && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(generatedPalette).map(([name, value]) => (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs capitalize">
                      {name.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(value)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ background: `hsl(${value})` }}
                    />
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      {value}
                    </code>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={applyPalette} variant="secondary" className="w-full">
              Apply Palette to Customizer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
