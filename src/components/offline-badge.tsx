import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { getOfflineState, subscribeOffline, syncQueue, type OfflineState } from "@/lib/offline";

export function OfflineBadge() {
  const [s, setS] = useState<OfflineState | null>(null);
  useEffect(() => {
    setS(getOfflineState());
    return subscribeOffline(() => setS(getOfflineState()));
  }, []);
  if (!s || (s.online && s.pending === 0 && !s.syncing)) return null;
  const text = !s.online
    ? `Офлайн${s.pending ? ` · ${s.pending} змін очікують` : " · дані збережено локально"}`
    : s.syncing
      ? "Синхронізація…"
      : `${s.pending} змін очікують відправки`;
  return (
    <button
      type="button"
      onClick={() => void syncQueue()}
      className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-lg"
    >
      {s.online ? <RefreshCw className={`h-4 w-4 ${s.syncing ? "animate-spin" : ""}`} /> : <CloudOff className="h-4 w-4 text-destructive" />}
      {text}
    </button>
  );
}
