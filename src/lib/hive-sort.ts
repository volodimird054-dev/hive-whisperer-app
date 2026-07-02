// Числове сортування вуликів за номером (з підтримкою літер).
// 1, 2, ..., 10 замість 1, 10, 11, ..., 2, 20.
export function compareHiveNumbers(a: string | number, b: string | number) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  const na = parseInt(sa, 10);
  const nb = parseInt(sb, 10);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum && na !== nb) return na - nb;
  if (aNum && !bNum) return -1;
  if (!aNum && bNum) return 1;
  return sa.localeCompare(sb, "uk", { numeric: true, sensitivity: "base" });
}

export function sortHives<T extends { number: string | number }>(hives: T[] | undefined | null): T[] {
  if (!hives) return [];
  return [...hives].sort((a, b) => compareHiveNumbers(a.number, b.number));
}

export function filterHives<T extends { number: string | number; breed?: string | null; queen_year?: number | null }>(
  hives: T[] | undefined | null,
  query: string,
): T[] {
  if (!hives) return [];
  const q = query.trim().toLowerCase();
  if (!q) return hives;
  return hives.filter((h) => {
    const num = String(h.number ?? "").toLowerCase();
    const breed = (h.breed ?? "").toLowerCase();
    const year = h.queen_year != null ? String(h.queen_year) : "";
    return num.includes(q) || breed.includes(q) || year.includes(q);
  });
}
