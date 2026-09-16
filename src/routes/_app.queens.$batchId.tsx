import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, AlertTriangle, CalendarDays, Check, ChevronDown, Lightbulb, History, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  METHOD_LABEL,
  NEXT_ACTION_LABEL,
  QUEEN_STATUSES,
  buildStepDefs,
  dayLabel,
  plannedDates,
  statusLabel,
  suggestedStatus,
  addDays,
  type QueenMethod,
  type QueenNextAction,
  type StepDef,
} from "@/lib/queens";
import { createStepsFor } from "./_app.queens.index";

export const Route = createFileRoute("/_app/queens/$batchId")({
  head: () => ({
    meta: [
      { title: "Технічна карта партії — Пасічник" },
      { name: "description", content: "Покрокова технічна карта партії виведення маток: планові й фактичні дати, поради та застереження." },
      { property: "og:title", content: "Технічна карта партії — Пасічник" },
      { property: "og:description", content: "Покрокова технічна карта партії виведення маток." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BatchPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const SCENARIO_STYLE = {
  "comb-cells": { bar: "bg-chart-2", soft: "bg-chart-2/10", border: "border-chart-2/40" },
  "comb-protectors": { bar: "bg-chart-1", soft: "bg-chart-1/10", border: "border-chart-1/40" },
  "transfer-cells": { bar: "bg-chart-3", soft: "bg-chart-3/10", border: "border-chart-3/40" },
  "transfer-protectors": { bar: "bg-chart-4", soft: "bg-chart-4/10", border: "border-chart-4/40" },
} as const;

function BatchPage() {
  const { batchId } = Route.useParams();
  const qc = useQueryClient();

  const { data: batch } = useQuery({
    queryKey: ["queen-batch", batchId],
    queryFn: async () =>
      (await supabase.from("queen_batches").select("*").eq("id", batchId).maybeSingle()).data as any,
  });

  const { data: steps } = useQuery({
    queryKey: ["queen-steps", batchId],
    enabled: !!batch,
    queryFn: async () =>
      (await supabase.from("queen_batch_steps").select("*").eq("batch_id", batchId).order("sort_order")).data ?? [],
  });

  const { data: events } = useQuery({
    queryKey: ["queen-events", batchId],
    queryFn: async () =>
      (await supabase
        .from("queen_batch_events")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false })).data ?? [],
  });

  // Старі партії без кроків — формуємо технічну карту при першому відкритті.
  useEffect(() => {
    if (!batch || !steps || steps.length) return;
    (async () => {
      await createStepsFor(batch);
      qc.invalidateQueries({ queryKey: ["queen-steps", batchId] });
    })();
  }, [batch, steps, batchId, qc]);

  if (!batch) {
    return <div className="text-muted-foreground">Завантаження…</div>;
  }

  const method: QueenMethod = (batch.method ?? "comb") as QueenMethod;
  const nextAction: QueenNextAction = (batch.next_action ?? "cells") as QueenNextAction;
  const defs = buildStepDefs(method, nextAction);
  const suggested = suggestedStatus(method, nextAction, batch.grafted_on);
  const scenario = SCENARIO_STYLE[`${method}-${nextAction}`];
  const completedCount = steps?.filter((step: any) => step.done).length ?? 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["queen-batch", batchId] });
    qc.invalidateQueries({ queryKey: ["queen-steps", batchId] });
    qc.invalidateQueries({ queryKey: ["queen-events", batchId] });
    qc.invalidateQueries({ queryKey: ["queens"] });
  };

  async function logEvent(field: string, oldValue: any, newValue: any) {
    await supabase.from("queen_batch_events").insert({
      batch_id: batchId,
      user_id: batch.user_id,
      field,
      old_value: oldValue == null ? null : String(oldValue),
      new_value: newValue == null ? null : String(newValue),
    });
  }

  async function patchBatch(patch: any, logFields: string[] = []) {
    for (const f of logFields) {
      if (batch[f] !== patch[f]) await logEvent(f, batch[f], patch[f]);
    }
    const { error } = await supabase.from("queen_batches").update(patch).eq("id", batchId);
    if (error) return toast.error(error.message);
    toast.success("Збережено");
    refresh();
  }

  async function recalcPlanned() {
    const dates = plannedDates(method, batch.grafted_on);
    await supabase.from("queen_batches").update(dates).eq("id", batchId);
    for (const d of defs) {
      await supabase
        .from("queen_batch_steps")
        .update({ planned_on: addDays(batch.grafted_on, d.dayFrom) })
        .eq("batch_id", batchId)
        .eq("step_key", d.key);
    }
    toast.success("Планові дати перераховано (фактичні не змінено)");
    refresh();
  }

  return (
    <div className="space-y-5 lg:relative lg:left-1/2 lg:w-[calc(100vw-2rem)] lg:max-w-5xl lg:-translate-x-1/2">
      <div className="flex items-center gap-2">
        <Link to="/queens">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{batch.name}</h1>
          <div className="text-xs text-muted-foreground">
            {METHOD_LABEL[method]} → {NEXT_ACTION_LABEL[nextAction]} · старт {batch.grafted_on}
          </div>
        </div>
      </div>

      <Card className={`overflow-hidden p-0 ${scenario.border}`}>
        <div className={`h-2 ${scenario.bar}`} />
        <div className={`border-b p-4 ${scenario.soft}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Технічна карта</p>
              <h2 className="mt-1 font-bold">{METHOD_LABEL[method]} → {NEXT_ACTION_LABEL[nextAction]}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Початок {batch.grafted_on} · виконано {completedCount} з {defs.length} етапів</p>
            </div>
            <Badge variant="secondary">{statusLabel(batch.status)}</Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/70">
            <div className={`h-full rounded-full ${scenario.bar}`} style={{ width: `${defs.length ? (completedCount / defs.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-xs">Статус партії</Label>
            <div className="mt-1">
              <Select value={batch.status ?? "planned"} onValueChange={(v) => patchBatch({ status: v }, ["status"])}>
              <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUEEN_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {batch.status !== suggested ? (
          <div className="text-xs text-muted-foreground flex items-start gap-1">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              За календарем зараз: «{statusLabel(suggested)}».{" "}
               <button className="font-medium text-primary underline" onClick={() => patchBatch({ status: suggested }, ["status"])}>
                Застосувати
              </button>
            </span>
          </div>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Дані та результати партії
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PlanField label="Дата початку" value={batch.grafted_on} onSave={(v) => patchBatch({ grafted_on: v })} />
          {method === "comb" ? (
            <PlanField label="Відкладання яєць" value={batch.eggs_laid_on} onSave={(v) => patchBatch({ eggs_laid_on: v })} />
          ) : null}
          <PlanField label="Одноденні личинки" value={batch.larvae_hatched_on} onSave={(v) => patchBatch({ larvae_hatched_on: v })} />
          <PlanField label="Постановка у стартер" value={batch.starter_on} onSave={(v) => patchBatch({ starter_on: v })} />
          <PlanField label="Контроль прийому" value={batch.acceptance_check_on} onSave={(v) => patchBatch({ acceptance_check_on: v })} />
          <PlanField label="Перестановка у виховательку" value={batch.nurse_on} onSave={(v) => patchBatch({ nurse_on: v })} />
          <PlanField label="Запечатування (розрахунок)" value={batch.sealed_on} onSave={(v) => patchBatch({ sealed_on: v })} />
          <PlanField
            label={`${NEXT_ACTION_LABEL[nextAction]} (план)`}
            value={batch.next_action_planned_on}
            onSave={(v) => patchBatch({ next_action_planned_on: v })}
          />
          <PlanField
            label={`${NEXT_ACTION_LABEL[nextAction]} (факт)`}
            value={batch.next_action_done_on}
            onSave={(v) => patchBatch({ next_action_done_on: v }, ["next_action_done_on"])}
          />
          <PlanField label="Вихід маток (факт)" value={batch.emerged_on} onSave={(v) => patchBatch({ emerged_on: v }, ["emerged_on"])} />
        </div>

        <div className="text-xs text-muted-foreground">
          Контроль прийому і перестановка у виховательку — один і той самий день ({method === "comb" ? "5-й" : "1-й"} день).
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumField label="Кількість личинок / мисочок" value={batch.larvae_count ?? batch.count} onSave={(v) => patchBatch({ larvae_count: v, count: v }, ["larvae_count"])} />
          <NumField label="Фактично прийнято личинок" value={batch.accepted_count} onSave={(v) => patchBatch({ accepted_count: v }, ["accepted_count"])} />
          <NumField label="Відібрано маточників" value={batch.cells_harvested} onSave={(v) => patchBatch({ cells_harvested: v }, ["cells_harvested"])} />
          <NumField label="Отримано неплідних маток" value={batch.virgin_queens_count} onSave={(v) => patchBatch({ virgin_queens_count: v }, ["virgin_queens_count"])} />
        </div>

        <div>
          <Label className="text-xs">Примітки партії</Label>
          <NoteField value={batch.notes} onSave={(v) => patchBatch({ notes: v })} />
        </div>

        <Button variant="outline" size="sm" onClick={recalcPlanned}>
          Перерахувати планові дати від дати початку
        </Button>
          </CollapsibleContent>
        </Collapsible>
        </div>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Послідовність робіт</p>
            <h2 className="text-lg font-bold">Етапи партії</h2>
          </div>
          <Badge variant="outline"><CalendarDays className="mr-1 h-3.5 w-3.5" />{defs.length} етапів</Badge>
        </div>
        <div className="relative space-y-0 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-border sm:before:left-[21px]">
        {defs.map((def, i) => {
          const row = steps?.find((s: any) => s.step_key === def.key);
          return <StepCard key={def.key} n={i + 1} def={def} row={row} batch={batch} accent={scenario.bar} onChange={refresh} />;
        })}
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <History className="w-4 h-4 mr-1" />
            Історія змін ({events?.length ?? 0})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="p-3 mt-2 space-y-2">
            {!events?.length ? (
              <div className="text-xs text-muted-foreground">Змін ще не було.</div>
            ) : (
              events.map((e: any) => (
                <div key={e.id} className="text-xs">
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("uk-UA")}</span>{" "}
                  · {FIELD_LABEL[e.field] ?? e.field}: <b>{e.old_value ?? "—"}</b> → <b>{e.new_value ?? "—"}</b>
                </div>
              ))
            )}
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = {
  accepted_count: "Фактично прийнято личинок",
  larvae_count: "Кількість личинок / мисочок",
  cells_harvested: "Відібрано маточників",
  virgin_queens_count: "Отримано неплідних маток",
  next_action_done_on: "Фактична дата виконання",
  emerged_on: "Дата виходу маток",
  status: "Статус",
};

function StepCard({
  n,
  def,
  row,
  batch,
  accent,
  onChange,
}: {
  n: number;
  def: StepDef;
  row: any;
  batch: any;
  accent: string;
  onChange: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(p: any) {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("queen_batch_steps").update(p).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    onChange();
  }

  const planned = row?.planned_on ?? addDays(batch.grafted_on, def.dayFrom);
  const done = !!row?.done;
  const isPast = planned < today();
  const isToday = planned === today();

  return (
    <div className="relative flex gap-3 pb-4 sm:gap-4">
        <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background text-sm font-bold sm:h-11 sm:w-11 ${done ? `${accent} text-primary-foreground` : isPast || isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {done ? <Check className="h-4 w-4" /> : n}
        </div>
        <Card className={`min-w-0 flex-1 p-3 sm:p-4 ${def.critical ? "border-destructive/60" : isToday ? "border-primary/60" : ""}`}>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="font-semibold leading-snug">{n}. {def.title}</div>
            <Badge variant={done ? "default" : isPast ? "destructive" : isToday ? "secondary" : "outline"} className="w-fit shrink-0">
              {done ? "Виконано" : isPast ? "Прострочено" : isToday ? "Сьогодні" : "За планом"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge variant="outline">{dayLabel(def)}</Badge>
            <Badge variant="secondary"><CalendarDays className="mr-1 h-3 w-3" />{planned}</Badge>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{def.advice}</span>
          </div>

          {def.warning ? (
            def.critical ? (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{def.warning}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-2 rounded-md border bg-secondary/50 p-2 text-xs text-foreground">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{def.warning}</span>
              </div>
            )
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Планова дата</Label>
              <Input
                type="date"
                value={row?.planned_on ?? ""}
                disabled={!row || saving}
                onChange={(e) => patch({ planned_on: e.target.value || null })}
              />
            </div>
            <div>
              <Label className="text-xs">Фактична дата</Label>
              <Input
                type="date"
                value={row?.done_on ?? ""}
                disabled={!row || saving}
                onChange={(e) => patch({ done_on: e.target.value || null })}
              />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-md border p-2 text-sm font-medium">
            <Checkbox
              checked={done}
              disabled={!row || saving}
              onCheckedChange={(v) => patch({ done: !!v })}
            />
            Відмітити виконання
          </label>

          <div className="mt-3">
            <Label className="text-xs">Примітка</Label>
            <NoteField value={row?.actual_note} onSave={(v) => patch({ actual_note: v })} />
          </div>

          {def.acceptance ? (
            <div className="mt-3 rounded-md bg-secondary p-2 text-xs">
              Фактично прийнято личинок вводиться у блоці даних партії вище — значення можна коригувати пізніше, зміни
              зберігаються в історії.
            </div>
          ) : null}
        </Card>
    </div>
  );
}

function PlanField({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string | null) => void }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="date"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if ((value ?? "") !== v) onSave(v || null);
        }}
      />
    </div>
  );
}

function NumField({ label, value, onSave }: { label: string; value: number | null; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const next = v === "" ? null : Number(v);
          if ((value ?? null) !== next) onSave(next);
        }}
      />
    </div>
  );
}

function NoteField({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <Textarea
      rows={2}
      value={v}
      placeholder="Примітка…"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if ((value ?? "") !== v) onSave(v || null);
      }}
    />
  );
}
