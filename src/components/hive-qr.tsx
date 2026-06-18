import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Printer } from "lucide-react";

export function HiveQrButton({ hiveId, number }: { hiveId: string; number: string | number }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}/hives?scan=${hiveId}`;
    QRCode.toDataURL(url, { width: 600, margin: 1, errorCorrectionLevel: "M" }).then(setDataUrl);
  }, [open, hiveId]);

  function print() {
    const w = window.open("", "_blank", "width=400,height=500");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR вулик №${number}</title>
<style>
  @page { size: auto; margin: 10mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 8mm; }
  .qr { width: 50mm; height: 50mm; display: block; margin: 0 auto; }
  .lbl { font-size: 12pt; margin-top: 4mm; font-weight: 600; }
</style></head><body>
  <img class="qr" src="${dataUrl}" />
  <div class="lbl">Вулик №${number}</div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},200);}</script>
</body></html>`);
    w.document.close();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <QrCode className="w-4 h-4 mr-2" /> QR код
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR вулика №{number}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {dataUrl ? (
              <img src={dataUrl} alt="QR" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 bg-muted animate-pulse rounded" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Роздрукуйте та наклейте на вулик. При друку розмір ~5×5 см.
            </p>
            <Button onClick={print} disabled={!dataUrl} className="w-full">
              <Printer className="w-4 h-4 mr-2" /> Друкувати 5×5 см
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
