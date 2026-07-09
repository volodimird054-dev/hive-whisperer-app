import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Crosshair, Upload, ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePointPhotoUrl } from "./point-photo";

type Point = {
  id: string;
  apiary_id: string;
  name: string;
  kind: "hives" | "nuclei";
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  stationary?: boolean;
  description?: string | null;
  photo_path?: string | null;
  honey_base?: string | null;
  hives_count_manual?: number | null;
  water_source?: string | null;
  car_access?: boolean | null;
  has_electricity?: boolean | null;
  has_security?: boolean | null;
  land_owner?: string | null;
  owner_phone?: string | null;
  installed_at?: string | null;
  removed_at?: string | null;
  status?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  point: Point;
  onSaved: () => void;
};

export function PointEditDialog({ open, onOpenChange, point, onSaved }: Props) {
  const [f, setF] = useState<Point>(point);
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUrl = usePointPhotoUrl(f.photo_path);

  useEffect(() => { setF(point); }, [point, open]);

  function up<K extends keyof Point>(k: K, v: Point[K]) { setF(prev => ({ ...prev, [k]: v })); }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Браузер не підтримує геолокацію");
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        up("lat", Number(pos.coords.latitude.toFixed(6)));
        up("lng", Number(pos.coords.longitude.toFixed(6)));
        setGpsBusy(false);
        toast.success("Координати визначено");
      },
      (err) => { setGpsBusy(false); toast.error("Не вдалося: " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Файл більший за 8 МБ");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${point.apiary_id}/${point.id}/main-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("point-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Delete previous photo (best effort)
      if (f.photo_path && f.photo_path !== path) {
        await supabase.storage.from("point-photos").remove([f.photo_path]);
      }
      up("photo_path", path);
      toast.success("Фото завантажено");
    } catch (err: any) {
      toast.error(err.message ?? "Помилка завантаження");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!f.photo_path) return;
    await supabase.storage.from("point-photos").remove([f.photo_path]);
    up("photo_path", null);
  }

  async function save() {
    if (!f.name.trim()) return toast.error("Вкажіть назву");
    setSaving(true);
    const payload = {
      name: f.name,
      kind: f.kind,
      address: f.address || null,
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      notes: f.notes || null,
      stationary: f.stationary ?? true,
      description: f.description || null,
      photo_path: f.photo_path || null,
      honey_base: f.honey_base || null,
      hives_count_manual: f.hives_count_manual ?? null,
      water_source: f.water_source || null,
      car_access: f.car_access ?? null,
      has_electricity: f.has_electricity ?? null,
      has_security: f.has_security ?? null,
      land_owner: f.land_owner || null,
      owner_phone: f.owner_phone || null,
      installed_at: f.installed_at || null,
      removed_at: f.removed_at || null,
      status: f.status || "active",
      location: f.address || (f.lat && f.lng ? `${f.lat},${f.lng}` : null),
    };
    const { error } = await (supabase.from as any)("apiary_points").update(payload).eq("id", point.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Збережено");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Редагувати точок</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div>
            <Label>Головне фото</Label>
            <div className="mt-1 flex items-start gap-3">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {f.photo_path ? "Замінити" : "Завантажити"}
                </Button>
                {f.photo_path && <Button size="sm" variant="ghost" onClick={removePhoto}>Видалити фото</Button>}
              </div>
            </div>
          </div>

          {/* Basic */}
          <div><Label>Назва *</Label><Input value={f.name} onChange={e => up("name", e.target.value)} /></div>
          <div>
            <Label>Тип точка</Label>
            <Select value={f.kind} onValueChange={v => up("kind", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hives">Вулики</SelectItem>
                <SelectItem value="nuclei">Нуклеуси</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Стаціонарний</Label>
              <p className="text-xs text-muted-foreground">Вимкніть, якщо точок кочовий</p>
            </div>
            <Switch checked={f.stationary ?? true} onCheckedChange={v => up("stationary", v)} />
          </div>
          <div>
            <Label>Статус</Label>
            <Select value={f.status ?? "active"} onValueChange={v => up("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активний</SelectItem>
                <SelectItem value="inactive">Неактивний</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Опис</Label><Textarea rows={2} value={f.description ?? ""} onChange={e => up("description", e.target.value)} /></div>

          {/* Location */}
          <div className="border-t pt-3">
            <div className="text-sm font-semibold mb-2">Розташування</div>
            <div className="space-y-2">
              <div><Label>Адреса</Label><Input value={f.address ?? ""} onChange={e => up("address", e.target.value)} placeholder="с. Лісне, вул. Польова 5" /></div>
              <div>
                <Label>GPS координати</Label>
                <div className="flex gap-2">
                  <Input type="number" step="any" value={f.lat ?? ""} onChange={e => up("lat", e.target.value ? Number(e.target.value) : null)} placeholder="49.123456" />
                  <Input type="number" step="any" value={f.lng ?? ""} onChange={e => up("lng", e.target.value ? Number(e.target.value) : null)} placeholder="24.123456" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={gpsBusy} className="mt-2 w-full">
                  {gpsBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crosshair className="w-4 h-4 mr-2" />}
                  Моя геолокація
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Зміна координат чи адреси автоматично додасть запис в історію кочівель.</p>
              </div>
            </div>
          </div>

          {/* Extra */}
          <div className="border-t pt-3">
            <div className="text-sm font-semibold mb-2">Додаткова інформація</div>
            <div className="space-y-2">
              <div><Label>Медоносна база</Label><Input value={f.honey_base ?? ""} onChange={e => up("honey_base", e.target.value)} placeholder="Ріпак, липа, соняшник…" /></div>
              <div><Label>Кількість вуликів (заявлена)</Label><Input type="number" value={f.hives_count_manual ?? ""} onChange={e => up("hives_count_manual", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Джерело води</Label><Input value={f.water_source ?? ""} onChange={e => up("water_source", e.target.value)} placeholder="Струмок, напувалка…" /></div>
              <ToggleRow label="Під'їзд автомобілем" value={f.car_access} onChange={v => up("car_access", v)} />
              <ToggleRow label="Є електрика" value={f.has_electricity} onChange={v => up("has_electricity", v)} />
              <ToggleRow label="Є охорона" value={f.has_security} onChange={v => up("has_security", v)} />
              <div><Label>Власник ділянки</Label><Input value={f.land_owner ?? ""} onChange={e => up("land_owner", e.target.value)} /></div>
              <div><Label>Телефон власника</Label><Input value={f.owner_phone ?? ""} onChange={e => up("owner_phone", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Встановлено</Label><Input type="date" value={f.installed_at ?? ""} onChange={e => up("installed_at", e.target.value)} /></div>
                <div><Label>Вивезено</Label><Input type="date" value={f.removed_at ?? ""} onChange={e => up("removed_at", e.target.value)} /></div>
              </div>
              <div><Label>Нотатки</Label><Textarea rows={3} value={f.notes ?? ""} onChange={e => up("notes", e.target.value)} /></div>
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Зберегти
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean | null | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label>{label}</Label>
      <Switch checked={!!value} onCheckedChange={onChange} />
    </div>
  );
}
