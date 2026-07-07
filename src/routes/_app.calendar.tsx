import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  CalendarPlus,
  GripVertical,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_app/calendar")({
  component: CalPage,
});

// ---------- constants ----------
const COLOR_PRESETS = [
  { v: "#f59e0b", l: "Бурштиновий" },
  { v: "#10b981", l: "Зелений" },
  { v: "#3b82f6", l: "Синій" },
  { v: "#ef4444", l: "Червоний" },
  { v: "#8b5cf6", l: "Фіолетовий" },
  { v: "#6b7280", l: "Сірий" },
];

const DEFAULT_SEASONS = [
  { key: "spring", label: "Весна" },
  { key: "summer", label: "Літо" },
  { key: "autumn", label: "Осінь" },
  { key: "winter", label: "Зима" },
];

const PRIORITY_OPTIONS = [
  { v: "low", l: "Низький" },
  { v: "normal", l: "Звичайний" },
  { v: "high", l: "Високий" },
];

const MONTHS = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

const DEFAULT_TASKS = [
  { season: "spring", title: "Перший обліт", month: "Березень", priority: "high" },
  { season: "spring", title: "Чистка днищ", month: "Березень", priority: "normal" },
  { season: "spring", title: "Розширення гнізда", month: "Квітень", priority: "normal" },
  { season: "spring", title: "Заміна старих рамок", month: "Квітень", priority: "normal" },
  { season: "spring", title: "Контроль роїння", month: "Травень", priority: "high" },
  { season: "summer", title: "Постановка магазинів", month: "Червень", priority: "high" },
  { season: "summer", title: "Головний медозбір", month: "Липень", priority: "high" },
  { season: "summer", title: "Відкачка меду", month: "Липень", priority: "normal" },
  { season: "autumn", title: "Підгодівля на зиму", month: "Серпень", priority: "high" },
  { season: "autumn", title: "Обробка від вароа", month: "Серпень", priority: "high" },
  { season: "autumn", title: "Складання гнізда", month: "Вересень", priority: "normal" },
  { season: "autumn", title: "Утеплення вуликів", month: "Жовтень", priority: "normal" },
  { season: "winter", title: "Контроль зимівлі", month: "Грудень", priority: "normal" },
  { season: "winter", title: "Підготовка інвентаря", month: "Січень", priority: "low" },
];

type SeasonalTask = {
  id: string;
  title: string;
  description: string | null;
  season: string;
  month: string | null;
  target_date: string | null;
  priority: string;
  category: string | null;
  done: boolean;
  notes: string | null;
  sort_order: number;
};

type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  color: string | null;
  remind_at: string | null;
  done: boolean;
  seasonal_task_id: string | null;
};

// =====================================================
function CalPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Календар пасічника</h1>
      <Tabs defaultValue="events">
        <TabsList className="mb-3">
          <TabsTrigger value="events">Події</TabsTrigger>
          <TabsTrigger value="tasks">Технічна карта</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <EventsSection />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// EVENTS
// =====================================================
function EventsSection() {
  const qc = useQueryClient();
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .order("event_date");
      return (data ?? []) as CalendarEvent[];
    },
  });

  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggle(ev: CalendarEvent) {
    await supabase.from("calendar_events").update({ done: !ev.done }).eq("id", ev.id);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function remove(id: string) {
    if (!confirm("Видалити подію?")) return;
    await supabase.from("calendar_events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Подію видалено");
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Подія
        </Button>
      </div>

      {!events?.length ? (
        <Card className="p-4 text-sm text-muted-foreground">Подій ще немає.</Card>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} className="p-3 flex items-start gap-3">
              <div
                className="w-1.5 self-stretch rounded"
                style={{ background: e.color ?? "#f59e0b" }}
              />
              <Checkbox checked={e.done} onCheckedChange={() => toggle(e)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className={e.done ? "line-through text-muted-foreground" : "font-medium"}>
                  {e.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{e.event_date}</span>
                  {e.remind_at && (
                    <span className="inline-flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      {new Date(e.remind_at).toLocaleString("uk-UA")}
                    </span>
                  )}
                </div>
                {e.description && <div className="text-sm mt-1 whitespace-pre-wrap">{e.description}</div>}
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(e)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <EventDialog
          event={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["events"] })}
        />
      )}
    </div>
  );
}

