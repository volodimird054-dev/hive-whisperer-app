import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Pencil, Plus, CalendarClock } from "lucide-react";
import { HiveQrButton } from "@/components/hive-qr";
import { VoiceTextarea } from "@/components/voice-textarea";

const AGGRESSION_OPTIONS = [
  { v: "very_calm", l: "Дуже спокійна" },
  { v: "calm", l: "Спокійна" },
  { v: "medium", l: "Середня" },
  { v: "aggressive", l: "Агресивна" },
  { v: "very_aggressive", l: "Дуже агресивна" },
];
const SWARMING_OPTIONS = [
  { v: "none", l: "Ознак немає" },
  { v: "cups_few", l: "Поодинокі мисочки" },
  { v: "cups_many", l: "Багато мисочок" },
  { v: "queen_cells", l: "Закладені маточники" },
  { v: "swarm_state", l: "Ройовий стан" },
];

const QUEEN_OPTIONS = [
  { v: "present", l: "Є" },
  { v: "absent", l: "Немає" },
  { v: "unknown", l: "Не перевірено" },
];
const BROOD_OPTIONS = [
  { v: "none", l: "Без розплоду" },
  { v: "weak", l: "1–2 рамки (слабкий)" },
  { v: "medium", l: "3–5 рамок (середній)" },
  { v: "strong", l: "6+ рамок (сильний)" },
];
const HONEY_OPTIONS = [
  { v: "none", l: "0" },
  { v: "low", l: "1–3 рамки" },
  { v: "medium", l: "4–6 рамок" },
  { v: "high", l: "7+ рамок" },
];
const WORKS_OPTIONS = [
  { v: "corpus_on", l: "Поставлено корпус" },
  { v: "corpus_off", l: "Знято корпус" },
  { v: "super_on", l: "Поставлено магазин" },
  { v: "honey_out", l: "Відкачано мед" },
  { v: "feeding", l: "Підгодівля" },
  { v: "treatment", l: "Лікування" },
  { v: "other", l: "Інше" },
];

function labelFor(list: { v: string; l: string }[], v: string | null | undefined) {
  if (!v) return null;
  return list.find((o) => o.v === v)?.l ?? v;
}

