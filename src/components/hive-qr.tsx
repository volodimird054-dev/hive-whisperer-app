import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Printer, FileDown } from "lucide-react";

async function renderHiveQr(canvas: HTMLCanvasElement, hiveId: string) {
  // Короткий URL + низька корекція = менше модулів = більші «пікселі»
  const url = `${window.location.origin}/h/${hiveId}`;
  await QRCode.toCanvas(canvas, url, {
    width: 720,
    margin: 2,
    errorCorrectionLevel: "L",
    color: { dark: "#1a1206", light: "#ffffff" },
  });
}

export function HiveQrButton({ hiveId, number }: { hiveId: string; number: string | number }) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) { setReady(false); return; }
    const t = setTimeout(() => {
      if (canvasRef.current) {
        renderHiveQr(canvasRef.current, hiveId).then(() => setReady(true));
      }
    }, 30);
    return () => clearTimeout(t);
  }, [open, hiveId]);

  function print() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const w = window.open("", "_blank", "width=400,height=520");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR вулик №${number}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 6mm; }
  .qr { width: 50mm; height: 50mm; display: block; margin: 0 auto; image-rendering: pixelated; }
  .lbl { font-size: 14pt; margin-top: 3mm; font-weight: 800; }
</style></head><body>
  <img class="qr" src="${dataUrl}" />
  <div class="lbl">Вулик №${number}</div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},250);}</script>
</body></html>`);
    w.document.close();
  }

  function downloadPdf() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    // A4 портрет, мм
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const size = 50; // 5×5 см
    const x = (pageW - size) / 2;
    const y = 20;
    pdf.addImage(dataUrl, "PNG", x, y, size, size, undefined, "FAST");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`Вулик №${number}`, pageW / 2, y + size + 8, { align: "center" });
    pdf.save(`hive-${number}.pdf`);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <QrCode className="w-4 h-4 mr-2" /> QR код
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR вулика №{number}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div className="w-full flex justify-center">
              <canvas
                ref={canvasRef}
                width={720}
                height={720}
                className="w-full max-w-[260px] aspect-square bg-white rounded border"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="text-center font-bold text-lg">Вулик №{number}</div>
            <p className="text-xs text-muted-foreground text-center">
              Великі модулі для впевненого сканування. Друк — 5×5 см.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button onClick={print} disabled={!ready} variant="outline">
                <Printer className="w-4 h-4 mr-2" /> Друк
              </Button>
              <Button onClick={downloadPdf} disabled={!ready}>
                <FileDown className="w-4 h-4 mr-2" /> PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
