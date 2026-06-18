import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanLine } from "lucide-react";

export function HiveScannerButton({ onScan }: { onScan: (hiveId: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<Html5Qrcode | null>(null);
  const elementId = "hive-qr-reader";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    ref.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (cancelled) return;
          let hiveId = decoded;
          try {
            const u = new URL(decoded);
            const id = u.searchParams.get("scan");
            if (id) hiveId = id;
          } catch {}
          cancelled = true;
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          setOpen(false);
          onScan(hiveId);
        },
        () => {},
      )
      .catch(() => {});

    return () => {
      cancelled = true;
      if (ref.current) {
        ref.current.stop().then(() => ref.current?.clear()).catch(() => {});
        ref.current = null;
      }
    };
  }, [open, onScan]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanLine className="w-4 h-4 mr-1" /> Сканувати
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Сканувати QR вулика</DialogTitle></DialogHeader>
          <div id={elementId} className="w-full rounded overflow-hidden" />
          <p className="text-xs text-muted-foreground text-center">Наведіть камеру на QR-код вулика.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
