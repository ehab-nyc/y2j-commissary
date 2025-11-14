import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Save, Upload, Image as ImageIcon, Palette, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemePreview } from "@/components/admin/ThemePreview";
import { ThemeCustomizer } from "@/components/admin/ThemeCustomizer";
import { ThemeGallery } from "@/components/admin/ThemeGallery";
import { ColorPaletteGenerator } from "@/components/admin/ColorPaletteGenerator";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    company_name: "",
    logo_url: "",
    login_blur_amount: "0",
    active_theme: "default",
    franchise_fee: "0.00",
    commissary_rent: "0.00",
  });
  const [newThemeName, setNewThemeName] = useState("");
  const [newBackgroundName, setNewBackgroundName] = useState("");
  const [newBackgroundQuality, setNewBackgroundQuality] = useState(80);
  const [newLogoName, setNewLogoName] = useState("");
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [backgroundToDelete, setBackgroundToDelete] = useState<string | null>(null);
  const [logoToDelete, setLogoToDelete] = useState<string | null>(null);

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["company_name", "logo_url", "login_blur_amount", "active_theme", "franchise_fee", "commissary_rent"]);

      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      setSettings({
        company_name: settingsMap.company_name || "",
        logo_url: settingsMap.logo_url || "",
        login_blur_amount: settingsMap.login_blur_amount || "0",
        active_theme: settingsMap.active_theme || "default",
        franchise_fee: settingsMap.franchise_fee || "0.00",
        commissary_rent: settingsMap.commissary_rent || "0.00",
      });

      return settingsMap;
    },
  });

  const { data: themes } = useQuery({
    queryKey: ["themes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: backgrounds } = useQuery({
    queryKey: ["login-backgrounds", appSettings?.login_background_url],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_backgrounds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Migrate old background from app_settings if needed
      if (data && data.length === 0 && appSettings?.login_background_url) {
        const { error: insertError } = await supabase.from("login_backgrounds").insert({
          name: "Existing Background",
          image_url: appSettings.login_background_url,
          quality: parseInt(appSettings.login_blur_amount) || 80,
          is_active: true,
        });
        
        if (!insertError) {
          // Refetch after migration
          const { data: newData } = await supabase
            .from("login_backgrounds")
            .select("*")
            .order("created_at", { ascending: false });
          return newData || [];
        }
      }

      return data;
    },
    enabled: !!appSettings,
  });

  const { data: logos } = useQuery({
    queryKey: ["company-logos", appSettings?.logo_url],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_logos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Migrate old logo from app_settings if needed
      if (data && data.length === 0 && appSettings?.logo_url) {
        const { error: insertError } = await supabase.from("company_logos").insert({
          name: "Existing Logo",
          logo_url: appSettings.logo_url,
          is_active: true,
        });
        
        if (!insertError) {
          // Refetch after migration
          const { data: newData } = await supabase
            .from("company_logos")
            .select("*")
            .order("created_at", { ascending: false });
          return newData || [];
        }
      }

      return data;
    },
    enabled: !!appSettings,
  });

  const saveCompanyInfoMutation = useMutation({
    mutationFn: async () => {
      const settingsToUpdate = [
        { key: "company_name", value: settings.company_name },
        { key: "franchise_fee", value: settings.franchise_fee },
        { key: "commissary_rent", value: settings.commissary_rent },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Company information saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save company information");
      console.error(error);
    },
  });

  const saveThemeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "active_theme", value: settings.active_theme }, { onConflict: 'key' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Theme saved successfully");
      
      if (settings.active_theme !== appSettings?.active_theme) {
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (error) => {
      toast.error("Failed to save theme");
      console.error(error);
    },
  });

  const saveBackgroundBlurMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "login_blur_amount", value: settings.login_blur_amount }, { onConflict: 'key' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Background blur saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save background blur");
      console.error(error);
    },
  });

  const addThemeMutation = useMutation({
    mutationFn: async (themeName: string) => {
      const { error } = await supabase
        .from("themes")
        .insert({ name: themeName, is_system: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme added successfully");
      setNewThemeName("");
    },
    onError: (error) => {
      toast.error("Failed to add theme");
      console.error(error);
    },
  });

  const saveCustomThemeMutation = useMutation({
    mutationFn: async ({ name, description, colors }: { name: string; description: string; colors: any }) => {
      const { error } = await supabase
        .from("themes")
        .insert({ 
          name: name.toLowerCase().replace(/\s+/g, '-'), 
          description,
          colors,
          is_system: false 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Custom theme created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create custom theme");
      console.error(error);
    },
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const { error } = await supabase
        .from("themes")
        .delete()
        .eq("id", themeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme deleted successfully");
      setThemeToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete theme");
      console.error(error);
    },
  });

  const addBackgroundMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from("login_backgrounds")
        .insert({
          name: newBackgroundName || file.name,
          image_url: publicUrl,
          quality: newBackgroundQuality,
          is_active: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-backgrounds"] });
      toast.success("Background uploaded successfully");
      setNewBackgroundName("");
      setNewBackgroundQuality(80);
    },
    onError: (error) => {
      toast.error("Failed to upload background");
      console.error(error);
    },
  });

  const setActiveBackgroundMutation = useMutation({
    mutationFn: async (backgroundId: string) => {
      await supabase
        .from("login_backgrounds")
        .update({ is_active: false })
        .neq("id", backgroundId);

      const { error } = await supabase
        .from("login_backgrounds")
        .update({ is_active: true })
        .eq("id", backgroundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-backgrounds"] });
      toast.success("Active background updated");
    },
    onError: (error) => {
      toast.error("Failed to update active background");
      console.error(error);
    },
  });

  const updateBackgroundQualityMutation = useMutation({
    mutationFn: async ({ id, quality }: { id: string; quality: number }) => {
      const { error } = await supabase
        .from("login_backgrounds")
        .update({ quality })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-backgrounds"] });
      toast.success("Background quality updated");
    },
    onError: (error) => {
      toast.error("Failed to update quality");
      console.error(error);
    },
  });

  const deleteBackgroundMutation = useMutation({
    mutationFn: async (backgroundId: string) => {
      const { error } = await supabase
        .from("login_backgrounds")
        .delete()
        .eq("id", backgroundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-backgrounds"] });
      toast.success("Background deleted successfully");
      setBackgroundToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete background");
      console.error(error);
    },
  });

  const addLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from("company_logos")
        .insert({
          name: newLogoName || file.name,
          logo_url: publicUrl,
          is_active: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-logos"] });
      toast.success("Logo uploaded successfully");
      setNewLogoName("");
    },
    onError: (error) => {
      toast.error("Failed to upload logo");
      console.error(error);
    },
  });

  const setActiveLogoMutation = useMutation({
    mutationFn: async (logoId: string) => {
      await supabase
        .from("company_logos")
        .update({ is_active: false })
        .neq("id", logoId);

      const { error } = await supabase
        .from("company_logos")
        .update({ is_active: true })
        .eq("id", logoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-logos"] });
      toast.success("Active logo updated");
    },
    onError: (error) => {
      toast.error("Failed to update active logo");
      console.error(error);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async (logoId: string) => {
      const { error } = await supabase
        .from("company_logos")
        .delete()
        .eq("id", logoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-logos"] });
      toast.success("Logo deleted successfully");
      setLogoToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete logo");
      console.error(error);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">Branding & Settings</h1>
          <p className="text-muted-foreground">Configure app branding and appearance</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={settings.company_name}
                  onChange={(e) =>
                    setSettings({ ...settings, company_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="franchise-fee">Default Franchise Fee ($)</Label>
                <Input
                  id="franchise-fee"
                  type="number"
                  step="0.01"
                  value={settings.franchise_fee}
                  onChange={(e) =>
                    setSettings({ ...settings, franchise_fee: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="commissary-rent">Default Commissary Rent ($)</Label>
                <Input
                  id="commissary-rent"
                  type="number"
                  step="0.01"
                  value={settings.commissary_rent}
                  onChange={(e) =>
                    setSettings({ ...settings, commissary_rent: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={() => saveCompanyInfoMutation.mutate()}
                disabled={saveCompanyInfoMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Company Information
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-4 block">Available Themes</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {themes?.map((theme) => (
                    <ThemePreview
                      key={theme.id}
                      theme={theme.name}
                      isActive={settings.active_theme === theme.name}
                      onActivate={async () => {
                        setSettings({ ...settings, active_theme: theme.name });
                        await saveThemeMutation.mutateAsync();
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Manage Custom Themes</Label>
                <div className="space-y-2">
                  {themes?.filter(t => !t.is_system).map((theme) => (
                    <div key={theme.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="flex items-center gap-2">
                        {theme.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setThemeToDelete(theme.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {themes?.filter(t => !t.is_system).length === 0 && (
                    <p className="text-sm text-muted-foreground">No custom themes yet</p>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="New theme name"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                  />
                  <Button
                    onClick={() => addThemeMutation.mutate(newThemeName)}
                    disabled={!newThemeName || addThemeMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <ThemeGallery 
              onImportTheme={async (name, description, colors) => {
                await saveCustomThemeMutation.mutateAsync({ name, description, colors });
              }}
            />
            
            <ColorPaletteGenerator 
              onApplyPalette={(colors) => {
                // Apply colors to the theme customizer
                if ((window as any).applyThemeColors) {
                  (window as any).applyThemeColors(colors);
                  toast.success("Palette applied! You can now save it as a theme.");
                }
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <ThemeCustomizer
              onSave={async (name, description, colors) => {
                await saveCustomThemeMutation.mutateAsync({ name, description, colors });
              }}
            />
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Company Logos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {logos?.map((logo) => (
                  <div key={logo.id} className="border rounded-lg p-3 space-y-2">
                    <div className="relative">
                      <div className="w-full h-32 flex items-center justify-center bg-muted rounded">
                        <img
                          src={logo.logo_url}
                          alt={logo.name}
                          className="max-h-28 max-w-full object-contain"
                        />
                      </div>
                      {logo.is_active && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium truncate text-sm">{logo.name}</p>
                      <div className="flex gap-2">
                        {!logo.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setActiveLogoMutation.mutate(logo.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLogoToDelete(logo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label>Add New Logo</Label>
                <Input
                  placeholder="Logo name"
                  value={newLogoName}
                  onChange={(e) => setNewLogoName(e.target.value)}
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addLogoMutation.mutate(file);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Login Backgrounds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {backgrounds?.map((bg) => (
                  <div key={bg.id} className="border rounded-lg p-3 space-y-2">
                    <div className="relative">
                      <img
                        src={bg.image_url}
                        alt={bg.name}
                        className="w-full h-32 object-cover rounded"
                      />
                      {bg.is_active && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium truncate">{bg.name}</p>
                      <div>
                        <Label className="text-xs">Quality: {bg.quality}%</Label>
                        <Slider
                          min={1}
                          max={100}
                          step={1}
                          value={[bg.quality]}
                          onValueChange={(value) =>
                            updateBackgroundQualityMutation.mutate({ id: bg.id, quality: value[0] })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        {!bg.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setActiveBackgroundMutation.mutate(bg.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBackgroundToDelete(bg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label>Add New Background</Label>
                <Input
                  placeholder="Background name"
                  value={newBackgroundName}
                  onChange={(e) => setNewBackgroundName(e.target.value)}
                />
                <div>
                  <Label>Quality: {newBackgroundQuality}%</Label>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[newBackgroundQuality]}
                    onValueChange={(value) => setNewBackgroundQuality(value[0])}
                  />
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addBackgroundMutation.mutate(file);
                  }}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label htmlFor="blur-amount">Background Blur: {settings.login_blur_amount}px</Label>
                <Slider
                  id="blur-amount"
                  min={0}
                  max={20}
                  step={1}
                  value={[parseInt(settings.login_blur_amount)]}
                  onValueChange={(value) =>
                    setSettings({ ...settings, login_blur_amount: value[0].toString() })
                  }
                />
                <Button
                  onClick={() => saveBackgroundBlurMutation.mutate()}
                  disabled={saveBackgroundBlurMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Background Blur
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!themeToDelete} onOpenChange={() => setThemeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this theme? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => themeToDelete && deleteThemeMutation.mutate(themeToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!backgroundToDelete} onOpenChange={() => setBackgroundToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Background</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this background? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => backgroundToDelete && deleteBackgroundMutation.mutate(backgroundToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!logoToDelete} onOpenChange={() => setLogoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Logo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this logo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logoToDelete && deleteLogoMutation.mutate(logoToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminSettings;