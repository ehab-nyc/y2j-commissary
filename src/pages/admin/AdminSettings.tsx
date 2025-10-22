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

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    company_name: "",
    logo_url: "",
    login_blur_amount: "0",
    active_theme: "default",
  });
  const [newThemeName, setNewThemeName] = useState("");
  const [newBackgroundName, setNewBackgroundName] = useState("");
  const [newBackgroundQuality, setNewBackgroundQuality] = useState(80);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [backgroundToDelete, setBackgroundToDelete] = useState<string | null>(null);

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["company_name", "logo_url", "login_blur_amount", "active_theme"]);

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
    queryKey: ["login-backgrounds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_backgrounds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Migrate old background from app_settings if needed
      if (data && data.length === 0 && appSettings?.login_background_url) {
        await supabase.from("login_backgrounds").insert({
          name: "Migrated Background",
          image_url: appSettings.login_background_url,
          quality: 80,
          is_active: true,
        });
        
        // Refetch after migration
        const { data: newData } = await supabase
          .from("login_backgrounds")
          .select("*")
          .order("created_at", { ascending: false });
        return newData || [];
      }

      return data;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settingsToUpdate = [
        { key: "company_name", value: settings.company_name },
        { key: "logo_url", value: settings.logo_url },
        { key: "login_blur_amount", value: settings.login_blur_amount },
        { key: "active_theme", value: settings.active_theme },
      ];

      for (const setting of settingsToUpdate) {
        await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Settings saved successfully");
      
      if (settings.active_theme !== appSettings?.active_theme) {
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (error) => {
      toast.error("Failed to save settings");
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

  const handleLogoUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload logo");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    setSettings({ ...settings, logo_url: publicUrl });
    toast.success("Logo uploaded successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Branding & Settings</h1>
            <p className="text-muted-foreground">Configure app branding and appearance</p>
          </div>
          <Button
            onClick={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">Active Theme</Label>
                <Select
                  value={settings.active_theme}
                  onValueChange={(value) =>
                    setSettings({ ...settings, active_theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes?.map((theme) => (
                      <SelectItem key={theme.id} value={theme.name}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Manage Themes</Label>
                <div className="space-y-2">
                  {themes?.filter(t => !t.is_system).map((theme) => (
                    <div key={theme.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{theme.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setThemeToDelete(theme.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.logo_url && (
                <div className="border rounded-lg p-4 bg-muted">
                  <img
                    src={settings.logo_url}
                    alt="Company Logo"
                    className="max-h-32 mx-auto object-contain"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="logo-upload">Upload New Logo</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
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

              <div className="border-t pt-4">
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
    </DashboardLayout>
  );
};

export default AdminSettings;