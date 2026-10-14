// Племінний індекс і антирейтинг з історії оглядів.
const SWARM: Record<string, number> = { none: 100, cups_few: 80, cups_many: 45, queen_cells: 0, swarm_state: 0 };
const HONEY: Record<string, number> = { high: 100, medium: 75, low: 40, none: 10 };
const BROOD: Record<string, number> = { strong: 100, medium: 75, weak: 35, none: 0 };
const CALM: Record<string, number> = { very_calm: 100, calm: 85, medium: 55, aggressive: 15, very_aggressive: 0 };

function avg(list: any[], key: string, map: Record<string, number>) {
  const v = list.map((i) => map[i[key]]).filter((x) => x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export type HiveScore = {
  hive: any;
  score: number;
  inspections: number;
  swarmed: boolean;
  badges: string[];
  problems: { text: string; weight: number }[];
  severity: number;
};

export function scoreHive(hive: any, ins: any[]): HiveScore {
  const parts: [number | null, number][] = [
    [avg(ins, "swarming", SWARM), 0.35],
    [avg(ins, "honey_level", HONEY), 0.25],
    [avg(ins, "brood_level", BROOD), 0.2],
    [avg(ins, "aggression", CALM), 0.2],
  ];
  const known = parts.filter(([v]) => v !== null) as [number, number][];
  const w = known.reduce((a, [, k]) => a + k, 0);
  const score = w ? Math.round(known.reduce((a, [v, k]) => a + v * k, 0) / w) : 0;
  const swarmed = ins.some((i) => i.swarming === "queen_cells" || i.swarming === "swarm_state");
  const badges: string[] = [];
  if (!swarmed && ins.some((i) => i.swarming)) badges.push("Не роїлася");
  if ((parts[1][0] ?? 0) >= 75) badges.push("Високий медозбір");
  if ((parts[3][0] ?? 0) >= 80) badges.push("Миролюбна");
  if ((parts[2][0] ?? 0) >= 80) badges.push("Сильний розплід");

  const problems: { text: string; weight: number }[] = [];
  const last = ins[0];
  const aggr = ins.filter((i) => i.aggression === "aggressive" || i.aggression === "very_aggressive").length;
  if (aggr) problems.push({ text: `Агресивна (${aggr} огл.)`, weight: 30 + aggr * 5 });
  const sw = ins.filter((i) => i.swarming === "queen_cells" || i.swarming === "swarm_state").length;
  if (sw) problems.push({ text: `Ройовий стан / маточники (${sw} огл.)`, weight: 35 + sw * 5 });
  if (last?.queen_status === "absent") problems.push({ text: "Немає матки (останній огляд)", weight: 50 });
  if (last?.brood_level === "none" || last?.brood_level === "weak")
    problems.push({ text: last.brood_level === "none" ? "Без розплоду" : "Слабкий розплід", weight: last.brood_level === "none" ? 40 : 20 });
  if (ins.length >= 2 && (parts[1][0] ?? 100) <= 40) problems.push({ text: "Низький медозбір", weight: 15 });
  const severity = problems.reduce((a, p) => a + p.weight, 0);
  return { hive, score, inspections: ins.length, swarmed, badges, problems, severity };
}