function EventDialog({
  event,
  onClose,
  onSaved,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.event_date ?? new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState(event?.description ?? "");
  const [color, setColor] = useState(event?.color ?? COLOR_PRESETS[0].v);
  const [remindAt, setRemindAt] = useState(
    event?.remind_at ? event.remind_at.slice(0, 16) : "",
  );

  async function save() {
    if (!title.trim()) return toast.error("Введіть назву");
    const payload = {
      title: title.trim(),
      event_date: date,
      description: desc || null,
      color,
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
    };
    if (event) {
      const { error } = await supabase.from("calendar_events").update(payload).eq("id", event.id);
      if (error) return toast.error(error.message);
      toast.success("Оновлено");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("calendar_events").insert({
        ...payload,
        user_id: u.user!.id,
      });
      if (error) return toast.error(error.message);
      toast.success("Додано");
    }
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Редагувати подію" : "Нова подія"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Назва</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <Label>Колір</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setColor(c.v)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    color === c.v ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ background: c.v }}
                  title={c.l}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Нагадування (не обовʼязково)</Label>
            <Input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={save}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// SEASONAL TASKS (Технічна карта)
// =====================================================
function TasksSection() {
  const qc = useQueryClient();
  const [seededChecked, setSeededChecked] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["seasonal_tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasonal_tasks")
        .select("*")
        .order("sort_order");
      return (data ?? []) as SeasonalTask[];
    },
  });

  // Seed defaults once for empty users
  useEffect(() => {
    if (isLoading || seededChecked || !tasks) return;
    setSeededChecked(true);
    if (tasks.length > 0) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const rows = DEFAULT_TASKS.map((t, i) => ({
        ...t,
        user_id: u.user!.id,
        sort_order: i,
      }));
      await supabase.from("seasonal_tasks").insert(rows);
      qc.invalidateQueries({ queryKey: ["seasonal_tasks"] });
    })();
  }, [tasks, isLoading, seededChecked, qc]);

  const [editing, setEditing] = useState<Partial<SeasonalTask> | null>(null);
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS);

  // Include any custom seasons found in tasks
  const allSeasons = useMemo(() => {
    const set = new Map(seasons.map((s) => [s.key, s.label]));
    (tasks ?? []).forEach((t) => {
      if (!set.has(t.season)) set.set(t.season, t.season);
    });
    return Array.from(set, ([key, label]) => ({ key, label }));
  }, [seasons, tasks]);

  const grouped = useMemo(() => {
    const map: Record<string, SeasonalTask[]> = {};
    (tasks ?? []).forEach((t) => {
      (map[t.season] ||= []).push(t);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.sort_order - b.sort_order),
    );
    return map;
  }, [tasks]);

  function addSeason() {
    const label = prompt("Назва нового сезону/категорії:");
    if (!label) return;
    const key = `custom_${Date.now()}`;
    setSeasons((s) => [...s, { key, label }]);
    setEditing({ season: key, priority: "normal" });
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={addSeason}>
          <Plus className="w-4 h-4 mr-1" />
          Сезон
        </Button>
        <Button size="sm" onClick={() => setEditing({ season: "spring", priority: "normal" })}>
          <Plus className="w-4 h-4 mr-1" />
          Робота
        </Button>
      </div>

      {allSeasons.map((s) => (
        <SeasonBlock
          key={s.key}
          season={s}
          tasks={grouped[s.key] ?? []}
          onEdit={(t) => setEditing(t)}
          onAdd={() => setEditing({ season: s.key, priority: "normal" })}
        />
      ))}

      {editing && (
        <TaskDialog
          task={editing}
          seasons={allSeasons}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["seasonal_tasks"] })}
        />
      )}
    </div>
  );
}

