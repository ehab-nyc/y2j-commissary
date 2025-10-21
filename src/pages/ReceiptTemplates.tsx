import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Star } from "lucide-react";
import { toast } from "sonner";

export default function ReceiptTemplates() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    header_text: "",
    footer_text: "",
    show_logo: true,
    show_company_info: true,
    show_barcode: false,
    paper_width: 80,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["receipt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("receipt_templates")
        .insert(formData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      toast.success("Template created");
      setIsCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: any) => {
      const { error } = await supabase
        .from("receipt_templates")
        .update(formData)
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      toast.success("Template updated");
      setEditingTemplate(null);
      resetForm();
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // First, unset all defaults
      await supabase
        .from("receipt_templates")
        .update({ is_default: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Then set the new default
      const { error } = await supabase
        .from("receipt_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-templates"] });
      toast.success("Default template updated");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      header_text: "",
      footer_text: "",
      show_logo: true,
      show_company_info: true,
      show_barcode: false,
      paper_width: 80,
    });
  };

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      header_text: template.header_text || "",
      footer_text: template.footer_text || "",
      show_logo: template.show_logo,
      show_company_info: template.show_company_info,
      show_barcode: template.show_barcode,
      paper_width: template.paper_width,
    });
    setEditingTemplate(template);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Receipt Templates</h1>
          <Dialog open={isCreating || !!editingTemplate} onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false);
              setEditingTemplate(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="header">Header Text</Label>
                  <Textarea
                    id="header"
                    value={formData.header_text}
                    onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                    placeholder="e.g., Thank you for your order!"
                  />
                </div>

                <div>
                  <Label htmlFor="footer">Footer Text</Label>
                  <Textarea
                    id="footer"
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    placeholder="e.g., Please come again!"
                  />
                </div>

                <div>
                  <Label htmlFor="width">Paper Width (mm)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.paper_width}
                    onChange={(e) => setFormData({ ...formData, paper_width: parseInt(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-logo">Show Logo</Label>
                  <Switch
                    id="show-logo"
                    checked={formData.show_logo}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-company">Show Company Info</Label>
                  <Switch
                    id="show-company"
                    checked={formData.show_company_info}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_company_info: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-barcode">Show Barcode</Label>
                  <Switch
                    id="show-barcode"
                    checked={formData.show_barcode}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_barcode: checked })}
                  />
                </div>

                <Button
                  onClick={() => editingTemplate ? updateMutation.mutate(editingTemplate) : createMutation.mutate()}
                  disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                  className="w-full"
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading templates...</div>
            ) : (
              <div className="space-y-4">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.is_default && (
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.paper_width}mm | 
                        Logo: {template.show_logo ? "Yes" : "No"} | 
                        Barcode: {template.show_barcode ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDefaultMutation.mutate(template.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
