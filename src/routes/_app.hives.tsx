import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { HiveQrButton } from "@/components/hive-qr";
// scanner moved to global FAB

export const Route = createFileRoute("/_app/hives")({
  component: HivesPage,
});

function HivesPage() {
  const qc = useQueryClient();
  const { data: hives, isLoading } = useQuery({
    queryKey: ["hives"],
    queryFn: async () => {
      const { data } = await supabase.from("hives").select("*").order("number");
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [breed, setBreed] = useState("");
  const [queenYear, setQueenYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [scannedId, setScannedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("scan");
    if (id) {
      setScannedId(id);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function add() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("hives").insert({
      user_id: u.user!.id,
      number,
      breed: breed || null,
      queen_year: queenYear ? Number(queenYear) : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNumber(""); setBreed(""); setQueenYear(""); setNotes("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["hives"] });
    toast.success("Вулик додано");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Всі вулики</h1>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Додати</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новий вулик</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Номер *</Label><Input value={number} onChange={e => setNumber(e.target.value)} /></div>
              <div><Label>Порода</Label><Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Карпатка, Бакфаст…" /></div>
              <div><Label>Рік матки</Label><Input type="number" value={queenYear} onChange={e => setQueenYear(e.target.value)} /></div>
              <div><Label>Нотатки</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button onClick={add} disabled={!number || saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />
      ) : hives && hives.length > 0 ? (
        <div className="space-y-2">
          {hives.map(h => (
            <HiveCard key={h.id} hive={h} forceOpen={scannedId === h.id} onChange={() => qc.invalidateQueries({ queryKey: ["hives"] })} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          Поки що немає вуликів. Додайте перший або скажіть голосом: «Додай вулик номер 1».
        </Card>
      )}
    </div>
  );
}

function HiveCard({ hive, onChange, forceOpen }: { hive: any; onChange: () => void; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  const [edit, setEdit] = useState(false);
  const [number, setNumber] = useState(hive.number);
  const [breed, setBreed] = useState(hive.breed ?? "");
  const [queenYear, setQueenYear] = useState(hive.queen_year?.toString() ?? "");
  const [notes, setNotes] = useState(hive.notes ?? "");
  const [saving, setSaving] = useState(false);

  const { data: inspections } = useQuery({
    queryKey: ["inspections", hive.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspections").select("*").eq("hive_id", hive.id).order("inspected_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: open,
  });

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("hives").update({
      number,
      breed: breed || null,
      queen_year: queenYear ? Number(queenYear) : null,
      notes: notes || null,
    }).eq("id", hive.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Збережено");
    setEdit(false);
    onChange();
  }

  async function del() {
    if (!confirm(`Видалити вулик ${hive.number}?`)) return;
    await supabase.from("hives").delete().eq("id", hive.id);
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
            <div className="font-medium">Вулик №{hive.number}</div>
            <div className="text-xs text-muted-foreground truncate">
              {hive.breed || "—"}{hive.queen_year ? ` · матка ${hive.queen_year}` : ""}
            </div>
          </div>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Вулик №{hive.number}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="text-sm">
            <div><b>Порода:</b> {hive.breed || "—"}</div>
            <div><b>Матка:</b> {hive.queen_year || "—"}</div>
            {hive.notes && <div className="mt-2"><b>Нотатки:</b> {hive.notes}</div>}
          </div>
          <Button variant="outline" onClick={() => setEdit(true)} className="w-full">
            <Pencil className="w-4 h-4 mr-2" /> Редагувати картку
          </Button>
          <HiveQrButton hiveId={hive.id} number={hive.number} />
          <div>
            <h3 className="font-semibold mb-2">Останні огляди</h3>
            {!inspections?.length && <div className="text-sm text-muted-foreground">Поки немає. Скажіть голосом: «У вулику {hive.number} матка червить».</div>}
            <div className="space-y-2">
              {inspections?.map(i => (
                <Card key={i.id} className="p-3 text-sm">
                  <div className="text-xs text-muted-foreground">{new Date(i.inspected_at).toLocaleString("uk-UA")}</div>
                  <div>{i.notes || "—"}</div>
                </Card>
              ))}
            </div>
          </div>
          <Button variant="destructive" onClick={del} className="w-full">
            <Trash2 className="w-4 h-4 mr-2" /> Видалити вулик
          </Button>
        </div>

        <Dialog open={edit} onOpenChange={setEdit}>
          <DialogContent>
            <DialogHeader><DialogTitle>Редагувати вулик</DialogTitle></DialogHeader>
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
      </SheetContent>
    </Sheet>
  );
}
