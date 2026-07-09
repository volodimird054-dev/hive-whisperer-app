// Open-Meteo integration (no API key needed)

export type CurrentWeather = {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  surface_pressure: number;
  weather_code: number;
};

export type DailyDay = {
  date: string;
  weather_code: number;
  tmin: number;
  tmax: number;
  precipitation_sum: number;
  precipitation_probability_max: number;
  wind_speed_max: number;
  wind_gusts_max: number;
  humidity_mean: number;
  uv_index_max: number;
  sunrise: string;
  sunset: string;
};

export type WeatherData = {
  current: CurrentWeather;
  daily: DailyDay[];
  hourly: { time: string[]; precipitation_probability: number[] };
  precip_prob_next_24h_max: number;
};

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset,relative_humidity_2m_mean",
  );
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("wind_speed_unit", "ms");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Не вдалося отримати погоду");
  const j = await res.json();

  const daily: DailyDay[] = (j.daily?.time ?? []).map((d: string, i: number) => ({
    date: d,
    weather_code: j.daily.weather_code[i],
    tmin: j.daily.temperature_2m_min[i],
    tmax: j.daily.temperature_2m_max[i],
    precipitation_sum: j.daily.precipitation_sum[i],
    precipitation_probability_max: j.daily.precipitation_probability_max?.[i] ?? 0,
    wind_speed_max: j.daily.wind_speed_10m_max[i],
    wind_gusts_max: j.daily.wind_gusts_10m_max[i],
    humidity_mean: j.daily.relative_humidity_2m_mean?.[i] ?? 0,
    uv_index_max: j.daily.uv_index_max?.[i] ?? 0,
    sunrise: j.daily.sunrise[i],
    sunset: j.daily.sunset[i],
  }));

  // max precip probability in next 24h
  const now = Date.now();
  const in24 = now + 24 * 3600 * 1000;
  const hours: string[] = j.hourly?.time ?? [];
  const probs: number[] = j.hourly?.precipitation_probability ?? [];
  let maxProb = 0;
  hours.forEach((t, i) => {
    const ts = new Date(t).getTime();
    if (ts >= now && ts <= in24) maxProb = Math.max(maxProb, probs[i] ?? 0);
  });

  return {
    current: j.current,
    daily,
    hourly: { time: hours, precipitation_probability: probs },
    precip_prob_next_24h_max: maxProb,
  };
}

// WMO weather code → emoji + label
export function weatherCodeInfo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Ясно" };
  if (code === 1) return { emoji: "🌤️", label: "Переважно ясно" };
  if (code === 2) return { emoji: "⛅", label: "Мінлива хмарність" };
  if (code === 3) return { emoji: "☁️", label: "Хмарно" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Туман" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Мряка" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Дощ" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "Сніг" };
  if (code >= 80 && code <= 82) return { emoji: "🌦️", label: "Зливи" };
  if (code === 85 || code === 86) return { emoji: "❄️", label: "Снігові зливи" };
  if (code >= 95 && code <= 99) return { emoji: "⛈️", label: "Гроза" };
  return { emoji: "🌡️", label: "—" };
}

export function windDirLabel(deg: number): string {
  const dirs = ["Пн", "Пн-Сх", "Сх", "Пд-Сх", "Пд", "Пд-Зх", "Зх", "Пн-Зх"];
  return dirs[Math.round(deg / 45) % 8];
}

export type BeekeepingRating = "great" | "good" | "poor" | "bad";

