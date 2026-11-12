import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Droplets, Wind, Flower2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchWeather, geocodeAddress, weatherCodeInfo, rateCurrent, dayOfWeekShort } from "@/lib/weather";

type Pt = { id: string; name: string; lat: number | null; lng: number | null; address: string | null; location: string | null };

const RATING_TEXT = {
  great: { text: "сприятливі умови для льоту бджіл", flow: "Медозбір — активний" },
  good: { text: "нормальні умови для льоту", flow: "Медозбір — помірний" },
  poor: { text: "слабкий літ бджіл", flow: "Медозбір — слабкий" },
  bad: { text: "бджоли сидять у вуликах", flow: "Медозбору немає" },
} as const;

export function HomeWeather() {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const { data: points = [] } = useQuery({
    queryKey: ["home-weather-points"],
    queryFn: async () => {
      const { data } = await supabase
        .from("apiary_points")
        .select("id,name,lat,lng,address,location")
        .is("removed_at", null)
        .order("created_at");
      return (data ?? []) as Pt[];
    },
  });
  const p = points.length ? points[idx % points.length] : null;

  const { data: w, isLoading } = useQuery({
    queryKey: ["home-weather", p?.id],
    enabled: !!p,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let lat = p!.lat, lng = p!.lng;
      if (lat == null || lng == null) {
        const g = await geocodeAddress(p!.address || p!.location || p!.name);
        if (!g) return null;
        lat = g.lat; lng = g.lng;
      }
      return fetchWeather(lat, lng);
    },
  });

  if (!points.length) return null;
  const cur = w?.current;
  const info = cur ? weatherCodeInfo(cur.weather_code) : null;
  const r = cur ? RATING_TEXT[rateCurrent(cur, w!.daily[0]?.precipitation_sum ?? 0)] : null;

  return (
    <div className="space-y-2">
    <button
      type="button"
      onClick={() => setIdx((i) => i + 1)}
      className="bee-tile relative flex w-full items-stretch gap-3 overflow-hidden p-4 text-left"
      aria-label="Наступна точка"
    >
      <div className="min-w-0 flex-[1.2]">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-honey" />
          <span className="truncate">Сьогодні · {p!.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-3xl font-extrabold">
            {cur ? `${cur.temperature_2m > 0 ? "+" : ""}${Math.round(cur.temperature_2m)}°C` : isLoading ? "…" : "—"}
          </span>
          {info && <span className="text-2xl drop-shadow-[0_0_8px_var(--honey)]">{info.emoji}</span>}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {info && r ? `${info.label}, ${r.text}` : isLoading ? "Завантаження…" : "Немає даних погоди"}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 border-l border-border pl-3 text-[11px]">
        <span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-honey" />Вологість {cur ? `${Math.round(cur.relative_humidity_2m)}%` : "—"}</span>
        <span className="flex items-center gap-1.5"><Wind className="h-3.5 w-3.5 text-honey" />Вітер {cur ? `${Math.round(cur.wind_speed_10m)} м/с` : "—"}</span>
        <span className="flex items-center gap-1.5"><Flower2 className="h-3.5 w-3.5 text-honey" />{r?.flow ?? "—"}</span>
      </div>
      <ChevronRight className="h-5 w-5 self-center text-honey" />
      {points.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
          {points.map((x, i) => (
            <span key={x.id} className={`h-1 w-1 rounded-full ${i === idx % points.length ? "bg-honey" : "bg-muted-foreground/40"}`} />
          ))}
        </div>
      )}
    </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bee-tile flex w-full items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-honey"
        aria-expanded={open}
      >
        Прогноз на 7 днів
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="bee-tile divide-y divide-border p-2">
          {(w?.daily ?? []).slice(0, 7).map((d, i) => {
            const di = weatherCodeInfo(d.weather_code);
            return (
              <div key={d.date} className="flex items-center gap-3 px-2 py-2 text-sm">
                <span className="w-16 text-muted-foreground">
                  {i === 0 ? "Сьогодні" : `${dayOfWeekShort(d.date)} ${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`}
                </span>
                <span className="text-lg">{di.emoji}</span>
                <span className="flex-1 truncate text-xs text-muted-foreground">{di.label}</span>
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Droplets className="h-3 w-3 text-honey" />{Math.round(d.precipitation_probability_max)}%</span>
                <span className="w-16 text-right font-semibold">{Math.round(d.tmax)}° <span className="text-muted-foreground">{Math.round(d.tmin)}°</span></span>
              </div>
            );
          })}
          {!w?.daily?.length && <p className="p-2 text-xs text-muted-foreground">Немає даних прогнозу</p>}
        </div>
      )}
    </div>
  );
}
