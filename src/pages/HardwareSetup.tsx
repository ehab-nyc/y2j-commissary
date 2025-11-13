import { DashboardLayout } from "@/components/DashboardLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Printer, Smartphone, Laptop, Scan, DollarSign, Info } from "lucide-react";
import { StarPrinterSettings } from "@/components/receipts/StarPrinterSettings";
import { PrintJobHistory } from "@/components/receipts/PrintJobHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HardwareSetup() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <h1 className="text-3xl font-bold">Hardware Integration</h1>

        <Tabs defaultValue="star-printer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="star-printer">Star Printer Setup</TabsTrigger>
            <TabsTrigger value="hardware-info">Hardware Options</TabsTrigger>
          </TabsList>

          <TabsContent value="star-printer" className="space-y-6">
            <Alert>
              <Printer className="h-4 w-4" />
              <AlertTitle>Star TSP143IV Printer Configuration</AlertTitle>
              <AlertDescription>
                Configure your Star printer below. Your printer must be on the same network as this device.
              </AlertDescription>
            </Alert>

            <StarPrinterSettings />

            <Card>
              <CardHeader>
                <CardTitle>Finding Your Printer IP Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Method 1: Print a Status Report</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Turn off your Star printer</li>
                    <li>Hold the FEED button while turning it on</li>
                    <li>The printer will print a status report with the IP address</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Method 2: Check Your Router</h4>
                  <p className="text-sm">
                    Log into your router's admin panel and look for connected devices. The Star printer
                    should be listed with its IP address.
                  </p>
                </div>
              </CardContent>
            </Card>

            <PrintJobHistory />
          </TabsContent>

          <TabsContent value="hardware-info" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Hardware Integration Options</AlertTitle>
              <AlertDescription>
                Choose the best approach for your POS hardware needs based on your setup and requirements.
              </AlertDescription>
            </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Option 1: Web Browser Printing */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5" />
                  Web Browser Printing
                </CardTitle>
                <Badge variant="outline">Easy Setup</Badge>
              </div>
              <CardDescription>
                Print receipts directly from your browser using standard printers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supported Hardware:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Any standard printer connected to your computer
                  </li>
                  <li className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    USB barcode scanners (work as keyboard input)
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ol className="space-y-1 text-sm list-decimal list-inside">
                  <li>Orders can be printed using browser&apos;s print dialog</li>
                  <li>Barcode scanners automatically input codes</li>
                  <li>No additional software needed</li>
                </ol>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-semibold mb-1">Limitations:</p>
                <ul className="space-y-1 text-xs">
                  <li>• No automatic cash drawer control</li>
                  <li>• Manual printer selection required</li>
                  <li>• Limited receipt customization</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Native Mobile App */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Native Mobile App (Capacitor)
                </CardTitle>
                <Badge>Full Hardware Access</Badge>
              </div>
              <CardDescription>
                Build a native mobile app for complete hardware integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supported Hardware:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Bluetooth thermal receipt printers (ESC/POS)
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cash drawers (via printer connection)
                  </li>
                  <li className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    Camera-based barcode scanning
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Setup Required:</h4>
                <ol className="space-y-1 text-sm list-decimal list-inside">
                  <li>Export project to GitHub</li>
                  <li>Install development tools (Xcode/Android Studio)</li>
                  <li>Build native app with Capacitor</li>
                  <li>Install printer plugins</li>
                </ol>
              </div>

              <div className="bg-primary/10 p-3 rounded-md text-sm">
                <p className="font-semibold mb-1">Benefits:</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Direct printer control via Bluetooth</li>
                  <li>✓ Automatic cash drawer opening</li>
                  <li>✓ Built-in camera barcode scanning</li>
                  <li>✓ Offline capabilities</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Hardware */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended POS Hardware</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Receipt Printers
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Epson TM-T88 series</li>
                  <li>• Star TSP143 series</li>
                  <li>• 80mm thermal printers</li>
                  <li>• ESC/POS compatible</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  Barcode Scanners
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• USB wired scanners</li>
                  <li>• Bluetooth wireless scanners</li>
                  <li>• 1D/2D barcode support</li>
                  <li>• Keyboard wedge mode</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cash Drawers
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• RJ11/RJ12 connection</li>
                  <li>• Connects to receipt printer</li>
                  <li>• 12V/24V compatible</li>
                  <li>• 4-5 bill compartments</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">For Browser-Based Setup:</h4>
              <p className="text-sm">
                Your current web app already supports browser printing and USB barcode scanners.
                Simply use the receipt templates page to customize your receipts, then use your
                browser&apos;s print function (Ctrl+P or Cmd+P) when viewing an order.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">For Native Mobile App:</h4>
              <p className="text-sm">
                Let me know if you&apos;d like to set up Capacitor for full hardware integration.
                I can guide you through converting this web app into a native mobile app with
                direct printer control, camera scanning, and cash drawer integration.
              </p>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
