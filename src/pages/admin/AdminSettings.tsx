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
import { Save, Upload, Image as ImageIcon, Palette } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    company_name: "",
    logo_url: "",
    login_background_url: "",
    login_blur_amount: "0",
    active_theme: "default",
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "company_name",
          "logo_url",
          "login_background_url",
          "login_blur_amount",
          "active_theme",
        ]);

      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      setSettings({
        company_name: settingsMap.company_name || "",
        logo_url: settingsMap.logo_url || "",
        login_background_url: settingsMap.login_background_url || "",
        login_blur_amount: settingsMap.login_blur_amount || "0",
        active_theme: settingsMap.active_theme || "default",
      });

      return settingsMap;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settingsToUpdate = [
        { key: "company_name", value: settings.company_name },
        { key: "logo_url", value: settings.logo_url },
        { key: "login_background_url", value: settings.login_background_url },
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
      
      // Reload page if theme changed
      if (settings.active_theme !== appSettings?.active_theme) {
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (error) => {
      toast.error("Failed to save settings");
      console.error(error);
    },
  });

  const handleFileUpload = async (file: File, type: 'logo' | 'background') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(`Failed to upload ${type}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    if (type === 'logo') {
      setSettings({ ...settings, logo_url: publicUrl });
    } else {
      setSettings({ ...settings, login_background_url: publicUrl });
    }

    toast.success(`${type === 'logo' ? 'Logo' : 'Background'} uploaded successfully`);
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
                Theme
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
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="halloween">Halloween</SelectItem>
                    <SelectItem value="christmas">Christmas</SelectItem>
                    <SelectItem value="christmas-wonderland">Christmas Wonderland</SelectItem>
                  </SelectContent>
                </Select>
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
                    if (file) handleFileUpload(file, 'logo');
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Login Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.login_background_url && (
                <div className="border rounded-lg p-4 bg-muted">
                  <img
                    src={settings.login_background_url}
                    alt="Login Background"
                    className="max-h-32 w-full object-cover rounded"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="bg-upload">Upload Background Image</Label>
                <Input
                  id="bg-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'background');
                  }}
                />
              </div>
              <div>
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
    </DashboardLayout>
  );
};

export default AdminSettings;