export function ratingInfo(r: BeekeepingRating) {
  switch (r) {
    case "great": return { emoji: "🟢", label: "Дуже сприятливий", color: "bg-green-500/15 text-green-700 dark:text-green-400" };
    case "good": return { emoji: "🟡", label: "Сприятливий", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" };
    case "poor": return { emoji: "🟠", label: "Небажаний", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" };
    case "bad": return { emoji: "🔴", label: "Не рекомендується", color: "bg-red-500/15 text-red-700 dark:text-red-400" };
  }
}

export function rateDay(d: DailyDay): BeekeepingRating {
  const isStorm = d.weather_code >= 95 && d.weather_code <= 99;
  const tmean = (d.tmin + d.tmax) / 2;
  if (isStorm || d.wind_speed_max > 12 || d.precipitation_sum > 10 || d.tmax < 5 || d.tmax > 35) return "bad";
  if (tmean < 10 || tmean > 32 || d.wind_speed_max > 8 || d.precipitation_sum > 2) return "poor";
  if (tmean >= 15 && tmean <= 28 && d.wind_speed_max < 5 && d.precipitation_sum === 0) return "great";
  return "good";
}

export function rateCurrent(w: CurrentWeather, todayPrecip: number): BeekeepingRating {
  const isStorm = w.weather_code >= 95 && w.weather_code <= 99;
  if (isStorm || w.wind_speed_10m > 12 || todayPrecip > 10 || w.temperature_2m < 5 || w.temperature_2m > 35) return "bad";
  if (w.temperature_2m < 10 || w.temperature_2m > 32 || w.wind_speed_10m > 8 || todayPrecip > 2) return "poor";
  if (w.temperature_2m >= 15 && w.temperature_2m <= 28 && w.wind_speed_10m < 5 && w.precipitation === 0) return "great";
  return "good";
}

export function buildAdvice(data: WeatherData): string[] {
  const tips: string[] = [];
  const cur = data.current;
  const today = data.daily[0];
  const tomorrow = data.daily[1];

  if (cur.temperature_2m >= 15 && cur.temperature_2m <= 28 && cur.wind_speed_10m < 5 && cur.precipitation === 0) {
    tips.push("Хороший день для огляду сімей.");
  }
  if (today && today.tmax >= 22 && today.tmax <= 30 && today.precipitation_sum === 0 && today.wind_speed_max < 6) {
    tips.push("Хороший день для відкачки меду.");
  }
  if (cur.wind_speed_10m > 10 || (today && today.wind_speed_max > 10)) {
    tips.push("Очікується сильний вітер — уникайте огляду з відкритим гніздом.");
  }
  if (tomorrow && (tomorrow.precipitation_sum > 5 || tomorrow.precipitation_probability_max > 70)) {
    tips.push("Не рекомендується перевозити пасіку — завтра прогнозується дощ.");
  }
  // rain later today
  const now = Date.now();
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const hours = data.hourly.time;
  const probs = data.hourly.precipitation_probability;
  let laterRain = 0;
  hours.forEach((t, i) => {
    const ts = new Date(t).getTime();
    if (ts >= now && ts <= endOfDay.getTime()) laterRain = Math.max(laterRain, probs[i] ?? 0);
  });
  if (laterRain >= 60 && cur.precipitation === 0) tips.push("Очікується дощ пізніше сьогодні.");
  if (cur.temperature_2m > 35 || (today && today.tmax > 35)) {
    tips.push("Спека понад +35°C — підготуйте напувалки для бджіл.");
  }
  if (tomorrow && (today && today.tmax - tomorrow.tmax > 10)) {
    tips.push("Очікується різке похолодання — забезпечте утеплення.");
  }
  if (today && today.weather_code >= 95) tips.push("Прогнозується гроза — не відкривайте вулики.");
  if (today && today.tmin < 0) tips.push("Заморозки — перевірте утеплення сімей.");
  return tips;
}

export type WeatherAlert = {
  key: string;
  title: string;
  body: string;
};

export function buildAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const cur = data.current;
  const today = data.daily[0];
  const tomorrow = data.daily[1];
  if (tomorrow && (tomorrow.precipitation_sum > 5 || tomorrow.precipitation_probability_max > 70)) {
    alerts.push({ key: "rain-tomorrow", title: "Завтра сильний дощ", body: `Опади: ${tomorrow.precipitation_sum.toFixed(1)} мм` });
  }
  if (data.precip_prob_next_24h_max >= 70 && cur.precipitation === 0) {
    alerts.push({ key: "rain-soon", title: "Скоро почнеться дощ", body: `Ймовірність: ${data.precip_prob_next_24h_max}%` });
  }
  if (cur.temperature_2m > 35 || (today && today.tmax > 35)) {
    alerts.push({ key: "heat", title: "Спека понад +35°C", body: "Забезпечте напувалки для бджіл" });
  }
  if (cur.wind_speed_10m > 15 || (today && today.wind_gusts_max > 15)) {
    alerts.push({ key: "wind", title: "Пориви вітру понад 15 м/с", body: "Уникайте огляду сімей" });
  }
  if (today && today.tmin < 0) {
    alerts.push({ key: "frost", title: "Заморозки", body: `Мінімум: ${today.tmin.toFixed(0)}°C` });
  }
  if ((today && today.weather_code >= 95) || (cur.weather_code >= 95 && cur.weather_code <= 99)) {
    alerts.push({ key: "storm", title: "Гроза", body: "Не відкривайте вулики" });
  }
  return alerts;
}

export function dayOfWeekShort(d: string): string {
  const dt = new Date(d);
  return ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][dt.getDay()];
}

export function formatHM(iso: string): string {
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}
