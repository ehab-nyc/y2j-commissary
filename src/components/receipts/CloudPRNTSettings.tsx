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
import { Printer, CheckCircle2, XCircle, Info, AlertTriangle, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { queueTestPrint } from "@/lib/starPrinter";

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

  // Fetch pending jobs for troubleshooting
  const { data: pendingJobs } = useQuery({
    queryKey: ['cloudprnt-pending-jobs', printerMac],
    queryFn: async () => {
      if (!printerMac) return [];
      const { data } = await supabase
        .from('cloudprnt_queue')
        .select('*')
        .eq('printer_mac', printerMac)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!printerMac && enabled,
  });

  useEffect(() => {
    if (settings) {
      setPrinterMac(settings.printer_mac);
      setEnabled(settings.enabled);
      setPaperWidth(settings.paper_width);
    }
  }, [settings]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The URL has been copied to your clipboard.",
    });
  };

  const handleTestPrint = async () => {
    if (!printerMac) {
      toast({
        title: "Error",
        description: "Please enter a printer MAC address first",
        variant: "destructive",
      });
      return;
    }

    try {
      await queueTestPrint(printerMac, supabase);
      toast({
        title: "Test Print Queued",
        description: "Check your printer for a test receipt. If nothing prints, check printer mode and settings.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to queue test print",
        variant: "destructive",
      });
    }
  };

  const cloudPrntUrl = `https://jscmqiktfesaggpdeegk.supabase.co/functions/v1/cloudprnt-server?mac=${printerMac}`;

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
              <li>Enter the MAC address below and enable CloudPRNT</li>
              <li>Enable CloudPRNT mode on your printer (see printer manual)</li>
              <li>Configure your printer to poll the CloudPRNT server URL (shown below in Troubleshooting section)</li>
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

        <div className="flex gap-2">
          <Button
            onClick={handleTestPrint}
            variant="outline"
            disabled={!enabled || !printerMac}
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            Send Test Print
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !enabled || !printerMac}
            className="flex-1"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <Alert className="mt-4">
          <AlertDescription className="text-xs">
            <strong>How it works:</strong> Your printer periodically checks the CloudPRNT server URL for new print jobs. 
            When you click print, the job is queued in the database, and the next time your printer polls, 
            it will retrieve and print the job automatically.
          </AlertDescription>
        </Alert>

        {enabled && printerMac && (
          <>
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Troubleshooting</h3>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <strong className="block mb-1">Your CloudPRNT Server URL:</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                          {cloudPrntUrl}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(cloudPrntUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Configure this URL in your printer's CloudPRNT settings
                      </p>
                    </div>

                    <div>
                      <strong className="block mb-1">Connection Status:</strong>
                      {pendingJobs && pendingJobs.length > 0 ? (
                        <div className="flex items-center gap-2 text-warning">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">
                            {pendingJobs.length} job(s) pending - Printer may not be polling
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">No pending jobs</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                      <p><strong>If print jobs are stuck as "pending":</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Verify the printer is powered on and connected to your network</li>
                        <li>Check that the printer's CloudPRNT URL exactly matches the URL above</li>
                        <li>Ensure the printer's polling interval is set to 3-5 seconds</li>
                        <li>Verify the MAC address entered above matches your printer's MAC</li>
                        <li>Try power cycling the printer after configuring CloudPRNT</li>
                      </ol>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 p-3 rounded text-xs">
                      <strong className="block mb-1">Printer Configuration:</strong>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Access printer web interface at <code>http://[PRINTER-IP]</code></li>
                        <li>Go to CloudPRNT settings</li>
                        <li>Set Server Type: <strong>URL</strong></li>
                        <li>Paste the URL above into Server URL field</li>
                        <li>Set Polling Interval: <strong>3-5 seconds</strong></li>
                        <li>Set Upload Method: <strong>POST</strong></li>
                        <li>Enable CloudPRNT and save settings</li>
                      </ol>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
