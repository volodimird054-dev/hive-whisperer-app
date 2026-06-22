import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Printer, FileDown } from "lucide-react";

const QR_PX = 720;

// Малює QR + білий круг з номером посередині на canvas
export async function renderHiveQrToCanvas(
  canvas: HTMLCanvasElement,
  hiveId: string,
  number: string | number,
) {
  const url = `${window.location.origin}/h/${hiveId}`;
  await QRCode.toCanvas(canvas, url, {
    width: QR_PX,
    margin: 2,
    errorCorrectionLevel: "H", // дозволяє «закрити» центр без втрати читаності
    color: { dark: "#1a1206", light: "#ffffff" },
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const cx = w / 2;
  const cy = w / 2;
  const text = String(number);
  // Радіус залежить від довжини номера, але не більше 22% від QR
  const baseR = Math.min(w * 0.22, w * (0.13 + text.length * 0.02));
  // Білий круг з тонкою рамкою
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, w * 0.005);
  ctx.strokeStyle = "#1a1206";
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.stroke();
  // Номер
  ctx.fillStyle = "#1a1206";
  ctx.font = `900 ${Math.floor(baseR * 1.1)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + baseR * 0.05);
}

async function generateQrDataUrl(hiveId: string, number: string | number) {
  const c = document.createElement("canvas");
  c.width = QR_PX;
  c.height = QR_PX;
  await renderHiveQrToCanvas(c, hiveId, number);
  return c.toDataURL("image/png");
}

export function HiveQrButton({
  hiveId,
  number,
  label = "Вулик",
}: {
  hiveId: string;
  number: string | number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => {
      if (canvasRef.current) {
        renderHiveQrToCanvas(canvasRef.current, hiveId, number).then(() => setReady(true));
      }
    }, 30);
    return () => clearTimeout(t);
  }, [open, hiveId, number]);

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
    const labelW = 55;
    const labelH = 62;
    const pdf = new jsPDF({ unit: "mm", format: [labelW, labelH], orientation: "portrait" });
    const qrSize = 50;
    const x = (labelW - qrSize) / 2;
    const y = 4;
    pdf.addImage(dataUrl, "PNG", x, y, qrSize, qrSize, undefined, "FAST");
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.3);
    pdf.rect(1, 1, labelW - 2, labelH - 2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`${label} #${number}`, labelW / 2, y + qrSize + 6, { align: "center" });
    pdf.save(`hive-${number}.pdf`);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <QrCode className="w-4 h-4 mr-2" /> QR код
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR {label.toLowerCase()} №{number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div
              className="bg-white rounded border flex items-center justify-center"
              style={{ width: 260, height: 260, padding: 8 }}
            >
              <canvas
                ref={canvasRef}
                width={QR_PX}
                height={QR_PX}
                style={{ width: 244, height: 244, imageRendering: "pixelated", display: "block" }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              QR створено один раз для цього вулика — не змінюється. Друк — 5×5 см.
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

/**
 * Створює PDF на A4 з наклейками 50×50 мм (з підписом «Вулик №N» знизу)
 * для вибраних вуликів. Один файл, автоматична сітка.
 */
export async function generateHivesPdf(
  hives: Array<{ id: string; number: string | number }>,
  label = "Вулик",
) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 10;
  const marginY = 12;
  const cellW = 60; // 50мм QR + поля
  const cellH = 65; // QR + підпис
  const cols = Math.floor((pageW - marginX * 2) / cellW); // ~3
  const rows = Math.floor((pageH - marginY * 2) / cellH); // ~4
  const perPage = cols * rows;

  for (let i = 0; i < hives.length; i++) {
    if (i > 0 && i % perPage === 0) pdf.addPage();
    const idxOnPage = i % perPage;
    const r = Math.floor(idxOnPage / cols);
    const c = idxOnPage % cols;
    const x0 = marginX + c * cellW;
    const y0 = marginY + r * cellH;
    const qrSize = 50;
    const qrX = x0 + (cellW - qrSize) / 2;
    const qrY = y0 + 2;
    const dataUrl = await generateQrDataUrl(hives[i].id, hives[i].number);
    pdf.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.rect(x0 + 1, y0 + 1, cellW - 2, cellH - 2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`${label} #${hives[i].number}`, x0 + cellW / 2, qrY + qrSize + 6, { align: "center" });
  }
  pdf.save(`qr-${label.toLowerCase()}-${hives.length}.pdf`);
}
