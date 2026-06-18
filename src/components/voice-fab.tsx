import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { interpretCommand } from "@/lib/voice.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

type SR = typeof window extends { SpeechRecognition: infer T } ? T : any;

function getRecognition(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "uk-UA";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

const SCREENS: Record<string, string> = {
  home: "/",
  apiary: "/apiary",
  hives: "/hives",
  queens: "/queens",
  calendar: "/calendar",
  marketplace: "/marketplace",
  chat: "/chat",
};

export function VoiceFab() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [working, setWorking] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const navigate = useNavigate();
  const interpret = useServerFn(interpretCommand);
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) {
      recRef.current?.stop?.();
      setTranscript("");
      setListening(false);
      setReply(null);
    }
  }, [open]);

  function start() {
    const r = getRecognition();
    if (!r) {
      toast.error("Ваш браузер не підтримує розпізнавання мови. Спробуйте Chrome на Android.");
      return;
    }
    recRef.current = r;
    setTranscript("");
    setReply(null);
    setListening(true);
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setTranscript(txt);
    };
    r.onerror = (e: any) => {
      setListening(false);
      toast.error("Помилка мікрофона: " + e.error);
    };
    r.onend = () => setListening(false);
    r.start();
  }

  function stop() {
    recRef.current?.stop?.();
    setListening(false);
  }

  async function send() {
    if (!transcript.trim()) return;
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
    if (!user_id && cmd.action !== "navigate") {
      toast.error("Потрібен вхід");
      return;
    }

    async function findHive(num: string | undefined) {
      if (!num) return null;
      const { data } = await supabase
        .from("hives")
        .select("id")
        .eq("number", String(num))
        .maybeSingle();
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
        });
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
        const { error } = await supabase.from("hives").update(patch).eq("id", hid);
        if (error) return toast.error(error.message);
        toast.success(`Оновлено вулик ${f.hive_number}`);
        qc.invalidateQueries({ queryKey: ["hives"] });
        return;
      }
      case "update_queen_batch": {
        const { data: b } = await supabase.from("queen_batches")
          .select("id").ilike("name", `%${String(f.name ?? "")}%`).maybeSingle();
        if (!b) return toast.error(`Партію "${f.name}" не знайдено`);
        const patch: Record<string, any> = {};
        if (f.count != null) patch.count = Number(f.count);
        if (f.name != null) patch.name = String(f.name);
        const { error } = await supabase.from("queen_batches").update(patch).eq("id", b.id);
        if (error) return toast.error(error.message);
        toast.success("Партію оновлено");
        qc.invalidateQueries({ queryKey: ["queens"] });
        return;
      }
      case "delete_queen_batch": {
        const { data: b } = await supabase.from("queen_batches")
          .select("id").ilike("name", `%${String(f.name ?? "")}%`).maybeSingle();
        if (!b) return toast.error(`Партію "${f.name}" не знайдено`);
        await supabase.from("queen_batches").delete().eq("id", b.id);
        toast.success("Партію видалено");
        qc.invalidateQueries({ queryKey: ["queens"] });
        return;
      }
      case "add_inspection": {
        const hid = await findHive(f.hive_number);
        if (!hid) return toast.error(`Вулик ${f.hive_number} не знайдено`);
        await supabase.from("inspections").insert({
          user_id: user_id!,
          hive_id: hid,
          notes: f.notes ?? null,
          queen_seen: f.queen_seen ?? null,
        });
        toast.success(`Огляд вулика ${f.hive_number} записано`);
        return;
      }
      case "add_feeding": {
        const hid = await findHive(f.hive_number);
        if (!hid) return toast.error(`Вулик ${f.hive_number} не знайдено`);
        await supabase.from("feedings").insert({
          user_id: user_id!,
          hive_id: hid,
          feed_type: f.feed_type ?? null,
          amount: f.amount ?? null,
        });
        toast.success("Годування записано");
        return;
      }
      case "add_treatment": {
        const hid = await findHive(f.hive_number);
        if (!hid) return toast.error(`Вулик ${f.hive_number} не знайдено`);
        await supabase.from("treatments").insert({
          user_id: user_id!,
          hive_id: hid,
          product: f.product ?? null,
          dose: f.dose ?? null,
        });
        toast.success("Обробку записано");
        return;
      }
      case "add_harvest": {
        const hid = await findHive(f.hive_number);
        await supabase.from("harvests").insert({
          user_id: user_id!,
          hive_id: hid,
          honey_kg: f.honey_kg ?? null,
          honey_type: f.honey_type ?? null,
        });
        toast.success("Збір меду записано");
        return;
      }
      case "add_event": {
        await supabase.from("calendar_events").insert({
          user_id: user_id!,
          title: String(f.title ?? "Подія"),
          event_date: f.event_date ?? new Date().toISOString().slice(0, 10),
          description: f.description ?? null,
        });
        toast.success("Подію додано в календар");
        return;
      }
      default:
        toast.info("Команду не розпізнано");
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(start, 100); }}
        className="fixed bottom-6 right-1/2 translate-x-1/2 z-40 w-16 h-16 rounded-full bg-honey text-honey-foreground shadow-xl shadow-honey/40 flex items-center justify-center active:scale-95 transition-all border-4 border-background"
        aria-label="Голосове керування"
      >
        <Mic className="w-7 h-7" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" /> Голосова команда
            </DialogTitle>
            <DialogDescription>
              Скажіть, наприклад: «Відкрий мої вулики», «У вулику 5 матка червить, додав рамку»
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-24 rounded-md border bg-muted/50 p-3 text-sm">
            {transcript || <span className="text-muted-foreground">{listening ? "Слухаю…" : "Натисніть мікрофон і говоріть"}</span>}
          </div>

          {reply && (
            <div className="rounded-md bg-honey/20 border border-honey/40 p-3 text-sm">
              ✅ {reply}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {listening ? (
              <Button variant="outline" onClick={stop}><X className="w-4 h-4 mr-1" /> Стоп</Button>
            ) : (
              <Button variant="outline" onClick={start}><Mic className="w-4 h-4 mr-1" /> Записати</Button>
            )}
            <Button onClick={send} disabled={!transcript || working || listening}>
              {working && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Виконати
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
