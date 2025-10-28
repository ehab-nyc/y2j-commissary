import { useState } from "react";
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
import { ReceiptPreview } from "@/components/receipts/ReceiptPreview";
import { CloudPRNTSettings } from "@/components/receipts/CloudPRNTSettings";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";

export default function ReceiptSettings() {
  const queryClient = useQueryClient();
  const [templateData, setTemplateData] = useState({
    header_text: "Thank you for your order!",
    footer_text: "Please come again!",
    show_company_info: true,
    show_logo: true,
    paper_width: 80,
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    phone: "",
    tax_id: "",
  });

  const { data: template } = useQuery({
    queryKey: ["receipt-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setTemplateData({
          header_text: data.header_text || "",
          footer_text: data.footer_text || "",
          show_company_info: data.show_company_info,
          show_logo: data.show_logo ?? true,
          paper_width: data.paper_width,
        });
      }
      return data;
    },
  });

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
            name: "Default Receipt",
            is_default: true,
            ...templateData,
          });
        if (error) throw error;
      } else {
        // Update existing template
        const { error } = await supabase
          .from("receipt_templates")
          .update(templateData)
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
      queryClient.invalidateQueries({ queryKey: ["receipt-template"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-settings"] });
      toast.success("Receipt settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save receipt settings");
      console.error(error);
    },
  });

  const sampleItems = [
    { name: "Product A", quantity: 2, price: 15.99, box_size: "1 box" },
    { name: "Product B", quantity: 1, price: 8.50, box_size: "1/2 box" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Receipt Settings</h1>
          <Button
            onClick={() => saveTemplateMutation.mutate()}
            disabled={saveTemplateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>

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
              </CardContent>
            </Card>

            <CloudPRNTSettings />
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
      </div>
    </DashboardLayout>
  );
}
