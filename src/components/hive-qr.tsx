import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Printer } from "lucide-react";

async function renderHiveQr(canvas: HTMLCanvasElement, hiveId: string, number: string | number) {
  // Короткий URL → менше модулів → більші «пікселі» на тому ж розмірі
  const url = `${window.location.origin}/h/${hiveId}`;
  await QRCode.toCanvas(canvas, url, {
    width: 800,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1a1206", light: "#ffffff" },
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = canvas.width * 0.16;
  // біла плашка з рамкою
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1a1206";
  ctx.stroke();
  // номер всередині
  const label = String(number);
  ctx.fillStyle = "#1a1206";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = label.length <= 2 ? r * 1.1 : label.length <= 3 ? r * 0.9 : r * 0.7;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.fillText(label, cx, cy + size * 0.05);
}

export function HiveQrButton({ hiveId, number }: { hiveId: string; number: string | number }) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) { setReady(false); return; }
    const t = setTimeout(() => {
      if (canvasRef.current) {
        renderHiveQr(canvasRef.current, hiveId, number).then(() => setReady(true));
      }
    }, 30);
    return () => clearTimeout(t);
  }, [open, hiveId, number]);

  function print() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const w = window.open("", "_blank", "width=400,height=500");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR вулик №${number}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 6mm; }
  .qr { width: 50mm; height: 50mm; display: block; margin: 0 auto; image-rendering: pixelated; }
  .lbl { font-size: 11pt; margin-top: 3mm; font-weight: 700; }
</style></head><body>
  <img class="qr" src="${dataUrl}" />
  <div class="lbl">Вулик №${number}</div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},250);}</script>
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
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="w-64 h-64 bg-white rounded border"
              style={{ imageRendering: "pixelated" }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Великі модулі + номер у центрі. При друку — 5×5 см.
            </p>
            <Button onClick={print} disabled={!ready} className="w-full">
              <Printer className="w-4 h-4 mr-2" /> Друкувати 5×5 см
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
