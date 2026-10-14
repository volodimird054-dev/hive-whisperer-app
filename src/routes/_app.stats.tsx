import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Star, AlertTriangle, Crown } from "lucide-react";
import { FREE_LIMIT_HIVES, FREE_LIMIT_NUCLEI } from "@/lib/plan";
import { scoreHive, type HiveScore } from "@/lib/breeding";

export const Route = createFileRoute("/_app/stats")({
  head: () => ({
    meta: [
      { title: "Статистика і селекція — Пасічник" },
      { name: "description", content: "Племінний рейтинг сімей, антирейтинг і загальна статистика пасіки." },
      { property: "og:title", content: "Статистика і селекція — Пасічник" },
      { property: "og:description", content: "Топ-5 материнських сімей і всі проблемні сім'ї." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

function LimitBar({ label, value, limit }: { label: string; value: number; limit: number }) {
  const pct = Math.min(100, Math.round((value / limit) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className={value >= limit ? "text-destructive font-semibold" : "text-muted-foreground"}>{value}/{limit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${value >= limit ? "bg-destructive" : "bg-honey"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function hiveTitle(s: HiveScore) {
  return `${s.hive.isNucleus ? "Нуклеус" : "Вулик"} №${s.hive.number}${s.hive.breed ? ` (${s.hive.breed})` : ""}`;
}

function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-breeding"],
    queryFn: async () => {
      const yearStart = `${new Date().getFullYear()}-01-01`;
      const [points, hives, inspections] = await Promise.all([
        supabase.from("apiary_points").select("id, kind, name"),
        supabase.from("hives").select("id, number, breed, queen_year, point_id").is("archived_at", null),
        supabase
          .from("inspections")
          .select("hive_id, inspected_at, queen_status, brood_level, honey_level, aggression, swarming")
          .gte("inspected_at", yearStart)
          .order("inspected_at", { ascending: false })
          .limit(5000),
      ]);
      const pts = new Map((points.data ?? []).map((p: any) => [p.id, p]));
      const byHive = new Map<string, any[]>();
      (inspections.data ?? []).forEach((i: any) => {
        if (!byHive.has(i.hive_id)) byHive.set(i.hive_id, []);
        byHive.get(i.hive_id)!.push(i);
      });
      const hvs = (hives.data ?? []).map((h: any) => {
        const p: any = h.point_id ? pts.get(h.point_id) : null;
        return { ...h, pointName: p?.name, isNucleus: p?.kind === "nuclei" };
      });
      const scored = hvs.filter((h) => byHive.has(h.id)).map((h) => scoreHive(h, byHive.get(h.id)!));
      const top = scored.filter((s) => !s.swarmed && s.problems.length === 0).sort((a, b) => b.score - a.score).slice(0, 5);
      const anti = scored.filter((s) => s.problems.length).sort((a, b) => b.severity - a.severity || a.score - b.score);
      const nuclei = hvs.filter((h) => h.isNucleus).length;
      return {
        top, anti,
        hives: hvs.length - nuclei, nuclei,
        points: pts.size,
        inspections: (inspections.data ?? []).length,
        noData: hvs.length - scored.length,
      };
    },
  });

  if (isLoading || !data) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Статистика і селекція</h1>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-1"><Crown className="w-5 h-5 text-honey" /> Топ-5 материнських сімей</h2>
        <p className="text-xs text-muted-foreground mb-3">Бал з оглядів цього сезону: нероїливість 35%, мед 25%, розплід 20%, миролюбність 20%.</p>
        {!data.top.length ? (
          <Card className="p-4 text-sm text-muted-foreground">Поки недостатньо оглядів без проблем для рейтингу.</Card>
        ) : (
          <div className="space-y-2">
            {data.top.map((s, idx) => (
              <Card key={s.hive.id} className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-honey/30 flex items-center justify-center font-bold">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{hiveTitle(s)}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.hive.pointName ?? "—"}{s.hive.queen_year ? ` · матка ${s.hive.queen_year}` : ""} · {s.inspections} огл.
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold"><Star className="w-4 h-4 fill-honey text-honey" />{s.score}</div>
                </div>
                {!!s.badges.length && (
                  <div className="flex flex-wrap gap-1">
                    {s.badges.map((b) => <span key={b} className="text-xs rounded-full bg-accent px-2 py-0.5">{b}</span>)}
                  </div>
                )}
                <Button asChild size="sm" className="w-full">
                  <Link to="/queens/new" search={{ mother: hiveTitle(s) }}>Взяти на вивід маток</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-1"><AlertTriangle className="w-5 h-5 text-destructive" /> Антирейтинг ({data.anti.length})</h2>
        <p className="text-xs text-muted-foreground mb-3">Усі сім'ї з проблемами — кандидати на заміну матки. Найпроблемніші зверху.</p>
        {!data.anti.length ? (
          <Card className="p-4 text-sm text-muted-foreground">Проблемних сімей не виявлено.</Card>
        ) : (
          <div className="space-y-2">
            {data.anti.map((s) => (
              <Card key={s.hive.id} className="p-3 border-destructive/40">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{hiveTitle(s)}</div>
                    <div className="text-xs text-muted-foreground">{s.hive.pointName ?? "—"} · бал {s.score}</div>
                  </div>
                  {s.hive.point_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/points/$pointId" params={{ pointId: s.hive.point_id }}>Відкрити</Link>
                    </Button>
                  )}
                </div>
                <ul className="mt-2 text-sm space-y-0.5">
                  {s.problems.map((p) => <li key={p.text} className="text-destructive">• {p.text}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold">Загальна статистика</div>
        <div className="text-sm text-muted-foreground">
          Точків: {data.points} · Оглядів за сезон: {data.inspections} · Без оглядів: {data.noData}
        </div>
        <LimitBar label="Бджолосім’ї" value={data.hives} limit={FREE_LIMIT_HIVES} />
        <LimitBar label="Нуклеуси" value={data.nuclei} limit={FREE_LIMIT_NUCLEI} />
      </Card>
    </div>
  );
}
