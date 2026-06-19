import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ELEMENT_ID = "hive-qr-reader";

export function HiveScannerDialog({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (hiveId: string) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cancelledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;
    setError(null);
    let attempt = 0;

    const tryStart = async () => {
      // wait for DOM element to mount (Radix mounts content async)
      while (!document.getElementById(ELEMENT_ID) && attempt < 30) {
        await new Promise((r) => setTimeout(r, 50));
        attempt++;
      }
      if (!document.getElementById(ELEMENT_ID)) {
        setError("Не вдалося ініціалізувати камеру");
        return;
      }
      try {
        const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelledRef.current) return;
            cancelledRef.current = true;
            let hiveId = decoded;
            try {
              const u = new URL(decoded);
              const id = u.searchParams.get("scan");
              if (id) hiveId = id;
              else {
                const m = u.pathname.match(/\/h\/([0-9a-f-]+)/i);
                if (m) hiveId = m[1];
              }
            } catch {}
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            onOpenChange(false);
            onScan(hiveId);
          },
          () => {},
        );
      } catch (e: any) {
        setError(e?.message ?? "Камера недоступна. Дозвольте доступ у браузері.");
        toast.error("Камера недоступна");
      }
    };

    tryStart();

    return () => {
      cancelledRef.current = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [open, onOpenChange, onScan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Сканувати QR вулика</DialogTitle></DialogHeader>
        <div id={ELEMENT_ID} className="w-full rounded overflow-hidden bg-black/5 min-h-[280px]" />
        {error ? (
          <p className="text-sm text-destructive text-center">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Наведіть камеру на QR-код вулика.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
