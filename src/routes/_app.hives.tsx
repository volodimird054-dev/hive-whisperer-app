import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Search } from "lucide-react";
import { HiveCard } from "@/components/hive-card";
import { sortHives, filterHives } from "@/lib/hive-sort";

export const Route = createFileRoute("/_app/hives")({
  component: HivesPage,
});

function HivesPage() {
  const qc = useQueryClient();
  const { data: hives, isLoading } = useQuery({
    queryKey: ["hives"],
    queryFn: async () => {
      const { data } = await supabase.from("hives").select("*").is("archived_at", null);
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
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("scan");
    if (id) {
      setScannedId(id);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const visible = useMemo(() => sortHives(filterHives(hives, query)), [hives, query]);

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

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук за номером, породою, роком матки…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />
      ) : visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map(h => (
            <HiveCard key={h.id} hive={h} forceOpen={scannedId === h.id} onChange={() => qc.invalidateQueries({ queryKey: ["hives"] })} />
          ))}
        </div>
      ) : hives?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          Нічого не знайдено за запитом «{query}».
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          Поки що немає вуликів. Додайте перший або скажіть голосом: «Додай вулик номер 1».
        </Card>
      )}
    </div>
  );
}
