import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Star } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PreMadeTheme {
  id: string;
  name: string;
  description: string;
  category: "professional" | "vibrant" | "minimal" | "dark";
  colors: Record<string, string>;
  featured?: boolean;
}

interface ThemeGalleryProps {
  onImportTheme: (name: string, description: string, colors: Record<string, string>) => Promise<void>;
}

const preMadeThemes: PreMadeTheme[] = [
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Calm and professional blue tones inspired by the ocean",
    category: "professional",
    featured: true,
    colors: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      primary: "199 89% 48%",
      primaryForeground: "0 0% 98%",
      secondary: "199 30% 90%",
      secondaryForeground: "199 89% 20%",
      accent: "199 50% 85%",
      accentForeground: "199 89% 30%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      border: "214.3 31.8% 91.4%",
    },
  },
  {
    id: "sunset-glow",
    name: "Sunset Glow",
    description: "Warm and inviting orange and pink gradient",
    category: "vibrant",
    featured: true,
    colors: {
      background: "0 0% 100%",
      foreground: "20 14.3% 4.1%",
      primary: "24 95% 53%",
      primaryForeground: "0 0% 98%",
      secondary: "340 75% 60%",
      secondaryForeground: "0 0% 98%",
      accent: "24 70% 85%",
      accentForeground: "24 95% 30%",
      muted: "60 4.8% 95.9%",
      mutedForeground: "25 5.3% 44.7%",
      card: "0 0% 100%",
      cardForeground: "20 14.3% 4.1%",
      border: "20 5.9% 90%",
    },
  },
  {
    id: "forest-zen",
    name: "Forest Zen",
    description: "Natural green tones for a calming experience",
    category: "minimal",
    colors: {
      background: "0 0% 100%",
      foreground: "120 10% 10%",
      primary: "142 71% 45%",
      primaryForeground: "0 0% 98%",
      secondary: "142 30% 85%",
      secondaryForeground: "142 71% 20%",
      accent: "142 40% 75%",
      accentForeground: "142 71% 25%",
      muted: "120 20% 95%",
      mutedForeground: "120 10% 45%",
      card: "0 0% 100%",
      cardForeground: "120 10% 10%",
      border: "120 15% 90%",
    },
  },
  {
    id: "midnight-purple",
    name: "Midnight Purple",
    description: "Deep purple with elegant contrast",
    category: "dark",
    featured: true,
    colors: {
      background: "0 0% 100%",
      foreground: "270 10% 10%",
      primary: "270 95% 60%",
      primaryForeground: "0 0% 98%",
      secondary: "270 40% 85%",
      secondaryForeground: "270 95% 25%",
      accent: "270 50% 75%",
      accentForeground: "270 95% 30%",
      muted: "270 20% 94%",
      mutedForeground: "270 10% 45%",
      card: "0 0% 100%",
      cardForeground: "270 10% 10%",
      border: "270 15% 88%",
    },
  },
  {
    id: "coral-reef",
    name: "Coral Reef",
    description: "Vibrant coral and teal combination",
    category: "vibrant",
    colors: {
      background: "0 0% 100%",
      foreground: "184 10% 10%",
      primary: "350 80% 60%",
      primaryForeground: "0 0% 98%",
      secondary: "184 60% 50%",
      secondaryForeground: "0 0% 98%",
      accent: "350 70% 85%",
      accentForeground: "350 80% 30%",
      muted: "184 20% 94%",
      mutedForeground: "184 10% 45%",
      card: "0 0% 100%",
      cardForeground: "184 10% 10%",
      border: "184 15% 88%",
    },
  },
  {
    id: "slate-modern",
    name: "Slate Modern",
    description: "Clean slate grays for a modern look",
    category: "minimal",
    colors: {
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      primary: "215 28% 17%",
      primaryForeground: "0 0% 98%",
      secondary: "220 14% 96%",
      secondaryForeground: "222 47% 11%",
      accent: "220 14% 90%",
      accentForeground: "222 47% 11%",
      muted: "220 14% 96%",
      mutedForeground: "220 9% 46%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      border: "220 13% 91%",
    },
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    description: "Luxurious gold and deep blue combination",
    category: "professional",
    colors: {
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      primary: "43 96% 56%",
      primaryForeground: "222 47% 11%",
      secondary: "221 83% 53%",
      secondaryForeground: "0 0% 98%",
      accent: "43 80% 85%",
      accentForeground: "43 96% 30%",
      muted: "210 40% 96%",
      mutedForeground: "215 16% 47%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      border: "214 32% 91%",
    },
  },
  {
    id: "berry-blast",
    name: "Berry Blast",
    description: "Energetic magenta and purple tones",
    category: "vibrant",
    colors: {
      background: "0 0% 100%",
      foreground: "320 10% 10%",
      primary: "320 85% 50%",
      primaryForeground: "0 0% 98%",
      secondary: "280 70% 60%",
      secondaryForeground: "0 0% 98%",
      accent: "320 75% 85%",
      accentForeground: "320 85% 25%",
      muted: "300 20% 95%",
      mutedForeground: "300 10% 45%",
      card: "0 0% 100%",
      cardForeground: "320 10% 10%",
      border: "300 15% 90%",
    },
  },
];

export const ThemeGallery = ({ onImportTheme }: ThemeGalleryProps) => {
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleImport = async (theme: PreMadeTheme) => {
    setImporting(theme.id);
    try {
      await onImportTheme(theme.name, theme.description, theme.colors);
      toast.success(`${theme.name} imported successfully!`);
    } catch (error) {
      toast.error("Failed to import theme");
    } finally {
      setImporting(null);
    }
  };

  const filteredThemes = selectedCategory === "all" 
    ? preMadeThemes 
    : preMadeThemes.filter(t => t.category === selectedCategory);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Gallery</CardTitle>
        <CardDescription>
          Browse and import beautiful pre-made themes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="vibrant">Vibrant</TabsTrigger>
            <TabsTrigger value="minimal">Minimal</TabsTrigger>
            <TabsTrigger value="dark">Dark</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThemes.map((theme) => (
                <Card key={theme.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {theme.name}
                          {theme.featured && (
                            <Star className="h-3 w-3 fill-primary text-primary" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {theme.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {theme.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Color Preview */}
                    <div 
                      className="h-24 rounded-lg p-3 space-y-2"
                      style={{
                        background: `hsl(${theme.colors.background})`,
                        color: `hsl(${theme.colors.foreground})`,
                        border: `1px solid hsl(${theme.colors.border})`,
                      }}
                    >
                      <div className="flex gap-2">
                        <div 
                          className="h-6 flex-1 rounded"
                          style={{ background: `hsl(${theme.colors.primary})` }}
                        />
                        <div 
                          className="h-6 flex-1 rounded"
                          style={{ background: `hsl(${theme.colors.secondary})` }}
                        />
                        <div 
                          className="h-6 flex-1 rounded"
                          style={{ background: `hsl(${theme.colors.accent})` }}
                        />
                      </div>
                      <div 
                        className="h-12 rounded p-2 text-xs"
                        style={{ 
                          background: `hsl(${theme.colors.card})`,
                          color: `hsl(${theme.colors.cardForeground})`,
                        }}
                      >
                        Sample card
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (typeof window !== 'undefined' && (window as any).activateThemePreview) {
                            (window as any).activateThemePreview(theme.name, theme.colors);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleImport(theme)}
                        disabled={importing === theme.id}
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        {importing === theme.id ? "..." : "Import"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
