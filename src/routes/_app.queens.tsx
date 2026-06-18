import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/queens")({
  component: QueensPage,
});

function addDays(d: string, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
}

function QueensPage() {
  const qc = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ["queens"],
    queryFn: async () => (await supabase.from("queen_batches").select("*").order("grafted_on", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");

  async function add() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("queen_batches").insert({
      user_id: u.user!.id, name, grafted_on: date, count: count ? Number(count) : null,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setName(""); setCount("");
    qc.invalidateQueries({ queryKey: ["queens"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Виведення маток</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Партія</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Нова партія</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Назва</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Партія №1" /></div>
              <div><Label>Дата щеплення</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><Label>Кількість</Label><Input type="number" value={count} onChange={e => setCount(e.target.value)} /></div>
              <Button onClick={add} disabled={!name} className="w-full">Створити</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!batches?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          Створіть першу партію — додаток автоматично обчислить ключові дати.
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map(b => (
            <BatchCard key={b.id} batch={b} onChange={() => qc.invalidateQueries({ queryKey: ["queens"] })} />
          ))}
        </div>
      )}
    </div>
  );
}

function BatchCard({ batch, onChange }: { batch: any; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(batch.name);
  const [date, setDate] = useState(batch.grafted_on);
  const [count, setCount] = useState(batch.count?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("queen_batches").update({
      name, grafted_on: date, count: count ? Number(count) : null,
    }).eq("id", batch.id);
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
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-semibold">{batch.name}</div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={del}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-3">Щеплено: {batch.grafted_on} · {batch.count ?? "?"} шт.</div>
      <ul className="text-sm space-y-1">
        <li>🥚 Запечатування маточників: <b>{addDays(batch.grafted_on, 5)}</b></li>
        <li>👑 Вихід маток: <b>{addDays(batch.grafted_on, 11)}</b></li>
        <li>✈️ Обліт / спарювання: <b>{addDays(batch.grafted_on, 16)}–{addDays(batch.grafted_on, 24)}</b></li>
        <li>🔍 Перевірка засіву: <b>{addDays(batch.grafted_on, 28)}</b></li>
      </ul>

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редагувати партію</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Назва</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Дата щеплення</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div>
              <Label>Кількість (живих)</Label>
              <Input type="number" value={count} onChange={e => setCount(e.target.value)} />
              <div className="text-xs text-muted-foreground mt-1">Оновіть, якщо частина маточників не вийшла.</div>
            </div>
            <Button onClick={save} disabled={!name || saving} className="w-full">Зберегти</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
