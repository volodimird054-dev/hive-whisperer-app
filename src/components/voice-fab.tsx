import { useEffect, useState } from "react";
import { Mic, Loader2, X, ScanLine, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { interpretCommand } from "@/lib/voice.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { HiveScannerDialog } from "@/components/hive-scanner";
import { useVoiceInput } from "@/hooks/use-voice-input";

const SCREENS: Record<string, string> = {
  home: "/",
  apiary: "/apiary",
  points: "/points",
  hives: "/hives",
  queens: "/queens",
  calendar: "/calendar",
  marketplace: "/marketplace",
  chat: "/chat",
};

// Шляхи, на яких ГОЛОСОВЕ керування ПРИХОВАНЕ
const VOICE_HIDDEN = ["/", "/apiary", "/marketplace", "/chat", "/queens"];

export function VoiceFab() {
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const navigate = useNavigate();
  const interpret = useServerFn(interpretCommand);
  const qc = useQueryClient();

  const { supported, listening, transcript, setTranscript, start, stop } = useVoiceInput({ silenceMs: 3500 });

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showVoice = !VOICE_HIDDEN.includes(pathname);
  const showScan = /^\/points\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!open) {
      stop();
      setTranscript("");
      setReply(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function begin() {
    if (!supported) {
      toast.error("Браузер не підтримує розпізнавання мови. Спробуйте Chrome на Android.");
      return;
    }
    setReply(null);
    start();
  }

  async function send() {
    if (!transcript.trim()) return;
    stop();
    setWorking(true);
    try {
      const res = await interpret({ data: { transcript } });
      const cmd = JSON.parse(res.json) as {
        action: string;
        fields?: Record<string, any>;
        speech?: string;
      };
      await handleCommand(cmd);
      setReply(cmd.speech ?? "Готово");
      if (cmd.action === "navigate") setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося обробити команду");
    } finally {
      setWorking(false);
    }
  }

  async function handleCommand(cmd: { action: string; fields?: Record<string, any> }) {
    const f = cmd.fields ?? {};
    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user?.id;
    if (!user_id && cmd.action !== "navigate") { toast.error("Потрібен вхід"); return; }

    async function findHive(num: string | undefined) {
      if (!num) return null;
      const { data } = await supabase.from("hives").select("id").eq("number", String(num)).maybeSingle();
      return data?.id ?? null;
    }

    switch (cmd.action) {
      case "navigate": {
        const path = SCREENS[String(f.screen)] ?? "/";
        navigate({ to: path as any });
        return;
      }
      case "add_hive": {
        await supabase.from("hives").insert({
          user_id: user_id!,
          number: String(f.number ?? "?"),
          breed: f.breed ?? null,
          notes: f.notes ?? null,
        } as any);
        toast.success(`Додано вулик ${f.number}`);
        qc.invalidateQueries({ queryKey: ["hives"] });
        return;
      }
      case "update_hive": {
        const hid = await findHive(f.hive_number);
        if (!hid) return toast.error(`Вулик ${f.hive_number} не знайдено`);
        const patch: Record<string, any> = {};
        if (f.breed != null) patch.breed = f.breed;
        if (f.queen_year != null) patch.queen_year = Number(f.queen_year);
        if (f.notes != null) patch.notes = f.notes;
        if (f.new_number != null) patch.number = String(f.new_number);
        if (!Object.keys(patch).length) return toast.info("Нічого змінювати");
        const { error } = await supabase.from("hives").update(patch as any).eq("id", hid);
        if (error) return toast.error(error.message);
        toast.success(`Оновлено вулик ${f.hive_number}`);
        qc.invalidateQueries({ queryKey: ["hives"] });
        return;
      }
      case "add_inspection": {
        const hid = await findHive(f.hive_number);
        if (!hid) return toast.error(`Вулик ${f.hive_number} не знайдено`);
        await supabase.from("inspections").insert({
          user_id: user_id!, hive_id: hid, notes: f.notes ?? null,
        } as any);
        toast.success("Огляд збережено");
        qc.invalidateQueries({ queryKey: ["inspections", hid] });
        return;
      }
      default:
        toast.info("Команду розпізнано як: " + cmd.action);
    }
  }

  if (!showVoice && !showScan) return null;

  return (
    <>
      {showScan && (
        <Button
          size="icon"
          variant="default"
          className="fixed bottom-6 left-6 z-40 rounded-full h-16 w-16 shadow-lg"
          onClick={() => setScanOpen(true)}
          aria-label="Сканувати QR"
        >
          <ScanLine className="!w-10 !h-10" />
        </Button>
      )}
      {showVoice && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 rounded-full h-16 w-16 shadow-lg"
          onClick={() => { setOpen(true); setTimeout(begin, 100); }}
          aria-label="Голосова команда"
        >
          <Mic className="!w-10 !h-10" />
        </Button>
      )}

      <HiveScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={(id) => { window.location.href = `/hives?scan=${id}`; }}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!listening) setOpen(v); else if (!v) { stop(); setOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {listening ? <><span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" /> Слухаю…</> : "Голосова команда"}
            </DialogTitle>
            <DialogDescription>
              Українською. Автоматична зупинка через ~3 сек тиші, або натисніть «Готово».
            </DialogDescription>
          </DialogHeader>

          {listening ? (
            <div className="min-h-[120px] rounded-lg border bg-muted/40 p-4">
              <div className="whitespace-pre-wrap break-words text-2xl leading-snug font-medium">
                {transcript || <span className="text-muted-foreground text-base">Очікую вашу команду…</span>}
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Розпізнаний текст з'явиться тут. Можна відредагувати перед відправкою."
                className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-base resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1">Перевірте текст і за потреби відредагуйте.</p>
            </div>
          )}

          {reply && <div className="text-sm text-foreground/80 italic">🤖 {reply}</div>}

          <div className="flex gap-2">
            {listening ? (
              <Button variant="destructive" onClick={stop} className="flex-1 h-12 text-base">
                <Square className="w-5 h-5 mr-2" /> Готово
              </Button>
            ) : (
              <Button variant="outline" onClick={begin} className="flex-1 h-12 text-base">
                <Mic className="w-5 h-5 mr-2" /> Записати знову
              </Button>
            )}
            <Button onClick={send} disabled={!transcript.trim() || working} className="flex-1 h-12 text-base">
              {working ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              Відправити
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
            <X className="w-4 h-4 mr-2" /> Закрити
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
