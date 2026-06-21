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

export function HiveQrButton({ hiveId, number, label = "Вулик" }: { hiveId: string; number: string | number; label?: string }) {
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
    w.document.write(`<!doctype html><html><head><title>QR ${label.toLowerCase()} №${number}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 6mm; }
  .qr { width: 50mm; height: 50mm; display: block; margin: 0 auto; image-rendering: pixelated; }
  .lbl { font-size: 14pt; margin-top: 3mm; font-weight: 800; }
</style></head><body>
  <img class="qr" src="${dataUrl}" />
  <div class="lbl">${label} №${number}</div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},250);}</script>
</body></html>`);
    w.document.close();
  }

  function downloadPdf() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    // Наклейка трохи більше 5×5 см, щоб вмістився QR + текст знизу
    const labelW = 55;
    const labelH = 62;
    const pdf = new jsPDF({ unit: "mm", format: [labelW, labelH], orientation: "portrait" });
    const qrSize = 50; // 5×5 см
    const x = (labelW - qrSize) / 2;
    const y = 4;
    pdf.addImage(dataUrl, "PNG", x, y, qrSize, qrSize, undefined, "FAST");
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.3);
    pdf.rect(1, 1, labelW - 2, labelH - 2); // тонка рамка для вирізування
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`${label} №${number}`, labelW / 2, y + qrSize + 6, { align: "center" });
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
            <div
              className="bg-white rounded border flex items-center justify-center"
              style={{ width: 260, height: 260, padding: 8 }}
            >
              <canvas
                ref={canvasRef}
                width={720}
                height={720}
                style={{ width: 244, height: 244, imageRendering: "pixelated", display: "block" }}
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
