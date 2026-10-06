import { createFileRoute, Link, useMatchRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  METHOD_LABEL,
  NEXT_ACTION_LABEL,
  statusLabel,
  nextActionOf,
  shouldArchiveQueenBatch,
  todayLocal,
  type QueenMethod,
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
  const matchRoute = useMatchRoute();
  const qc = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ["queens"],
    queryFn: async () => {
      const { data } = await supabase
        .from("queen_batches")
        .select("*, queen_batch_steps(done_on)")
        .is("archived_at", null)
        .order("grafted_on", { ascending: false });
      const rows = data ?? [];
      const expired = rows.filter((batch: any) => shouldArchiveQueenBatch(batch, batch.queen_batch_steps));
      if (expired.length) {
        const archivedAt = new Date().toISOString();
        await Promise.all(
          expired.map((batch: any) =>
            supabase.from("queen_batches").update({ archived_at: archivedAt }).eq("id", batch.id),
          ),
        );
      }
      return rows.filter((batch: any) => !expired.some((item: any) => item.id === batch.id));
    },
  });
  if (matchRoute({ to: "/queens/new" })) return null;

  return (
    <div className="space-y-8 lg:relative lg:left-1/2 lg:w-[calc(100vw-2rem)] lg:max-w-[1380px] lg:-translate-x-1/2">
      <section>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Виведення маток</p>
            <h1 className="text-2xl font-bold">Виведення маток</h1>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/queens/new">Нова партія</Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Створені партії</p>
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
      ? `${METHOD_LABEL[method]} — очікує вибору`
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
          {nextAction === "undecided" && batch.next_action_planned_on && batch.next_action_planned_on <= todayLocal() ? (
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
