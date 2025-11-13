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
import { checkStarCloudPRNTConnection } from "@/lib/starPrinter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StarPrinterSettings() {
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState("");
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState("3");
  const [retryDelay, setRetryDelay] = useState("5");

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["star-cloudprnt-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "star_cloudprnt_device_id",
          "star_printer_width",
          "star_cloudprnt_enabled",
          "star_cloudprnt_retry_enabled",
          "star_cloudprnt_retry_attempts",
          "star_cloudprnt_retry_delay_minutes"
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      // Set local state
      if (settingsMap.star_cloudprnt_device_id) {
        setDeviceId(settingsMap.star_cloudprnt_device_id);
      }
      if (settingsMap.star_printer_width) {
        setPaperWidth(settingsMap.star_printer_width as "58" | "80");
      }
      if (settingsMap.star_cloudprnt_enabled) {
        setEnabled(settingsMap.star_cloudprnt_enabled === "true");
      }
      if (settingsMap.star_cloudprnt_retry_enabled) {
        setRetryEnabled(settingsMap.star_cloudprnt_retry_enabled === "true");
      }
      if (settingsMap.star_cloudprnt_retry_attempts) {
        setRetryAttempts(settingsMap.star_cloudprnt_retry_attempts);
      }
      if (settingsMap.star_cloudprnt_retry_delay_minutes) {
        setRetryDelay(settingsMap.star_cloudprnt_retry_delay_minutes);
      }

      return settingsMap;
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: "star_cloudprnt_device_id", value: deviceId },
        { key: "star_printer_width", value: paperWidth },
        { key: "star_cloudprnt_enabled", value: enabled.toString() },
        { key: "star_cloudprnt_retry_enabled", value: retryEnabled.toString() },
        { key: "star_cloudprnt_retry_attempts", value: retryAttempts },
        { key: "star_cloudprnt_retry_delay_minutes", value: retryDelay },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["star-cloudprnt-settings"] });
      toast.success("Star CloudPRNT settings saved!");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const handleTestConnection = async () => {
    if (!deviceId) {
      toast.error("Please enter a device ID");
      return;
    }

    setTesting(true);
    setConnectionStatus("unknown");

    try {
      console.log("Testing CloudPRNT connection for device:", deviceId);
      toast.info("Testing connection...");

      const isConnected = await checkStarCloudPRNTConnection(deviceId, supabase);

      if (isConnected) {
        setConnectionStatus("connected");
        toast.success("✓ CloudPRNT endpoint is working!");
      } else {
        setConnectionStatus("error");
        toast.error("Failed to connect to CloudPRNT endpoint");
      }
    } catch (error: any) {
      console.error("Connection test failed:", error);
      setConnectionStatus("error");
      toast.error(error.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Star CloudPRNT Settings
        </CardTitle>
        <CardDescription>
          Configure Star CloudPRNT for internet-based printing (works from anywhere!)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>CloudPRNT Benefits:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>✅ No HTTPS/HTTP issues - works perfectly from web apps</li>
              <li>✅ Print from anywhere with internet access</li>
              <li>✅ No local network required</li>
              <li>✅ More reliable for remote scenarios</li>
            </ul>
            <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded">
              <strong>Setup Steps:</strong>
              <ol className="list-decimal list-inside text-sm mt-1 ml-2 space-y-1">
                <li>Configure printer for CloudPRNT mode (see manual)</li>
                <li>Set CloudPRNT Server URL to: <code className="bg-muted px-1 py-0.5 rounded text-xs">{window.location.origin}/functions/v1/star-cloudprnt</code></li>
                <li>Get Device ID from printer settings</li>
                <li>Enter Device ID below and test</li>
              </ol>
            </div>
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
            <Label htmlFor="device-id">Device ID</Label>
            <div className="flex gap-2">
              <Input
                id="device-id"
                placeholder="TSP143IV-XXXX"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={!enabled}
              />
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!enabled || !deviceId || testing}
              >
                {testing ? "Testing..." : "Test"}
              </Button>
            </div>
            {connectionStatus === "connected" && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                CloudPRNT endpoint working
              </p>
            )}
            {connectionStatus === "error" && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Connection failed - check device ID
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

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="retry-enabled">Automatic Retry</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically retry failed print jobs
                </p>
              </div>
              <Switch
                id="retry-enabled"
                checked={retryEnabled}
                onCheckedChange={setRetryEnabled}
                disabled={!enabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retry-attempts">Max Retry Attempts</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={retryAttempts}
                  onChange={(e) => setRetryAttempts(e.target.value)}
                  disabled={!enabled || !retryEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-delay">Retry Delay (minutes)</Label>
                <Input
                  id="retry-delay"
                  type="number"
                  min="1"
                  max="60"
                  value={retryDelay}
                  onChange={(e) => setRetryDelay(e.target.value)}
                  disabled={!enabled || !retryEnabled}
                />
              </div>
            </div>
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
            <p><strong>Finding Your Device ID:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Access printer settings through web interface or button panel</li>
              <li>Navigate to CloudPRNT settings</li>
              <li>Look for "Device ID" or "Unit ID" field</li>
              <li>Copy the ID (usually starts with printer model like TSP143IV-)</li>
              <li>Enter it above and test connection</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
