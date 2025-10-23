import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, FileText, Receipt } from "lucide-react";
import { PrintReceipt } from "./PrintReceipt";

interface PrintReceiptDialogProps {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    box_size?: string;
  }>;
  total: number;
  serviceFee: number;
  date: Date;
  onPOSPrint: () => void;
}

export function PrintReceiptDialog({
  orderNumber,
  customerName,
  items,
  total,
  serviceFee,
  date,
  onPOSPrint,
}: PrintReceiptDialogProps) {
  const [open, setOpen] = useState(false);

  const handlePOSPrint = () => {
    onPOSPrint();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Receipt Design</DialogTitle>
          <DialogDescription>
            Select which receipt design you want to print
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col gap-2">
            <PrintReceipt
              orderNumber={orderNumber}
              customerName={customerName}
              items={items}
              total={total}
              serviceFee={serviceFee}
              date={date}
            />
            <div className="text-center px-2">
              <div className="font-semibold text-sm">Customizable Design</div>
              <div className="text-xs text-muted-foreground">
                Template-based receipt
              </div>
            </div>
          </div>
          <Button
            onClick={handlePOSPrint}
            variant="outline"
            className="h-auto flex flex-col gap-2 p-4"
          >
            <FileText className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Standard Invoice</div>
              <div className="text-xs text-muted-foreground">
                Full-page format
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
