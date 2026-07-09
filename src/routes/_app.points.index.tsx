import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, MapPin, Boxes, Egg, Crosshair } from "lucide-react";
import { PointPhoto } from "@/components/point-photo";

export const Route = createFileRoute("/_app/points/")({
  component: PointsPage,
});

type Point = {
  id: string;
  apiary_id: string;
  name: string;
  kind: "hives" | "nuclei";
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  photo_path?: string | null;
  status?: string | null;
};

function PointsPage() {
  const qc = useQueryClient();
  const { data: apiary } = useQuery({
    queryKey: ["apiary-one"],
    queryFn: async () => {
      const { data } = await supabase.from("apiaries").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: points, isLoading } = useQuery({
    queryKey: ["points"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("apiary_points")
        .select("*").order("created_at");
      return (data ?? []) as Point[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["points-counts"],
    queryFn: async () => {
      const { data } = await (supabase.from("hives") as any).select("point_id").is("archived_at", null);
      const map: Record<string, number> = {};
      (data ?? []).forEach((h: any) => {
        if (h.point_id) map[h.point_id] = (map[h.point_id] ?? 0) + 1;
      });
      return map;
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"hives" | "nuclei">("hives");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Браузер не підтримує геолокацію");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsBusy(false);
        toast.success("Координати визначено");
      },
      (err) => {
        setGpsBusy(false);
        toast.error("Не вдалося отримати координати: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function add() {
    if (!apiary) {
      toast.error("Спочатку створіть пасіку у розділі «Моя пасіка»");
      return;
    }
    const hasAddress = !!address.trim();
    const hasGps = !!lat && !!lng;
    if (!hasAddress && !hasGps) {
      toast.error("Вкажіть адресу або GPS координати");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)("apiary_points").insert({
      apiary_id: apiary.id,
      name,
      kind,
      address: address || null,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      location: address || (hasGps ? `${lat},${lng}` : null),
      notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setName(""); setAddress(""); setLat(""); setLng(""); setNotes(""); setKind("hives");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["points"] });
    toast.success("Точок додано");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Мої точки</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Додати</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новий точок</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Назва *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Лісова, Домашня…" />
              </div>
              <div>
                <Label>Тип точка *</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hives">Вулики</SelectItem>
                    <SelectItem value="nuclei">Нуклеуси</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Адреса</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="с. Лісне, вул. Польова 5" />
                <p className="text-xs text-muted-foreground mt-1">Вкажіть або адресу, або GPS.</p>
              </div>
              <div>
                <Label>GPS координати</Label>
                <div className="flex gap-2">
                  <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="49.123456" />
                  <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="24.123456" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={gpsBusy} className="mt-2 w-full">
                  {gpsBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crosshair className="w-4 h-4 mr-2" />}
                  Моя геолокація
                </Button>
              </div>
              <div><Label>Нотатки</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button onClick={add} disabled={!name || saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Створити
              </Button>
              <p className="text-xs text-muted-foreground text-center">Додаткові поля (фото, кочівля, погода) — у налаштуваннях точка після створення.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />
      ) : points && points.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {points.map(p => {
            const Icon = p.kind === "nuclei" ? Egg : Boxes;
            const loc = p.address || (p.lat && p.lng ? `${p.lat?.toFixed?.(5) ?? p.lat}, ${p.lng?.toFixed?.(5) ?? p.lng}` : null);
            return (
              <Link key={p.id} to="/points/$pointId" params={{ pointId: p.id }}>
                <Card className="p-4 hover:bg-accent/40 cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-honey/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.photo_path ? (
                        <PointPhoto path={p.photo_path} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {p.name}
                        {p.status === "inactive" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">неактивний</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.kind === "nuclei" ? "Нуклеусний парк" : "Точок вуликів"}
                        {" · "}{counts?.[p.id] ?? 0} шт
                      </div>
                      {loc && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{loc}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          Поки що немає точків. Створіть перший — окремо для вуликів, окремо для нуклеусів.
        </Card>
      )}
    </div>
  );
}
