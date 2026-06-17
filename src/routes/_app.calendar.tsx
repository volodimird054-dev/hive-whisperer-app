import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/calendar")({
  component: CalPage,
});

const SEASONAL = [
  { month: "Березень", tasks: ["Перший обліт", "Чистка днищ", "Поповнення корму"] },
  { month: "Квітень", tasks: ["Розширення гнізда", "Заміна старих рамок"] },
  { month: "Травень", tasks: ["Контроль роїння", "Постановка магазинів", "Виведення маток"] },
  { month: "Червень-Липень", tasks: ["Головний медозбір", "Відкачка меду"] },
  { month: "Серпень", tasks: ["Підгодівля на зиму", "Обробка від вароа"] },
  { month: "Вересень-Жовтень", tasks: ["Складання гнізда", "Утеплення"] },
  { month: "Листопад-Лютий", tasks: ["Контроль зимівлі", "Підготовка інвентаря"] },
];

function CalPage() {
  const qc = useQueryClient();
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("calendar_events").select("*").order("event_date")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");

  async function add() {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("calendar_events").insert({
      user_id: u.user!.id, title, event_date: date, description: desc || null,
    });
    setOpen(false); setTitle(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function toggle(id: string, done: boolean) {
    await supabase.from("calendar_events").update({ done: !done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Календар пасічника</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Подія</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Нова подія</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Назва</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>Дата</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><Label>Опис</Label><Textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} /></div>
              <Button onClick={add} disabled={!title} className="w-full">Додати</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="font-semibold mb-2">Мої події</h2>
      {!events?.length ? (
        <Card className="p-4 text-sm text-muted-foreground mb-6">Подій ще немає.</Card>
      ) : (
        <div className="space-y-2 mb-6">
          {events.map(e => (
            <Card key={e.id} className="p-3 flex items-start gap-3">
              <Checkbox checked={e.done} onCheckedChange={() => toggle(e.id, e.done)} />
              <div className="flex-1">
                <div className={e.done ? "line-through text-muted-foreground" : "font-medium"}>{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.event_date}</div>
                {e.description && <div className="text-sm mt-1">{e.description}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-semibold mb-2">Сезонні роботи</h2>
      <div className="space-y-2">
        {SEASONAL.map(s => (
          <Card key={s.month} className="p-3">
            <div className="font-medium text-sm">{s.month}</div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 mt-1">
              {s.tasks.map(t => <li key={t}>{t}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
