import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Printer, FileDown } from "lucide-react";

const QR_PX = 720;

// Малює QR + білий круг з номером посередині на canvas.
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
  const baseR = Math.min(w * 0.18, w * (0.11 + text.length * 0.018));
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, w * 0.005);
  ctx.strokeStyle = "#1a1206";
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#1a1206";
  ctx.font = `900 ${Math.floor(baseR * 1.05)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + baseR * 0.05);
}

// Composite: QR + підпис знизу. Оскільки jsPDF helvetica не має кирилиці,
// весь лейбл (QR + текст) малюємо як одну картинку — так підпис завжди
// відображається правильно і у екрані, і у PDF, і у друці.
async function renderLabelCanvas(
  hiveId: string,
  number: string | number,
  label: string,
): Promise<HTMLCanvasElement> {
  const qr = document.createElement("canvas");
  qr.width = QR_PX;
  qr.height = QR_PX;
  await renderHiveQrToCanvas(qr, hiveId, number);

  const captionH = Math.floor(QR_PX * 0.14);
  const canvas = document.createElement("canvas");
  canvas.width = QR_PX;
  canvas.height = QR_PX + captionH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qr, 0, 0);
  ctx.fillStyle = "#1a1206";
  ctx.font = `800 ${Math.floor(captionH * 0.62)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${label} №${number}`, canvas.width / 2, QR_PX + captionH / 2);
  return canvas;
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

  async function print() {
    const composite = await renderLabelCanvas(hiveId, number, label);
    const dataUrl = composite.toDataURL("image/png");
    const w = window.open("", "_blank", "width=400,height=520");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR ${label} №${number}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 6mm; }
  .qr { width: 50mm; height: auto; display: block; margin: 0 auto; image-rendering: pixelated; }
</style></head><body>
  <img class="qr" src="${dataUrl}" />
  <script>window.onload=()=>{setTimeout(()=>{window.print();},250);}</script>
</body></html>`);
    w.document.close();
  }

  async function downloadPdf() {
    const composite = await renderLabelCanvas(hiveId, number, label);
    const dataUrl = composite.toDataURL("image/png");
    const labelW = 55;
    const labelH = 62;
    const pdf = new jsPDF({ unit: "mm", format: [labelW, labelH], orientation: "portrait" });
    const imgSize = 50;
    const imgH = imgSize * (composite.height / composite.width);
    const x = (labelW - imgSize) / 2;
    const y = (labelH - imgH) / 2;
    pdf.addImage(dataUrl, "PNG", x, y, imgSize, imgH, undefined, "FAST");
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.3);
    pdf.rect(1, 1, labelW - 2, labelH - 2);
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
            {/* Завжди квадратний QR, обмежений максимальним розміром */}
            <div
              className="bg-white rounded border p-3"
              style={{ width: "min(80vw, 260px)", aspectRatio: "1 / 1" }}
            >
              <canvas
                ref={canvasRef}
                width={QR_PX}
                height={QR_PX}
                style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: "block" }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Наклейка 50×50 мм. QR стабільний для цього {label.toLowerCase()}а.
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
 * PDF на A4 з наклейками 50×50 мм. Підпис («Вулик №N») малюється прямо
 * на QR-зображенні через canvas — тому кирилиця в PDF відображається правильно.
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
  const cellW = 60;
  const cellH = 65;
  const cols = Math.max(1, Math.floor((pageW - marginX * 2) / cellW));
  const rows = Math.max(1, Math.floor((pageH - marginY * 2) / cellH));
  const perPage = cols * rows;
  const imgSize = 50;

  for (let i = 0; i < hives.length; i++) {
    if (i > 0 && i % perPage === 0) pdf.addPage();
    const idxOnPage = i % perPage;
    const r = Math.floor(idxOnPage / cols);
    const c = idxOnPage % cols;
    const x0 = marginX + c * cellW;
    const y0 = marginY + r * cellH;
    const composite = await renderLabelCanvas(hives[i].id, hives[i].number, label);
    const dataUrl = composite.toDataURL("image/png");
    const imgH = imgSize * (composite.height / composite.width);
    const imgX = x0 + (cellW - imgSize) / 2;
    const imgY = y0 + (cellH - imgH) / 2;
    pdf.addImage(dataUrl, "PNG", imgX, imgY, imgSize, imgH, undefined, "FAST");
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.rect(x0 + 1, y0 + 1, cellW - 2, cellH - 2);
  }
  pdf.save(`qr-${label.toLowerCase()}-${hives.length}.pdf`);
}
