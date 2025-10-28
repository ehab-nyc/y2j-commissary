import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Printer, CheckCircle, XCircle } from "lucide-react";
import { checkStarPrinterConnection } from "@/lib/starPrinter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StarPrinterSettings() {
  const queryClient = useQueryClient();
  const [printerIp, setPrinterIp] = useState("");
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["star-printer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["star_printer_ip", "star_printer_width", "star_printer_enabled"]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      // Set local state
      if (settingsMap.star_printer_ip) {
        setPrinterIp(settingsMap.star_printer_ip);
      }
      if (settingsMap.star_printer_width) {
        setPaperWidth(settingsMap.star_printer_width as "58" | "80");
      }
      if (settingsMap.star_printer_enabled) {
        setEnabled(settingsMap.star_printer_enabled === "true");
      }

      return settingsMap;
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: "star_printer_ip", value: printerIp },
        { key: "star_printer_width", value: paperWidth },
        { key: "star_printer_enabled", value: enabled.toString() },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["star-printer-settings"] });
      toast.success("Star printer settings saved!");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const handleTestConnection = async () => {
    if (!printerIp) {
      toast.error("Please enter a printer IP address");
      return;
    }

    setTesting(true);
    setConnectionStatus("unknown");

    try {
      // Check if Star WebPRNT libraries are loaded
      if (typeof (window as any).StarWebPrintBuilder === 'undefined' ||
          typeof (window as any).StarWebPrintTrader === 'undefined') {
        setConnectionStatus("error");
        toast.error("Star WebPRNT library not loaded. Please refresh the page.");
        return;
      }

      // Try to send a minimal test print
      const builder = new (window as any).StarWebPrintBuilder();
      const url = `http://${printerIp}/StarWebPRNT/SendMessage`;
      const papertype = 'normal';
      
      const request = builder.createInitializationElement();
      
      // Set up a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 5000);
      });

      // Set up the connection test
      const connectionPromise = new Promise((resolve, reject) => {
        const trader = new (window as any).StarWebPrintTrader({ url, papertype });
        
        trader.onReceive = () => resolve(true);
        trader.onError = (error: any) => reject(error);
        
        trader.sendMessage({ request });
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      
      setConnectionStatus("connected");
      toast.success("Printer connection successful!");
    } catch (error) {
      console.error("Connection test error:", error);
      setConnectionStatus("error");
      toast.error("Could not connect to printer. Check IP, network, and WebPRNT mode.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Star Printer Settings (TSP143IV-UE)
        </CardTitle>
        <CardDescription>
          Configure your Star TSP143IV-UE or other WebPRNT-compatible Star printer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>Important Setup Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Printer and device must be on the same WiFi network</li>
              <li>WebPRNT mode must be enabled on the printer</li>
              <li>Find the IP on the printer's configuration page</li>
            </ul>
            {window.location.protocol === 'https:' && (
              <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded">
                <strong className="text-warning">⚠️ HTTPS/HTTP Security Limitation:</strong>
                <p className="mt-1 text-sm">
                  Your web browser blocks connections from secure (HTTPS) websites to local HTTP devices. 
                  <strong> The connection test will always fail in this web app.</strong>
                </p>
                <p className="mt-2 text-sm">
                  <strong>Solutions:</strong>
                </p>
                <ul className="list-disc list-inside text-sm mt-1 ml-2">
                  <li>Use <strong>Browser Print</strong> button instead (works perfectly)</li>
                  <li>Or install the <strong>Star WebPRNT Browser</strong> mobile app from your app store</li>
                  <li>Or access via local network HTTP (not available in Lovable)</li>
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="star-enabled">Enable Star Printer</Label>
            <Switch
              id="star-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="printer-ip">Printer IP Address</Label>
            <div className="flex gap-2">
              <Input
                id="printer-ip"
                placeholder="192.168.1.100"
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                disabled={!enabled}
              />
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!enabled || !printerIp || testing}
              >
                {testing ? "Testing..." : "Test"}
              </Button>
            </div>
            {connectionStatus === "connected" && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Connected successfully
              </p>
            )}
            {connectionStatus === "error" && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Connection failed - check IP and network
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-width">Paper Width</Label>
            <Select
              value={paperWidth}
              onValueChange={(value) => setPaperWidth(value as "58" | "80")}
              disabled={!enabled}
            >
              <SelectTrigger id="paper-width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm (2 inch)</SelectItem>
                <SelectItem value="80">80mm (3 inch)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!enabled || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-xs space-y-2">
            <p><strong>Setup Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connect printer to your network (WiFi or Ethernet)</li>
              <li>Print configuration page to find IP address</li>
              <li>Ensure WebPRNT mode is enabled in printer settings</li>
              <li>Enter IP address above and test connection</li>
              <li>Enable and save settings</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
