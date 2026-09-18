import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { METHOD_LABEL, createStepsFor, plannedDates, type QueenMethod } from "@/lib/queens";

export const Route = createFileRoute("/_app/queens/new")({
  head: () => ({
    meta: [
      { title: "Нова партія маток — Пасічник" },
      { name: "description", content: "Створення нової партії виведення маток у додатку Пасічник." },
      { property: "og:title", content: "Нова партія маток — Пасічник" },
      { property: "og:description", content: "Форма створення нової партії виведення маток." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewQueenBatchPage,
});

function NewQueenBatchPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const [name, setName] = useState("");
  const [method, setMethod] = useState<QueenMethod>("comb");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      toast.error("Потрібно увійти в обліковий запис");
      return;
    }
    const { data, error } = await supabase
      .from("queen_batches")
      .insert({
        user_id: userData.user.id,
        name,
        grafted_on: date,
        method,
        next_action: null,
        count: count ? Number(count) : null,
        larvae_count: count ? Number(count) : null,
        status: "planned",
        ...plannedDates(method, date),
      })
      .select()
      .single();

    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Не вдалося створити партію");
      return;
    }

    await createStepsFor(data);
    setBusy(false);
    toast.success("Партію створено");
    navigate({ to: "/queens/$batchId", params: { batchId: data.id } });
  }

  return (
    <div className="space-y-5 lg:relative lg:left-1/2 lg:w-[calc(100vw-2rem)] lg:max-w-3xl lg:-translate-x-1/2">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/queens" aria-label="Назад до партій">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">Виведення маток</p>
          <h1 className="text-2xl font-bold">Нова партія</h1>
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="batch-name">Назва партії</Label>
            <Input id="batch-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Партія №1" />
          </div>

          <div>
            <Label className="mb-2 block">Спосіб отримання личинок</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["comb", "transfer"] as QueenMethod[]).map((value) => (
                <Button key={value} type="button" variant={method === value ? "default" : "outline"} className="h-auto justify-start py-3" onClick={() => setMethod(value)}>
                  {method === value ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border" />}
                  <span className="text-left">{METHOD_LABEL[value]}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="batch-date">Дата початку партії</Label>
            <Input id="batch-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>

          <div>
            <Label htmlFor="batch-count">Кількість яєць / личинок / мисочок</Label>
            <Input id="batch-count" type="number" min="0" value={count} onChange={(event) => setCount(event.target.value)} placeholder="20" />
          </div>

          <Button onClick={add} disabled={!name.trim() || busy} className="w-full">
            <Plus className="h-4 w-4" />
            Створити партію
          </Button>
        </div>
      </Card>
    </div>
  );
}