import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BulkProductImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const downloadTemplate = () => {
    const csvContent = [
      "name,description,price,quantity,category_name,barcode,cost_price,low_stock_threshold,reorder_point",
      "Sample Product,Product description,10.99,100,Sample Category,1234567890,5.50,20,50"
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const exportProducts = async () => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");

      if (error) throw error;

      const csvRows = [
        "name,description,price,quantity,category_name,barcode,cost_price,low_stock_threshold,reorder_point"
      ];

      products?.forEach(product => {
        const row = [
          `"${product.name || ""}"`,
          `"${product.description || ""}"`,
          product.price || 0,
          product.quantity || 0,
          `"${product.categories?.name || ""}"`,
          product.barcode || "",
          product.cost_price || 0,
          product.low_stock_threshold || 0,
          product.reorder_point || 0,
        ].join(",");
        csvRows.push(row);
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${products?.length || 0} products`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export products");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file is empty or invalid");
      }

      const headers = lines[0].split(",").map(h => h.trim());
      const products = [];

      // Get all categories first
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name");

      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || []);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        
        const product: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          
          if (header === "category_name") {
            const categoryId = categoryMap.get(value.toLowerCase());
            if (categoryId) {
              product.category_id = categoryId;
            }
          } else if (["price", "quantity", "cost_price", "low_stock_threshold", "reorder_point"].includes(header)) {
            product[header] = parseFloat(value) || 0;
          } else {
            product[header] = value || null;
          }
        });

        if (product.name) {
          products.push(product);
        }
      }

      // Insert products in batches
      const batchSize = 50;
      let successCount = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const { error } = await supabase
          .from("products")
          .insert(batch);

        if (error) {
          console.error("Batch insert error:", error);
          toast.error(`Error importing batch starting at row ${i + 2}`);
        } else {
          successCount += batch.length;
        }
      }

      toast.success(`Successfully imported ${successCount} of ${products.length} products`);
      setIsDialogOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import products");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportProducts}>
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Products from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import products. Download the template to see the required format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload CSV File</label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
            </div>

            {isImporting && (
              <p className="text-sm text-muted-foreground">Importing products...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
