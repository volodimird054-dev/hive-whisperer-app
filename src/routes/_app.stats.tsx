import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin, Boxes, Egg, ClipboardList, Users } from "lucide-react";

export const Route = createFileRoute("/_app/stats")({
  component: StatsPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-honey/30 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [points, hives, inspections, members] = await Promise.all([
        (supabase.from as any)("apiary_points").select("id, kind"),
        supabase.from("hives").select("id, point_id"),
        supabase.from("inspections").select("id, user_id, inspected_at"),
        (supabase.from as any)("apiary_members").select("user_id"),
      ]);
      const pts = (points.data ?? []) as any[];
      const hvs = (hives.data ?? []) as any[];
      const ins = (inspections.data ?? []) as any[];
      const since = Date.now() - 30 * 86400 * 1000;
      const activeUsers = new Set(
        ins.filter((i) => new Date(i.inspected_at).getTime() >= since).map((i) => i.user_id),
      );
      // вулики vs нуклеуси — за kind точки
      const nucleiPointIds = new Set(pts.filter((p) => p.kind === "nuclei").map((p) => p.id));
      const nucleiCount = hvs.filter((h) => h.point_id && nucleiPointIds.has(h.point_id)).length;
      const hiveCount = hvs.length - nucleiCount;
      return {
        points: pts.length,
        hives: hiveCount,
        nuclei: nucleiCount,
        inspections: ins.length,
        members: (members.data ?? []).length,
        active30: activeUsers.size,
      };
    },
  });

  if (isLoading || !data) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Статистика</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={MapPin} label="Точки" value={data.points} />
        <StatCard icon={Boxes} label="Вулики" value={data.hives} />
        <StatCard icon={Egg} label="Нуклеуси" value={data.nuclei} />
        <StatCard icon={ClipboardList} label="Огляди" value={data.inspections} />
        <StatCard icon={Users} label="Учасники" value={data.members} />
        <StatCard icon={Users} label="Активні (30 днів)" value={data.active30} />
      </div>
    </div>
  );
}