function SeasonBlock({
  season,
  tasks,
  onEdit,
  onAdd,
}: {
  season: { key: string; label: string };
  tasks: SeasonalTask[];
  onEdit: (t: SeasonalTask) => void;
  onAdd: () => void;
}) {
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === e.active.id);
    const newIndex = tasks.findIndex((t) => t.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    // Optimistic-ish: update sort_order for all in season
    await Promise.all(
      reordered.map((t, i) =>
        supabase.from("seasonal_tasks").update({ sort_order: i * 10 }).eq("id", t.id),
      ),
    );
    qc.invalidateQueries({ queryKey: ["seasonal_tasks"] });
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{season.label}</h2>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Додати
        </Button>
      </div>
      {tasks.length === 0 ? (
        <Card className="p-3 text-xs text-muted-foreground">Робіт немає.</Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((t) => (
                <SortableTaskCard key={t.id} task={t} onEdit={() => onEdit(t)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableTaskCard({ task, onEdit }: { task: SeasonalTask; onEdit: () => void }) {
  const qc = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function toggle() {
    await supabase.from("seasonal_tasks").update({ done: !task.done }).eq("id", task.id);
    qc.invalidateQueries({ queryKey: ["seasonal_tasks"] });
  }
  async function remove() {
    if (!confirm("Видалити роботу?")) return;
    await supabase.from("seasonal_tasks").delete().eq("id", task.id);
    qc.invalidateQueries({ queryKey: ["seasonal_tasks"] });
    toast.success("Видалено");
  }
  async function duplicate() {
    const { data: u } = await supabase.auth.getUser();
    const { id: _id, ...rest } = task;
    void _id;
    await supabase.from("seasonal_tasks").insert({
      ...rest,
      user_id: u.user!.id,
      title: `${task.title} (копія)`,
      sort_order: task.sort_order + 1,
      done: false,
    });
    qc.invalidateQueries({ queryKey: ["seasonal_tasks"] });
  }
  async function toCalendar() {
    const { data: u } = await supabase.auth.getUser();
    const date = task.target_date ?? new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("calendar_events").insert({
      user_id: u.user!.id,
      title: task.title,
      event_date: date,
      description: task.description,
      color: task.priority === "high" ? "#ef4444" : "#f59e0b",
      seasonal_task_id: task.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Додано в календар");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.v === task.priority)?.l;

  return (
    <Card ref={setNodeRef} style={style} className="p-3 flex items-start gap-2">
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground touch-none cursor-grab active:cursor-grabbing mt-1"
        aria-label="Перетягнути"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox checked={task.done} onCheckedChange={toggle} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className={task.done ? "line-through text-muted-foreground" : "font-medium"}>
          {task.title}
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
          {task.month && <span>{task.month}</span>}
          {task.target_date && <span>{task.target_date}</span>}
          {priorityLabel && (
            <span
              className={
                task.priority === "high"
                  ? "text-destructive"
                  : task.priority === "low"
                  ? ""
                  : ""
              }
            >
              {priorityLabel}
            </span>
          )}
          {task.category && <span>#{task.category}</span>}
        </div>
        {task.description && (
          <div className="text-sm mt-1 whitespace-pre-wrap">{task.description}</div>
        )}
        {task.notes && (
          <div className="text-xs mt-1 text-muted-foreground italic whitespace-pre-wrap">
            {task.notes}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="ghost" size="icon" onClick={toCalendar} title="Додати в календар">
          <CalendarPlus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} title="Редагувати">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={duplicate} title="Дублювати">
          <Copy className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} title="Видалити">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}

function TaskDialog({
  task,
  seasons,
  onClose,
  onSaved,
}: {
  task: Partial<SeasonalTask>;
  seasons: { key: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!task.id;
  const [title, setTitle] = useState(task.title ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [season, setSeason] = useState(task.season ?? "spring");
  const [month, setMonth] = useState(task.month ?? "");
  const [targetDate, setTargetDate] = useState(task.target_date ?? "");
  const [priority, setPriority] = useState(task.priority ?? "normal");
  const [category, setCategory] = useState(task.category ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [done, setDone] = useState(task.done ?? false);

  async function save() {
    if (!title.trim()) return toast.error("Введіть назву");
    const payload = {
      title: title.trim(),
      description: description || null,
      season,
      month: month || null,
      target_date: targetDate || null,
      priority,
      category: category || null,
      notes: notes || null,
      done,
    };
    if (isEdit) {
      const { error } = await supabase.from("seasonal_tasks").update(payload).eq("id", task.id!);
      if (error) return toast.error(error.message);
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("seasonal_tasks").insert({
        ...payload,
        user_id: u.user!.id,
        sort_order: Date.now() % 100000,
      });
      if (error) return toast.error(error.message);
    }
    toast.success(isEdit ? "Оновлено" : "Додано");
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редагувати роботу" : "Нова робота"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Назва</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Сезон</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Пріоритет</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Місяць</Label>
              <Select value={month || "none"} onValueChange={(v) => setMonth(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Орієнтовна дата</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Категорія</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="напр. Обробки" />
          </div>
          <div>
            <Label>Примітки</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={done} onCheckedChange={(v) => setDone(!!v)} />
            Виконано
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button onClick={save}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