function InspectionForm({
  hiveId,
  onSaved,
  onCancel,
}: {
  hiveId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [queen, setQueen] = useState("");
  const [brood, setBrood] = useState("");
  const [honey, setHoney] = useState("");
  const [aggression, setAggression] = useState("");
  const [swarming, setSwarming] = useState("");
  const [works, setWorks] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleWork(v: string) {
    setWorks((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("inspections") as any).insert({
      user_id: u.user!.id,
      hive_id: hiveId,
      queen_status: queen || null,
      brood_level: brood || null,
      honey_level: honey || null,
      aggression: aggression || null,
      swarming: swarming || null,
      works: works.length ? works : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Огляд збережено");
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Матка</Label>
        <RadioGroup value={queen} onValueChange={setQueen} className="grid grid-cols-1 gap-1">
          {QUEEN_OPTIONS.map((o) => (
            <label key={o.v} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={o.v} id={`q-${o.v}`} />
              <span>{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="mb-2 block">Розплід</Label>
        <RadioGroup value={brood} onValueChange={setBrood} className="grid grid-cols-1 gap-1">
          {BROOD_OPTIONS.map((o) => (
            <label key={o.v} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={o.v} id={`b-${o.v}`} />
              <span>{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="mb-2 block">Мед</Label>
        <RadioGroup value={honey} onValueChange={setHoney} className="grid grid-cols-1 gap-1">
          {HONEY_OPTIONS.map((o) => (
            <label key={o.v} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={o.v} id={`h-${o.v}`} />
              <span>{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="mb-2 block">Роботи</Label>
        <div className="grid grid-cols-1 gap-1">
          {WORKS_OPTIONS.map((o) => (
            <label key={o.v} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={works.includes(o.v)} onCheckedChange={() => toggleWork(o.v)} />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Примітка</Label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Текст або скористайтеся голосовою кнопкою." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel}>Скасувати</Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
        </Button>
      </div>
    </div>
  );
}

function InspectionRow({ i }: { i: any }) {
  const who = i.author?.display_name || i.author?.email || "—";
  const summary = [
    labelFor(QUEEN_OPTIONS, i.queen_status) && `Матка: ${labelFor(QUEEN_OPTIONS, i.queen_status)}`,
    labelFor(BROOD_OPTIONS, i.brood_level) && `Розплід: ${labelFor(BROOD_OPTIONS, i.brood_level)}`,
    labelFor(HONEY_OPTIONS, i.honey_level) && `Мед: ${labelFor(HONEY_OPTIONS, i.honey_level)}`,
  ].filter(Boolean).join(" · ");
  const worksList: string[] = Array.isArray(i.works) ? i.works.map((w: string) => labelFor(WORKS_OPTIONS, w)!).filter(Boolean) : [];
  return (
    <Card className="p-3 text-sm">
      <div className="text-xs text-muted-foreground">
        {new Date(i.inspected_at).toLocaleString("uk-UA")} · {who}
      </div>
      {summary && <div className="mt-1">{summary}</div>}
      {!!worksList.length && <div className="text-xs mt-1">Роботи: {worksList.join(", ")}</div>}
      {i.notes && <div className="mt-1 italic">{i.notes}</div>}
    </Card>
  );
}

export function HiveCard({
  hive,
  onChange,
  forceOpen,
  kind = "hive",
}: {
  hive: any;
  onChange: () => void;
  forceOpen?: boolean;
  kind?: "hive" | "nucleus";
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const [edit, setEdit] = useState(false);
  const [newInspection, setNewInspection] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [number, setNumber] = useState(hive.number);
  const [breed, setBreed] = useState(hive.breed ?? "");
  const [queenYear, setQueenYear] = useState(hive.queen_year?.toString() ?? "");
  const [notes, setNotes] = useState(hive.notes ?? "");
  const [saving, setSaving] = useState(false);

  const labelSingular = kind === "nucleus" ? "Нуклеус" : "Вулик";

  const { data: inspections, refetch } = useQuery({
    queryKey: ["inspections", hive.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspections")
        .select("*")
        .eq("hive_id", hive.id)
        .order("inspected_at", { ascending: false })
        .limit(200);
      const list = data ?? [];
      const ids = Array.from(new Set(list.map((i: any) => i.user_id).filter(Boolean)));
      const authors: Record<string, { display_name: string | null; email: string | null }> = {};
      if (ids.length) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", ids as any);
        (prof ?? []).forEach((p: any) => {
          authors[p.id] = { display_name: p.display_name, email: p.email };
        });
      }
      return list.map((i: any) => ({ ...i, author: authors[i.user_id] }));
    },
    enabled: open,
  });

  const lastInspection = inspections?.[0];
  const visibleInspections = showAll ? inspections : inspections?.slice(0, 5);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("hives")
      .update({
        number,
        breed: breed || null,
        queen_year: queenYear ? Number(queenYear) : null,
        notes: notes || null,
      })
      .eq("id", hive.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Збережено");
    setEdit(false);
    onChange();
  }

  async function del() {
    if (!confirm(`Видалити ${labelSingular.toLowerCase()} ${hive.number}?`)) return;
    const { error } = await supabase.from("hives").delete().eq("id", hive.id);
    if (error) return toast.error(error.message);
    onChange();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/40">
          <div className="w-12 h-12 rounded-xl bg-honey/30 flex items-center justify-center font-bold text-lg">
            {hive.number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{labelSingular} №{hive.number}</div>
            <div className="text-xs text-muted-foreground truncate">
              {hive.breed || "—"}{hive.queen_year ? ` · матка ${hive.queen_year}` : ""}
            </div>
          </div>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{labelSingular} №{hive.number}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="text-sm space-y-1">
            <div><b>Порода:</b> {hive.breed || "—"}</div>
            <div><b>Рік матки:</b> {hive.queen_year || "—"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Створено: {hive.created_at ? new Date(hive.created_at).toLocaleDateString("uk-UA") : "—"}
              {lastInspection && (
                <> · Останній огляд: {new Date(lastInspection.inspected_at).toLocaleDateString("uk-UA")}</>
              )}
            </div>
            {hive.notes && (
              <div className="mt-2"><b>Нотатки:</b> {hive.notes}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Редагувати
            </Button>
            <Button onClick={() => setNewInspection(true)}>
              <Plus className="w-4 h-4 mr-2" /> Новий огляд
            </Button>
          </div>

          <HiveQrButton hiveId={hive.id} number={hive.number} label={labelSingular} />

          <div>
            <h3 className="font-semibold mb-2">Журнал оглядів</h3>
            {!inspections?.length ? (
              <div className="text-sm text-muted-foreground">
                Поки немає. Натисніть «Новий огляд» або скажіть голосом.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleInspections?.map((i: any) => <InspectionRow key={i.id} i={i} />)}
                {inspections.length > 5 && (
                  <Button variant="ghost" className="w-full" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Згорнути" : `Показати всю історію (${inspections.length})`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Button variant="destructive" onClick={del} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" /> Видалити {labelSingular.toLowerCase()}
          </Button>
        </div>

        <Dialog open={edit} onOpenChange={setEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редагувати {labelSingular.toLowerCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Номер</Label><Input value={number} onChange={e => setNumber(e.target.value)} /></div>
              <div><Label>Порода</Label><Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Карпатка, Бакфаст…" /></div>
              <div><Label>Рік матки</Label><Input type="number" value={queenYear} onChange={e => setQueenYear(e.target.value)} /></div>
              <div><Label>Нотатки</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button onClick={save} disabled={!number || saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={newInspection} onOpenChange={setNewInspection}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новий огляд · {labelSingular} №{hive.number}</DialogTitle>
            </DialogHeader>
            <InspectionForm
              hiveId={hive.id}
              onSaved={() => { setNewInspection(false); refetch(); }}
              onCancel={() => setNewInspection(false)}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
