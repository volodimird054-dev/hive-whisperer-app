import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Безкоштовний тариф: до 50 бджолосімей (вуликів) і до 50 нуклеусів. */
export const FREE_LIMIT_HIVES = 50;
export const FREE_LIMIT_NUCLEI = 50;

export type PlanUsage = {
  hives: number;
  nuclei: number;
  hivesLeft: number;
  nucleiLeft: number;
};

export async function fetchPlanUsage(): Promise<PlanUsage> {
  const [pointsRes, hivesRes] = await Promise.all([
    (supabase.from as any)("apiary_points").select("id, kind"),
    (supabase.from("hives") as any).select("id, point_id").is("archived_at", null),
  ]);
  const points = (pointsRes.data ?? []) as Array<{ id: string; kind: string }>;
  const hives = (hivesRes.data ?? []) as Array<{ point_id: string | null }>;
  const nucleiPoints = new Set(points.filter((p) => p.kind === "nuclei").map((p) => p.id));
  const nuclei = hives.filter((h) => h.point_id && nucleiPoints.has(h.point_id)).length;
  const families = hives.length - nuclei;
  return {
    hives: families,
    nuclei,
    hivesLeft: Math.max(0, FREE_LIMIT_HIVES - families),
    nucleiLeft: Math.max(0, FREE_LIMIT_NUCLEI - nuclei),
  };
}

export function usePlanUsage() {
  return useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage });
}

/**
 * Перевіряє, чи можна додати `count` карток у межах безкоштовного тарифу.
 * Повертає текст помилки або null, якщо все гаразд.
 */
export async function checkFreeLimit(isNuclei: boolean, count: number): Promise<string | null> {
  const usage = await fetchPlanUsage();
  const left = isNuclei ? usage.nucleiLeft : usage.hivesLeft;
  const limit = isNuclei ? FREE_LIMIT_NUCLEI : FREE_LIMIT_HIVES;
  const what = isNuclei ? "нуклеусів" : "бджолосімей";
  if (left <= 0) {
    return `Безкоштовна версія: ліміт ${limit} ${what} вичерпано. Заархівуйте зайві або оновіть тариф.`;
  }
  if (count > left) {
    return `Безкоштовна версія: залишилось ${left} ${what} із ${limit}. Зменште кількість.`;
  }
  return null;
}
