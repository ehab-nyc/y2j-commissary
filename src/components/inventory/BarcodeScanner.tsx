import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scan } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("");

  const handleScan = () => {
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode("");
    } else {
      toast.error("Please enter a barcode");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="Scan or enter barcode..."
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1"
        autoFocus
      />
      <Button onClick={handleScan} variant="outline">
        <Scan className="h-4 w-4 mr-2" />
        Scan
      </Button>
    </div>
  );
}
