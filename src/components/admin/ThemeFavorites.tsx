import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppTheme } from "@/hooks/useTheme";

interface ThemeFavoritesProps {
  onSelectTheme: (themeName: AppTheme) => void;
  currentTheme: AppTheme;
}

export const ThemeFavorites = ({ onSelectTheme, currentTheme }: ThemeFavoritesProps) => {
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorite-themes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_favorite_themes")
        .select("theme_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(f => f.theme_name);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (themeName: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isFavorite = favorites.includes(themeName);

      if (isFavorite) {
        const { error } = await supabase
          .from("user_favorite_themes")
          .delete()
          .eq("user_id", user.id)
          .eq("theme_name", themeName);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_favorite_themes")
          .insert({ user_id: user.id, theme_name: themeName });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-themes"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update favorites: ${error.message}`);
    },
  });

  const allThemes: { name: AppTheme; label: string }[] = [
    { name: "default", label: "Default" },
    { name: "halloween", label: "Halloween" },
    { name: "halloween-minimal", label: "Halloween Minimal" },
    { name: "christmas", label: "Christmas" },
    { name: "christmas-wonderland", label: "Christmas Wonderland" },
    { name: "liquid-glass", label: "Liquid Glass" },
    { name: "gold-diamond", label: "Gold Diamond" },
  ];

  const favoriteThemes = allThemes.filter(theme => favorites.includes(theme.name));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Favorite Themes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-current" />
          Favorite Themes
        </CardTitle>
        <CardDescription>
          {favoriteThemes.length === 0
            ? "Mark themes as favorites for quick access"
            : "Your bookmarked themes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {favoriteThemes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click the star icon on any theme to add it to your favorites
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteThemes.map((theme) => (
              <Card key={theme.name} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{theme.label}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavoriteMutation.mutate(theme.name)}
                      disabled={toggleFavoriteMutation.isPending}
                    >
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                    </Button>
                  </div>
                  <Button
                    variant={currentTheme === theme.name ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => onSelectTheme(theme.name)}
                  >
                    {currentTheme === theme.name ? "Active" : "Apply Theme"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
