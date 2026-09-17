import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  METHOD_LABEL,
  NEXT_ACTION_LABEL,
  buildStepDefs,
  plannedDates,
  statusLabel,
  addDays,
  stepDateLabel,
  type QueenMethod,
  type QueenNextAction,
} from "@/lib/queens";

export const Route = createFileRoute("/_app/queens/")({
  head: () => ({
    meta: [
      { title: "Виведення маток — Пасічник" },
      { name: "description", content: "Технічні карти партій виведення маток: сот або перенос, контроль прийому, відбір маточників." },
      { property: "og:title", content: "Виведення маток — Пасічник" },
      { property: "og:description", content: "Технічні карти партій виведення маток для пасічника." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QueensPage,
});

export function nextActionOf(batch: any): QueenNextAction {
  const v = batch?.next_action;
  return v === "cells" || v === "protectors" ? v : "undecided";
}

export async function createStepsFor(batch: any) {
  const method: QueenMethod = (batch.method ?? "comb") as QueenMethod;
  const defs = buildStepDefs(method, nextActionOf(batch));
  const rows = defs.map((d, i) => ({
    batch_id: batch.id,
    user_id: batch.user_id,
    step_key: d.key,
    day_offset: d.dayFrom,
    planned_on: addDays(batch.grafted_on, d.dayFrom),
    sort_order: i,
  }));
  await supabase.from("queen_batch_steps").upsert(rows, { onConflict: "batch_id,step_key" });
}

type MethodCard = {
  number: number;
  method: QueenMethod;
  accent: string;
  soft: string;
  border: string;
  title: string;
  result: string;
};

const METHODS: MethodCard[] = [
  {
    number: 1,
    method: "comb",
    accent: "bg-chart-2",
    soft: "bg-chart-2/10",
    border: "border-chart-2/50",
    title: "Сот",
    result: "На 14-й день додаток запитає: забрати маточники або вдягнути бігудішки.",
  },
  {
    number: 2,
    method: "transfer",
    accent: "bg-chart-3",
    soft: "bg-chart-3/10",
    border: "border-chart-3/50",
    title: "Перенос",
    result: "На 10-й день додаток запитає: забрати маточники або вдягнути бігудішки.",
  },
];

export const METHOD_STYLE: Record<QueenMethod, MethodCard> = {
  comb: METHODS[0],
  transfer: METHODS[1],
};

function QueensPage() {
  const qc = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ["queens"],
    queryFn: async () =>
      (await supabase.from("queen_batches").select("*").order("grafted_on", { ascending: false })).data ?? [],
  });
  const [name, setName] = useState("");
  const [method, setMethod] = useState<QueenMethod>("comb");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return toast.error("Потрібно увійти в обліковий запис");
    }
    const { data, error } = await supabase
      .from("queen_batches")
      .insert({
        user_id: u.user.id,
        name,
        grafted_on: date,
        method,
        next_action: null,
        count: count ? Number(count) : null,
        larvae_count: count ? Number(count) : null,
        status: "planned",
        ...plannedDates(method, date),
      })
      .select()
      .single();
    if (error || !data) {
      setBusy(false);
      return toast.error(error?.message ?? "Не вдалося створити партію");
    }
    await createStepsFor(data);
    setBusy(false);
    setName("");
    setCount("");
    qc.invalidateQueries({ queryKey: ["queens"] });
    toast.success("Технічну карту сформовано");
  }

  return (
    <div className="space-y-8 lg:relative lg:left-1/2 lg:w-[calc(100vw-2rem)] lg:max-w-[1380px] lg:-translate-x-1/2">
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Нова партія</p>
            <h1 className="text-2xl font-bold">Виведення маток</h1>
          </div>
          <Badge variant="secondary">2 способи</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="h-fit p-4 lg:sticky lg:top-20">
            <div className="space-y-4">
              <div>
                <Label htmlFor="batch-name">Назва партії</Label>
                <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Партія №1" />
              </div>
              <div>
                <Label className="mb-2 block">Спосіб отримання личинок</Label>
                <div className="grid gap-2">
                  {(["comb", "transfer"] as QueenMethod[]).map((value) => (
                    <Button key={value} type="button" variant={method === value ? "default" : "outline"} className="h-auto justify-start py-3" onClick={() => setMethod(value)}>
                      {method === value ? <Check className="mr-2 h-4 w-4" /> : <span className="mr-2 h-4 w-4 rounded-full border" />}
                      <span className="text-left">
                        <span className="block">{METHOD_LABEL[value]}</span>
                        <span className="block text-xs font-normal opacity-75">{value === "comb" ? "Матка сама відкладає яйця" : "Пасічник переносить личинки"}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="batch-date">Дата початку партії</Label>
                <Input id="batch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="batch-count">Кількість яєць / личинок / мисочок</Label>
                <Input id="batch-count" type="number" min="0" value={count} onChange={(e) => setCount(e.target.value)} placeholder="20" />
              </div>
              <p className="rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
                Що робити з маточниками — забрати чи вдягнути бігудішки — оберете у технічній карті на день дії.
              </p>
              <Button onClick={add} disabled={!name.trim() || busy} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Створити партію
              </Button>
            </div>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Два способи виведення маток</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map((card) => (
                <MethodCardView key={card.number} card={card} start={date} selected={method === card.method} onSelect={() => setMethod(card.method)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Створені технічні карти</p>
            <h2 className="text-xl font-bold">Мої партії</h2>
          </div>
          <Badge variant="outline">{batches?.length ?? 0}</Badge>
        </div>
        {!batches?.length ? (
          <Card className="p-8 text-center text-muted-foreground">Створіть першу партію — технічна карта з датами, порадами та застереженнями сформується автоматично.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {batches.map((batch: any) => <BatchRow key={batch.id} batch={batch} onChange={() => qc.invalidateQueries({ queryKey: ["queens"] })} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function MethodCardView({ card, start, selected, onSelect }: { card: MethodCard; start: string; selected: boolean; onSelect: () => void }) {
  const defs = buildStepDefs(card.method, "undecided");
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`min-w-0 rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-md ${selected ? `${card.border} ring-2 ring-primary` : "border-border"}`}>
      <div className="mb-3 flex items-start gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${card.accent}`}>{card.number}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-snug">{card.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">{METHOD_LABEL[card.method]}</Badge>
          </div>
        </div>
      </div>
      <div className={`mb-3 rounded-md p-2 ${card.soft}`}>
        <p className="text-xs font-semibold">План робіт із датами</p>
        <ol className="mt-2 space-y-1.5">
          {defs.map((step, index) => (
            <li key={step.key} className="flex gap-2 text-[11px] leading-snug">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-primary-foreground ${card.accent}`}>{index + 1}</span>
              <span>
                {step.title}
                <span className="block text-[10px] text-muted-foreground">{stepDateLabel(step, start)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-start gap-2 border-t pt-2 text-[11px] text-muted-foreground">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span><strong className="text-foreground">Далі:</strong> {card.result}</span>
      </div>
    </button>
  );
}

function BatchRow({ batch, onChange }: { batch: any; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(batch.name);
  const [date, setDate] = useState(batch.grafted_on);
  const [count, setCount] = useState((batch.larvae_count ?? batch.count)?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const method: QueenMethod = (batch.method ?? "comb") as QueenMethod;
  const nextAction = nextActionOf(batch);
  const card = METHOD_STYLE[method] ?? METHODS[0];
  const subtitle =
    nextAction === "undecided"
      ? `${METHOD_LABEL[method]} — дію оберете на день дії`
      : `${METHOD_LABEL[method]} → ${NEXT_ACTION_LABEL[nextAction]}`;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("queen_batches").update({ name, grafted_on: date, count: count ? Number(count) : null, larvae_count: count ? Number(count) : null }).eq("id", batch.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Збережено");
    setEdit(false);
    onChange();
  }

  async function del() {
    if (!confirm(`Видалити партію "${batch.name}"?`)) return;
    const { error } = await supabase.from("queen_batches").delete().eq("id", batch.id);
    if (error) return toast.error(error.message);
    toast.success("Видалено");
    onChange();
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className={`h-1.5 ${card.accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to="/queens/$batchId" params={{ batchId: batch.id }} className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold"><span className="truncate">{batch.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></div>
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          </Link>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(true)} aria-label="Редагувати партію"><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={del} aria-label="Видалити партію"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted p-2"><span className="block text-muted-foreground">Початок</span><span className="font-medium">{batch.grafted_on}</span></div>
          <div className="rounded-md bg-muted p-2"><span className="block text-muted-foreground">Кількість</span><span className="font-medium">{batch.larvae_count ?? batch.count ?? "—"} шт.</span></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="secondary">{statusLabel(batch.status)}</Badge>
          {batch.next_action_planned_on ? <Badge variant="outline"><CalendarDays className="mr-1 h-3 w-3" />до {batch.next_action_planned_on}</Badge> : null}
          {nextAction === "undecided" && batch.next_action_planned_on && batch.next_action_planned_on <= new Date().toISOString().slice(0, 10) ? (
            <Badge variant="destructive">Готово до вибору дії</Badge>
          ) : null}
        </div>
        <Link to="/queens/$batchId" params={{ batchId: batch.id }} className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium">Відкрити технічну карту<ArrowRight className="h-4 w-4" /></Link>
      </div>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редагувати партію</DialogTitle><DialogDescription>Змініть основні дані партії. Фактичні результати редагуються у технічній карті.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Назва</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Дата початку</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Кількість (яєць / личинок / мисочок)</Label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} /></div>
            <Button onClick={save} disabled={!name.trim() || saving} className="w-full">Зберегти</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
