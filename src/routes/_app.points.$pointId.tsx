import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { HiveCard } from "@/components/hive-card";

export const Route = createFileRoute("/_app/points/$pointId")({
  component: PointPage,
});

function PointPage() {
  const { pointId } = Route.useParams();
  const qc = useQueryClient();

  const { data: point, isLoading } = useQuery({
    queryKey: ["point", pointId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("apiary_points")
        .select("*").eq("id", pointId).maybeSingle();
      return data;
    },
  });

  const { data: hives } = useQuery({
    queryKey: ["point-hives", pointId],
    queryFn: async () => {
      const { data } = await (supabase.from("hives") as any)
        .select("*").eq("point_id", pointId).order("number");
      return data ?? [];
    },
    enabled: !!point,
  });

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [breed, setBreed] = useState("");
  const [queenYear, setQueenYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isNuclei = point?.kind === "nuclei";

  async function add() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("hives") as any).insert({
      user_id: u.user!.id,
      apiary_id: point.apiary_id,
      point_id: pointId,
      number,
      breed: breed || null,
      queen_year: queenYear ? Number(queenYear) : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNumber(""); setBreed(""); setQueenYear(""); setNotes("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["point-hives", pointId] });
    qc.invalidateQueries({ queryKey: ["points-counts"] });
    toast.success(isNuclei ? "Нуклеус додано" : "Вулик додано");
  }

  async function delPoint() {
    if (!confirm("Видалити точок? Всі прикріплені вулики стануть «без точка».")) return;
    await (supabase.from as any)("apiary_points").delete().eq("id", pointId);
    qc.invalidateQueries({ queryKey: ["points"] });
    window.history.back();
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;
  if (!point) return <div className="text-center text-muted-foreground mt-10">Точок не знайдено.</div>;

  const title = isNuclei ? "Нуклеуси" : "Вулики";

  return (
    <div>
      <Link to="/points" className="inline-flex items-center text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4 mr-1" /> До списку точок
      </Link>

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">{point.name}</h1>
          <p className="text-sm text-muted-foreground">
            {isNuclei ? "Нуклеусний парк" : "Точок вуликів"}
            {point.location ? ` · ${point.location}` : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Додати</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новий {isNuclei ? "нуклеус" : "вулик"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Номер *</Label><Input value={number} onChange={e => setNumber(e.target.value)} /></div>
              <div><Label>Порода</Label><Input value={breed} onChange={e => setBreed(e.target.value)} /></div>
              <div><Label>Рік матки</Label><Input type="number" value={queenYear} onChange={e => setQueenYear(e.target.value)} /></div>
              <div><Label>Нотатки</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button onClick={add} disabled={!number || saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mt-4 mb-2 uppercase tracking-wide">{title}</h2>
      {hives && hives.length > 0 ? (
        <div className="space-y-2">
          {hives.map((h: any) => (
            <Card key={h.id} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-honey/30 flex items-center justify-center font-bold">{h.number}</div>
              <div className="flex-1">
                <div className="font-medium">{isNuclei ? "Нуклеус" : "Вулик"} №{h.number}</div>
                <div className="text-xs text-muted-foreground">
                  {h.breed || "—"}{h.queen_year ? ` · матка ${h.queen_year}` : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Тут поки нічого немає. Додайте перший {isNuclei ? "нуклеус" : "вулик"}.
        </Card>
      )}

      <Button variant="destructive" onClick={delPoint} className="w-full mt-6">
        <Trash2 className="w-4 h-4 mr-2" /> Видалити точку
      </Button>
    </div>
  );
}
