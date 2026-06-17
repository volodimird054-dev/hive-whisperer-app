import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus } from "lucide-react";
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
            <Card key={b.id} className="p-4">
              <div className="font-semibold">{b.name}</div>
              <div className="text-xs text-muted-foreground mb-3">Щеплено: {b.grafted_on} · {b.count ?? "?"} шт.</div>
              <ul className="text-sm space-y-1">
                <li>🥚 Запечатування маточників: <b>{addDays(b.grafted_on, 5)}</b></li>
                <li>👑 Вихід маток: <b>{addDays(b.grafted_on, 11)}</b></li>
                <li>✈️ Обліт / спарювання: <b>{addDays(b.grafted_on, 16)}–{addDays(b.grafted_on, 24)}</b></li>
                <li>🔍 Перевірка засіву: <b>{addDays(b.grafted_on, 28)}</b></li>
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
