import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  METHOD_LABEL,
  NEXT_ACTION_LABEL,
  buildStepDefs,
  plannedDates,
  statusLabel,
  addDays,
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

export async function createStepsFor(batch: any) {
  const method: QueenMethod = (batch.method ?? "comb") as QueenMethod;
  const nextAction: QueenNextAction = (batch.next_action ?? "cells") as QueenNextAction;
  const defs = buildStepDefs(method, nextAction);
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

function QueensPage() {
  const qc = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ["queens"],
    queryFn: async () =>
      (await supabase.from("queen_batches").select("*").order("grafted_on", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<QueenMethod>("comb");
  const [nextAction, setNextAction] = useState<QueenNextAction>("cells");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("queen_batches")
      .insert({
        user_id: u.user!.id,
        name,
        grafted_on: date,
        method,
        next_action: nextAction,
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
    setOpen(false);
    setName("");
    setCount("");
    qc.invalidateQueries({ queryKey: ["queens"] });
    toast.success("Технічну карту сформовано");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Виведення маток</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Партія
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Нова партія</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Назва партії</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Партія №1" />
              </div>
              <div>
                <Label className="mb-2 block">Спосіб отримання личинок</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["comb", "transfer"] as QueenMethod[]).map((m) => (
                    <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                      {METHOD_LABEL[m]}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {method === "comb"
                    ? "Матка відкладає яйця у сот, личинки — на 4-й день, контроль прийому — на 5-й."
                    : "Перенос личинок у мисочки в день 0, контроль прийому — на 1-й день."}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Наступна дія</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["cells", "protectors"] as QueenNextAction[]).map((a) => (
                    <Button key={a} type="button" variant={nextAction === a ? "default" : "outline"} onClick={() => setNextAction(a)}>
                      {NEXT_ACTION_LABEL[a]}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Виконується на {method === "comb" ? "14-й" : "10-й"} день.
                </div>
              </div>
              <div>
                <Label>Дата початку</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Кількість яєць / личинок / мисочок</Label>
                <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <Button onClick={add} disabled={!name || busy} className="w-full">
                Створити технічну карту
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!batches?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          Створіть першу партію — додаток сформує технічну карту з датами, порадами та застереженнями.
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((b: any) => (
            <BatchRow key={b.id} batch={b} onChange={() => qc.invalidateQueries({ queryKey: ["queens"] })} />
          ))}
        </div>
      )}
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

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("queen_batches")
      .update({
        name,
        grafted_on: date,
        count: count ? Number(count) : null,
        larvae_count: count ? Number(count) : null,
      })
      .eq("id", batch.id);
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
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to="/queens/$batchId" params={{ batchId: batch.id }} className="min-w-0 flex-1">
          <div className="font-semibold flex items-center gap-1">
            <span className="truncate">{batch.name}</span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {METHOD_LABEL[method]} · старт {batch.grafted_on} · {batch.larvae_count ?? batch.count ?? "?"} шт.
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="secondary">{statusLabel(batch.status)}</Badge>
            {batch.next_action ? (
              <Badge variant="outline">{NEXT_ACTION_LABEL[batch.next_action as QueenNextAction]}</Badge>
            ) : null}
            {batch.next_action_planned_on ? <Badge variant="outline">до {batch.next_action_planned_on}</Badge> : null}
          </div>
        </Link>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={del}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати партію</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Назва</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Дата початку</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Кількість (яєць / личинок / мисочок)</Label>
              <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} />
              <div className="text-xs text-muted-foreground mt-1">
                Фактично прийняті личинки вводяться окремо, у технічній карті партії.
              </div>
            </div>
            <Button onClick={save} disabled={!name || saving} className="w-full">
              Зберегти
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
