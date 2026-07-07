import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, ArrowLeft, Trash2, FileDown, MapPin, MoreVertical, Search } from "lucide-react";
import { HiveCard } from "@/components/hive-card";
import { generateHivesPdf } from "@/components/hive-qr";
import { sortHives, filterHives } from "@/lib/hive-sort";

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
        .select("*").eq("point_id", pointId).is("archived_at", null);
      return data ?? [];
    },
    enabled: !!point,
  });

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("single");
  const [number, setNumber] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [breed, setBreed] = useState("");
  const [queenYear, setQueenYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [printOpen, setPrintOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfBusy, setPdfBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [query, setQuery] = useState("");

  const isNuclei = point?.kind === "nuclei";
  const label = isNuclei ? "Нуклеус" : "Вулик";

  const sortedHives = useMemo(() => sortHives(hives), [hives]);
  const visibleHives = useMemo(() => sortHives(filterHives(hives, query)), [hives, query]);

  async function add() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user!.id;

    // Всі активні номери в цьому точку — для перевірки дублікатів
    const { data: existingRows } = await (supabase.from("hives") as any)
      .select("number").eq("point_id", pointId).is("archived_at", null);
    const existing = new Set<string>((existingRows ?? []).map((r: any) => String(r.number)));

    if (tab === "single") {
      if (existing.has(String(number))) {
        setSaving(false);
        return toast.error(`${label} №${number} вже існує в цьому точку.`);
      }
      const { error } = await (supabase.from("hives") as any).insert({
        user_id, apiary_id: point.apiary_id, point_id: pointId,
        number, breed: breed || null,
        queen_year: queenYear ? Number(queenYear) : null,
        notes: notes || null,
      });
      setSaving(false);
      if (error) {
        if ((error as any).code === "23505") return toast.error(`${label} №${number} вже існує в цьому точку.`);
        return toast.error(error.message);
      }
      toast.success(`${label} додано`);
    } else {
      const from = parseInt(rangeFrom, 10);
      const to = parseInt(rangeTo, 10);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
        setSaving(false);
        return toast.error("Невірний діапазон");
      }
      if (to - from + 1 > 200) {
        setSaving(false);
        return toast.error("Максимум 200 за раз");
      }
      const rows = [];
      const dupes: number[] = [];
      for (let n = from; n <= to; n++) {
        if (existing.has(String(n))) { dupes.push(n); continue; }
        rows.push({
          user_id, apiary_id: point.apiary_id, point_id: pointId,
          number: String(n),
          breed: breed || null,
          queen_year: queenYear ? Number(queenYear) : null,
        });
      }
      if (!rows.length) {
        setSaving(false);
        return toast.error(`Всі номери у діапазоні вже існують у цьому точку.`);
      }
      const { error } = await (supabase.from("hives") as any).insert(rows);
      setSaving(false);
      if (error) {
        if ((error as any).code === "23505") return toast.error("Деякі номери вже існують у цьому точку.");
        return toast.error(error.message);
      }
      const msg = dupes.length
        ? `Створено ${rows.length}. Пропущено дублікати: ${dupes.join(", ")}`
        : `Створено ${rows.length} ${label.toLowerCase()}ів`;
      toast.success(msg);
    }
    setNumber(""); setRangeFrom(""); setRangeTo("");
    setBreed(""); setQueenYear(""); setNotes("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["point-hives", pointId] });
    qc.invalidateQueries({ queryKey: ["points-counts"] });
    qc.invalidateQueries({ queryKey: ["hives"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["archived-hives"] });
  }

  async function delPoint() {
    const { error } = await (supabase.from as any)("apiary_points").delete().eq("id", pointId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["points"] });
    window.history.back();
  }

  function selectAll() { setSelectedIds(new Set(sortedHives.map((h: any) => h.id))); }
  function clearAll() { setSelectedIds(new Set()); }

  async function doPdf() {
    const sel = sortedHives.filter((h: any) => selectedIds.has(h.id));
    if (!sel.length) return toast.error("Виберіть хоча б один");
    setPdfBusy(true);
    try {
      await generateHivesPdf(sel.map((h: any) => ({ qrUuid: h.qr_uuid, number: h.number })), label);
      setPrintOpen(false);
    } finally {
      setPdfBusy(false);
    }
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;
  if (!point) return <div className="text-center text-muted-foreground mt-10">Точок не знайдено.</div>;

  const title = isNuclei ? "Нуклеуси" : "Вулики";
  const loc = point.address || (point.lat && point.lng ? `${point.lat}, ${point.lng}` : point.location);

  return (
    <div>
      <Link to="/points" className="inline-flex items-center text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4 mr-1" /> До списку точок
      </Link>

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{point.name}</h1>
          <p className="text-sm text-muted-foreground">
            {isNuclei ? "Нуклеусний парк" : "Точок вуликів"}
          </p>
          {loc && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />{loc}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Додати</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новий {label.toLowerCase()}</DialogTitle>
              </DialogHeader>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="single">Один</TabsTrigger>
                  <TabsTrigger value="range">Діапазон</TabsTrigger>
                </TabsList>
                <TabsContent value="single" className="space-y-3 mt-3">
                  <div><Label>Номер *</Label><Input value={number} onChange={e => setNumber(e.target.value)} /></div>
                  <div><Label>Нотатки</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                </TabsContent>
                <TabsContent value="range" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Від *</Label><Input type="number" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} placeholder="1" /></div>
                    <div><Label>До *</Label><Input type="number" value={rangeTo} onChange={e => setRangeTo(e.target.value)} placeholder="50" /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Створить {label.toLowerCase()}ів з номерами в діапазоні. До 200 за раз.</p>
                </TabsContent>
              </Tabs>
              <div className="space-y-3 mt-3">
                <div><Label>Порода</Label><Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Карпатка, Бакфаст…" /></div>
                <div><Label>Рік матки</Label><Input type="number" value={queenYear} onChange={e => setQueenYear(e.target.value)} /></div>
                <Button onClick={add} disabled={saving || (tab === "single" ? !number : !rangeFrom || !rangeTo)} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Меню точка">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!sortedHives.length}
                onClick={() => { selectAll(); setPrintOpen(true); }}
              >
                <FileDown className="w-4 h-4 mr-2" /> Друк QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDel(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Видалити точок
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <h2 className="text-sm font-semibold text-muted-foreground mt-2 mb-2 uppercase tracking-wide">{title}</h2>
      {visibleHives.length > 0 ? (
        <div className="space-y-2">
          {visibleHives.map((h: any) => (
            <HiveCard
              key={h.id}
              hive={h}
              kind={isNuclei ? "nucleus" : "hive"}
              onChange={() => {
                qc.invalidateQueries({ queryKey: ["point-hives", pointId] });
                qc.invalidateQueries({ queryKey: ["hives"] });
              }}
            />
          ))}
        </div>
      ) : sortedHives.length ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Нічого не знайдено за запитом «{query}».
        </Card>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Тут поки нічого немає. Додайте перший {label.toLowerCase()}.
        </Card>
      )}

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити точок «{point.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Прикріплені {label.toLowerCase()}и не буде видалено — вони стануть «без точка».
              Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={delPoint}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Друк QR для {label.toLowerCase()}ів</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Вибрати всі</Button>
              <Button variant="outline" size="sm" onClick={clearAll}>Зняти всі</Button>
            </div>
            <div className="text-sm text-muted-foreground">Вибрано: {selectedIds.size}</div>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 border rounded p-2">
            {sortedHives.map((h: any) => (
              <label key={h.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <Checkbox
                  checked={selectedIds.has(h.id)}
                  onCheckedChange={(v) => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (v) next.add(h.id); else next.delete(h.id);
                      return next;
                    });
                  }}
                />
                <span>{label} №{h.number}</span>
              </label>
            ))}
          </div>
          <Button onClick={doPdf} disabled={pdfBusy || !selectedIds.size} className="w-full mt-3">
            {pdfBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
            Створити PDF ({selectedIds.size})
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Один файл A4. Наклейки 50×50 мм з підписом «{label} №N».
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
