import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ReceiptPreview } from "@/components/receipts/ReceiptPreview";
import { FileText, Save, Plus, Trash2, Star } from "lucide-react";
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

// Extended type for receipt template with new properties
type ReceiptTemplate = {
  id: string;
  name: string;
  header_text: string;
  footer_text: string;
  show_company_info: boolean;
  show_logo?: boolean;
  paper_width: number;
  show_barcode: boolean;
  text_size?: number;
  font_family?: string;
  print_margin?: number;
  logo_size?: number;
  logo_position?: 'left' | 'center' | 'right';
  category?: 'retail' | 'restaurant' | 'service' | 'other';
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export default function ReceiptSettings() {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [templateData, setTemplateData] = useState({
    name: "Default Receipt",
    header_text: "Thank you for your order!",
    footer_text: "Please come again!",
    show_company_info: true,
    show_logo: true,
    paper_width: 80,
    text_size: 12,
    font_family: "Courier New, monospace",
    print_margin: 1.6,
    logo_size: 100,
    logo_position: 'center' as 'left' | 'center' | 'right',
    category: 'other' as 'retail' | 'restaurant' | 'service' | 'other',
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    phone: "",
    tax_id: "",
  });

  // Fetch all templates
  const { data: templates } = useQuery({
    queryKey: ["receipt-templates-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReceiptTemplate[];
    },
  });

  // Get the selected template (or default)
  const template = templates?.find(t => 
    selectedTemplateId ? t.id === selectedTemplateId : t.is_default
  ) || templates?.[0];

  // Update templateData when template changes
  useEffect(() => {
    if (template) {
      setSelectedTemplateId(template.id);
      setTemplateData({
        name: template.name || "Default Receipt",
        header_text: template.header_text || "",
        footer_text: template.footer_text || "",
        show_company_info: template.show_company_info,
        show_logo: template.show_logo ?? true,
        paper_width: template.paper_width,
        text_size: template.text_size || 12,
        font_family: template.font_family || "Courier New, monospace",
        print_margin: template.print_margin || 1.6,
        logo_size: template.logo_size || 100,
        logo_position: template.logo_position || 'center',
        category: template.category || 'other',
      });
    }
  }, [template]);

  const { data: companyLogo } = useQuery({
    queryKey: ["company-logo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_logos")
        .select("logo_url")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data?.logo_url || null;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["receipt-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "company_name",
          "receipt_company_address",
          "receipt_company_phone",
          "receipt_tax_id",
        ]);

      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      setCompanyInfo({
        name: settingsMap.company_name || "",
        address: settingsMap.receipt_company_address || "",
        phone: settingsMap.receipt_company_phone || "",
        tax_id: settingsMap.receipt_tax_id || "",
      });

      return settingsMap;
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!template?.id) {
        // Create new template
        const { error } = await supabase
          .from("receipt_templates")
          .insert({
            ...templateData,
            is_default: templates?.length === 0,
          });
        if (error) throw error;
      } else {
        // Update existing template
        const { name, ...updateData } = templateData;
        const { error } = await supabase
          .from("receipt_templates")
          .update(updateData)
          .eq("id", template.id);
        if (error) throw error;
      }

      // Update company info settings
      const settingsToUpdate = [
        { key: "company_name", value: companyInfo.name },
        { key: "receipt_company_address", value: companyInfo.address },
        { key: "receipt_company_phone", value: companyInfo.phone },
        { key: "receipt_tax_id", value: companyInfo.tax_id },
      ];

      for (const setting of settingsToUpdate) {
        // Check if setting exists
        const { data: existing } = await supabase
          .from("app_settings")
          .select("id")
          .eq("key", setting.key)
          .maybeSingle();

        if (existing) {
          // Update existing setting
          const { error } = await supabase
            .from("app_settings")
            .update({ value: setting.value })
            .eq("key", setting.key);
          if (error) throw error;
        } else {
          // Insert new setting
          const { error } = await supabase
            .from("app_settings")
            .insert({ key: setting.key, value: setting.value });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-settings"] });
      toast.success("Receipt settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save receipt settings");
      console.error(error);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("receipt_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates-all"] });
      toast.success("Template deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedTemplateId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete template");
      console.error(error);
    },
  });

  const setDefaultTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // First, unset all other default templates
      const { error: unsetError } = await supabase
        .from("receipt_templates")
        .update({ is_default: false })
        .neq("id", templateId);
      if (unsetError) throw unsetError;

      // Then set this one as default
      const { error } = await supabase
        .from("receipt_templates")
        .update({ is_default: true })
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates-all"] });
      toast.success("Default template updated");
    },
    onError: (error) => {
      toast.error("Failed to set default template");
      console.error(error);
    },
  });

  const sampleItems = [
    { name: "Product A", quantity: 2, price: 15.99, box_size: "1 box" },
    { name: "Product B", quantity: 1, price: 8.50, box_size: "1/2 box" },
  ];

  const createNewTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateData({
      name: "New Template",
      header_text: "Thank you for your order!",
      footer_text: "Please come again!",
      show_company_info: true,
      show_logo: true,
      paper_width: 80,
      text_size: 12,
      font_family: "Courier New, monospace",
      print_margin: 1.6,
      logo_size: 100,
      logo_position: 'center',
      category: 'other',
    });
  };

  const filteredTemplates = categoryFilter === "all" 
    ? templates 
    : templates?.filter(t => t.category === categoryFilter);

  const categoryLabels: Record<string, string> = {
    retail: 'Retail',
    restaurant: 'Restaurant',
    service: 'Service',
    other: 'Other',
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'retail': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'restaurant': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'service': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Receipt Settings</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={createNewTemplate}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
            {template?.id && !template?.is_default && (
              <Button
                variant="outline"
                onClick={() => setDefaultTemplateMutation.mutate(template.id)}
                disabled={setDefaultTemplateMutation.isPending}
              >
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </Button>
            )}
            {template?.id && !template?.is_default && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteTemplateMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Template Grid View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Templates</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={categoryFilter === "retail" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("retail")}
                >
                  Retail
                </Button>
                <Button
                  variant={categoryFilter === "restaurant" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("restaurant")}
                >
                  Restaurant
                </Button>
                <Button
                  variant={categoryFilter === "service" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("service")}
                >
                  Service
                </Button>
                <Button
                  variant={categoryFilter === "other" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("other")}
                >
                  Other
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTemplates?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplateId(t.id);
                    setTemplateData({
                      name: t.name,
                      header_text: t.header_text || "",
                      footer_text: t.footer_text || "",
                      show_company_info: t.show_company_info,
                      show_logo: t.show_logo ?? true,
                      paper_width: t.paper_width,
                      text_size: t.text_size || 12,
                      font_family: t.font_family || "Courier New, monospace",
                      print_margin: t.print_margin || 1.6,
                      logo_size: t.logo_size || 100,
                      logo_position: t.logo_position || 'center',
                      category: t.category || 'other',
                    });
                  }}
                  className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-lg ${
                    selectedTemplateId === t.id
                      ? 'border-primary shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate flex-1">{t.name}</h3>
                    <div className="flex items-center gap-1">
                      {t.is_default && (
                        <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(t.category)}`}>
                      {categoryLabels[t.category || 'other']}
                    </span>
                  </div>
                  <div className="bg-muted rounded overflow-hidden" style={{ height: '200px' }}>
                    <div className="scale-[0.4] origin-top-left" style={{ width: '250%' }}>
                      <ReceiptPreview
                        orderNumber="12345"
                        customerName="John Doe"
                        items={[
                          { name: "Product A", quantity: 2, price: 15.99, box_size: "1 box" },
                        ]}
                        total={31.98}
                        serviceFee={3.00}
                        date={new Date()}
                        template={{
                          header_text: t.header_text || "",
                          footer_text: t.footer_text || "",
                          show_company_info: t.show_company_info,
                          show_logo: t.show_logo ?? true,
                          paper_width: t.paper_width,
                          logo_size: t.logo_size || 100,
                          logo_position: t.logo_position || 'center',
                        }}
                        companyInfo={companyInfo}
                        logoUrl={companyLogo}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, address: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="tax-id">Tax ID</Label>
                  <Input
                    id="tax-id"
                    value={companyInfo.tax_id}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, tax_id: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={templateData.name}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        name: e.target.value,
                      })
                    }
                    disabled={!!template?.id}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={templateData.category}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        category: e.target.value as 'retail' | 'restaurant' | 'service' | 'other',
                      })
                    }
                  >
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="header">Header Text</Label>
                  <Textarea
                    id="header"
                    value={templateData.header_text}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        header_text: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="footer">Footer Text</Label>
                  <Textarea
                    id="footer"
                    value={templateData.footer_text}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        footer_text: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-company">Show Company Info</Label>
                  <Switch
                    id="show-company"
                    checked={templateData.show_company_info}
                    onCheckedChange={(checked) =>
                      setTemplateData({
                        ...templateData,
                        show_company_info: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-logo">Show Company Logo</Label>
                  <Switch
                    id="show-logo"
                    checked={templateData.show_logo}
                    onCheckedChange={(checked) =>
                      setTemplateData({
                        ...templateData,
                        show_logo: checked,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="logo-size">Logo Size: {templateData.logo_size}px</Label>
                  <Slider
                    id="logo-size"
                    min={50}
                    max={150}
                    step={5}
                    value={[templateData.logo_size]}
                    onValueChange={(value) =>
                      setTemplateData({
                        ...templateData,
                        logo_size: value[0],
                      })
                    }
                    disabled={!templateData.show_logo}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="logo-position">Logo Position</Label>
                  <select
                    id="logo-position"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={templateData.logo_position}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        logo_position: e.target.value as 'left' | 'center' | 'right',
                      })
                    }
                    disabled={!templateData.show_logo}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="paper-width">Paper Width (mm)</Label>
                  <Input
                    id="paper-width"
                    type="number"
                    value={templateData.paper_width}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        paper_width: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="text-size">Text Size: {templateData.text_size}px</Label>
                  <Slider
                    id="text-size"
                    min={8}
                    max={24}
                    step={1}
                    value={[templateData.text_size]}
                    onValueChange={(value) =>
                      setTemplateData({
                        ...templateData,
                        text_size: value[0],
                      })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="font-family">Font Family</Label>
                  <select
                    id="font-family"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={templateData.font_family}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        font_family: e.target.value,
                      })
                    }
                  >
                    <option value="Courier New, monospace">Courier New</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="print-margin">Print Margin (cm, 0-5)</Label>
                  <Input
                    id="print-margin"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={templateData.print_margin}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        print_margin: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ReceiptPreview
                  orderNumber="12345"
                  customerName="John Doe"
                  items={sampleItems}
                  total={45.48}
                  serviceFee={5.00}
                  date={new Date()}
                  template={templateData}
                  companyInfo={companyInfo}
                  logoUrl={companyLogo}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => template?.id && deleteTemplateMutation.mutate(template.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
