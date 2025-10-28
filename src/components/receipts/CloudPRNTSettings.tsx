import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Printer, CheckCircle2, XCircle, Info } from "lucide-react";

export function CloudPRNTSettings() {
  const [printerMac, setPrinterMac] = useState("");
  const [paperWidth, setPaperWidth] = useState(80);
  const [enabled, setEnabled] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['cloudprnt-settings'],
    queryFn: async () => {
      const { data: macData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'cloudprnt_printer_mac')
        .single();

      const { data: enabledData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'cloudprnt_enabled')
        .single();

      const { data: paperData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'star_paper_width')
        .single();

      return {
        printer_mac: macData?.value || '',
        enabled: enabledData?.value === 'true',
        paper_width: paperData?.value ? parseInt(paperData.value) : 80,
      };
    },
  });

  useEffect(() => {
    if (settings) {
      setPrinterMac(settings.printer_mac);
      setEnabled(settings.enabled);
      setPaperWidth(settings.paper_width);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'cloudprnt_printer_mac', value: printerMac },
        { key: 'cloudprnt_enabled', value: enabled.toString() },
        { key: 'star_paper_width', value: paperWidth.toString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudprnt-settings'] });
      toast({
        title: "Settings saved",
        description: "CloudPRNT printer settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Star CloudPRNT Settings (TSP143IV-UE)
        </CardTitle>
        <CardDescription>
          Configure your Star TSP143IV-UE printer with CloudPRNT for seamless HTTPS printing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>CloudPRNT Setup Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
              <li>Print the printer's configuration page to find the MAC address</li>
              <li>Enable CloudPRNT mode on your printer (see printer manual)</li>
              <li>Configure the printer to poll this URL:
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                  {window.location.origin}/functions/v1/cloudprnt-server?mac=YOUR_MAC_ADDRESS
                </code>
              </li>
              <li>Enter the MAC address below and enable CloudPRNT</li>
            </ol>
            <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded">
              <strong className="text-primary">✅ Works with HTTPS!</strong>
              <p className="text-sm mt-1">
                CloudPRNT solves the HTTPS/HTTP blocking issue. The printer polls your server for jobs, so no browser security restrictions apply.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cloudprnt-enabled">Enable CloudPRNT</Label>
              <p className="text-sm text-muted-foreground">
                Turn on automatic printing via CloudPRNT
              </p>
            </div>
            <Switch
              id="cloudprnt-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="printer-mac">Printer MAC Address</Label>
            <Input
              id="printer-mac"
              placeholder="XX:XX:XX:XX:XX:XX"
              value={printerMac}
              onChange={(e) => setPrinterMac(e.target.value.toUpperCase())}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground">
              Find this on the printer's configuration page
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-width">Paper Width</Label>
            <Select 
              value={paperWidth.toString()} 
              onValueChange={(value) => setPaperWidth(parseInt(value))}
              disabled={!enabled}
            >
              <SelectTrigger id="paper-width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm</SelectItem>
                <SelectItem value="80">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !enabled || !printerMac}
          className="w-full"
        >
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>

        <Alert className="mt-4">
          <AlertDescription className="text-xs">
            <strong>How it works:</strong> Your printer periodically checks the CloudPRNT server URL for new print jobs. 
            When you click print, the job is queued in the database, and the next time your printer polls, 
            it will retrieve and print the job automatically.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
