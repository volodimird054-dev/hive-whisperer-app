import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, BellOff, Wind, Droplets, Gauge, Sun, Sunrise, Sunset, CloudRain, Thermometer } from "lucide-react";
import {
  fetchWeather, weatherCodeInfo, windDirLabel, rateDay, rateCurrent, ratingInfo,
  buildAdvice, buildAlerts, dayOfWeekShort, formatHM,
} from "@/lib/weather";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = { lat: number; lng: number; pointId: string };

const ALERT_STORAGE_KEY = "point-weather-alerts";

function readEnabled(pointId: string): boolean {
  try {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(pointId);
  } catch { return false; }
}
function writeEnabled(pointId: string, on: boolean) {
  try {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set(list);
    if (on) set.add(pointId); else set.delete(pointId);
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function PointWeather({ lat, lng, pointId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: () => fetchWeather(lat, lng),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [notifOn, setNotifOn] = useState(false);
  useEffect(() => { setNotifOn(readEnabled(pointId)); }, [pointId]);

  // Fire notifications when alerts are present & user opted in
  useEffect(() => {
    if (!data || !notifOn) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const alerts = buildAlerts(data);
    const shownKey = `point-weather-shown-${pointId}-${new Date().toDateString()}`;
    let shown: string[] = [];
    try { shown = JSON.parse(sessionStorage.getItem(shownKey) ?? "[]"); } catch { /* ignore */ }
    alerts.forEach((a) => {
      if (shown.includes(a.key)) return;
      new Notification(a.title, { body: a.body, icon: "/favicon.ico" });
      shown.push(a.key);
    });
    try { sessionStorage.setItem(shownKey, JSON.stringify(shown)); } catch { /* ignore */ }
  }, [data, notifOn, pointId]);

  async function toggleNotif() {
    if (notifOn) {
      writeEnabled(pointId, false);
      setNotifOn(false);
      toast.success("Сповіщення вимкнено");
      return;
    }
    if (!("Notification" in window)) {
      toast.error("Браузер не підтримує сповіщення");
      return;
    }
    const perm = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Дозвіл на сповіщення не надано");
      return;
    }
    writeEnabled(pointId, true);
    setNotifOn(true);
    toast.success("Сповіщення увімкнено");
  }

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Завантаження погоди…
      </Card>
    );
  }
  if (error || !data) {
    return <Card className="p-6 text-sm text-muted-foreground">Не вдалося завантажити погоду.</Card>;
  }

  const cur = data.current;
  const today = data.daily[0];
  const curInfo = weatherCodeInfo(cur.weather_code);
  const curRating = ratingInfo(rateCurrent(cur, today?.precipitation_sum ?? 0));
  const advice = buildAdvice(data);
  const alerts = buildAlerts(data);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Погода</h2>
        <Button size="sm" variant="outline" onClick={toggleNotif}>
          {notifOn ? <><BellOff className="w-4 h-4 mr-1" /> Сповіщення</> : <><Bell className="w-4 h-4 mr-1" /> Сповіщення</>}
        </Button>
      </div>

      {/* Current */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-5xl leading-none">{curInfo.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <div className="text-3xl font-bold">{Math.round(cur.temperature_2m)}°</div>
              <div className="text-sm text-muted-foreground">відч. {Math.round(cur.apparent_temperature)}°</div>
            </div>
            <div className="text-sm text-muted-foreground">{curInfo.label}</div>
            <Badge className={`mt-1 ${curRating.color}`} variant="secondary">
              {curRating.emoji} {curRating.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-sm">
          <Stat icon={<Wind className="w-4 h-4" />} label="Вітер" value={`${cur.wind_speed_10m.toFixed(1)} м/с ${windDirLabel(cur.wind_direction_10m)}`} />
          <Stat icon={<Droplets className="w-4 h-4" />} label="Вологість" value={`${cur.relative_humidity_2m}%`} />
          <Stat icon={<CloudRain className="w-4 h-4" />} label="Опади" value={`${cur.precipitation.toFixed(1)} мм`} />
          <Stat icon={<Gauge className="w-4 h-4" />} label="Тиск" value={`${Math.round(cur.surface_pressure)} гПа`} />
          <Stat icon={<CloudRain className="w-4 h-4" />} label="Дощ 24г" value={`${data.precip_prob_next_24h_max}%`} />
          <Stat icon={<Sun className="w-4 h-4" />} label="Хмарність" value={`${cur.cloud_cover}%`} />
          {today && <Stat icon={<Sunrise className="w-4 h-4" />} label="Схід" value={formatHM(today.sunrise)} />}
          {today && <Stat icon={<Sunset className="w-4 h-4" />} label="Захід" value={formatHM(today.sunset)} />}
          {today && <Stat icon={<Thermometer className="w-4 h-4" />} label="УФ" value={today.uv_index_max.toFixed(1)} />}
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-3 border-orange-500/40 bg-orange-500/5">
          <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">УВАГА</div>
          <ul className="space-y-1 text-sm">
            {alerts.map(a => (
              <li key={a.key}><span className="font-medium">{a.title}.</span> <span className="text-muted-foreground">{a.body}</span></li>
            ))}
          </ul>
        </Card>
      )}

      {/* 7-day forecast */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Прогноз на 7 днів</div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {data.daily.map(d => {
            const info = weatherCodeInfo(d.weather_code);
            const r = ratingInfo(rateDay(d));
            return (
              <Card key={d.date} className="p-3 min-w-[130px] flex-shrink-0">
                <div className="text-xs font-medium">{dayOfWeekShort(d.date)}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</div>
                <div className="text-3xl my-1">{info.emoji}</div>
                <div className="text-sm font-semibold">{Math.round(d.tmax)}° <span className="text-muted-foreground font-normal">/ {Math.round(d.tmin)}°</span></div>
                <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                  <div>💧 {d.precipitation_probability_max}% · {d.precipitation_sum.toFixed(1)}мм</div>
                  <div>🌬 {d.wind_speed_max.toFixed(0)}/{d.wind_gusts_max.toFixed(0)} м/с</div>
                  <div>💦 {Math.round(d.humidity_mean)}%</div>
                </div>
                <Badge className={`mt-2 text-[10px] px-1.5 py-0 ${r.color}`} variant="secondary">
                  {r.emoji} {r.label}
                </Badge>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Advice */}
      {advice.length > 0 && (
        <Card className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Пасічницькі поради</div>
          <ul className="space-y-1 text-sm list-disc pl-5">
            {advice.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground leading-none">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
