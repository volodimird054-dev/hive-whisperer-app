План великого оновлення модуля «Точки». Розбитий на послідовні кроки — після твого підтвердження виконаю все за один прохід.

## 1. База даних (одна міграція)

Розширюю таблицю `apiary_points` новими полями (усі опційні, старі точки продовжать працювати):

- `stationary` (bool, default true) — стаціонарний / кочовий
- `description` (text)
- `photo_path` (text) — шлях у Storage
- `honey_base` (text) — медоносна база
- `hives_count_manual` (int) — заявлена кількість вуликів (авто-підрахунок лишається)
- `water_source` (text)
- `car_access` (bool)
- `has_electricity` (bool)
- `has_security` (bool)
- `land_owner` (text)
- `owner_phone` (text)
- `installed_at` (date)
- `removed_at` (date)
- `status` (text: 'active' | 'inactive', default 'active')

Нова таблиця `apiary_point_locations` для історії кочівель:
`id, point_id (FK), address, lat, lng, moved_at (default now), notes`.
Тригер: при зміні координат/адреси в `apiary_points` автоматично додається запис.

Storage bucket `point-photos` (публічний для читання, RLS на запис — тільки власник пасіки).

Усі GRANT + RLS політики — власник/учасники пасіки бачать і редагують.

## 2. Редагування точка

На картці точка (`/points/$pointId`) додаю кнопку «Редагувати» → відкриває Dialog з формою всіх нових полів. Після збереження — `queryClient.invalidateQueries`, без перезавантаження.

## 3. Фото точка

- Кнопка «Завантажити фото» у формі редагування.
- Аплоуд у Storage → `photo_path`.
- На картці точка в списку `/points` — якщо є фото, показуємо його замість іконки (квадрат зліва).
- На сторінці точка — зверху великий банер з фото, під ним існуючий список вуликів.

## 4. Кочівля

У формі редагування — секція «Розташування»: адреса, GPS (з кнопкою «Моя геолокація» як у створенні), кнопка «Вибрати на карті» (Google Maps picker через існуючий конектор Google Maps).

Зміна координат/адреси → автоматично пише запис у `apiary_point_locations` (тригер). Показую згорнутий блок «Історія кочівель» знизу сторінки.

## 5. Карта

Дві кнопки на сторінці точка:
- «Показати на карті» → `https://www.google.com/maps/search/?api=1&query=lat,lng`
- «Прокласти маршрут» → `https://www.google.com/maps/dir/?api=1&destination=lat,lng`

Обидві відкриваються в новій вкладці, працюють з мобільним Google Maps.

## 6. Погода (Open-Meteo)

Окремий блок «Погода» на сторінці точка (використовує `lat/lng`). Дані тягну прямо з клієнта — Open-Meteo не потребує ключа й підтримує CORS.

Endpoint:
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lng}
  &current=temperature_2m,apparent_temperature,relative_humidity_2m,
           precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,
           surface_pressure,weather_code
  &daily=weather_code,temperature_2m_max,temperature_2m_min,
         precipitation_sum,precipitation_probability_max,
         wind_speed_10m_max,wind_gusts_10m_max,
         uv_index_max,sunrise,sunset,relative_humidity_2m_mean
  &hourly=precipitation_probability
  &timezone=auto&forecast_days=7
```

Кешую через TanStack Query (`staleTime: 15 хв`).

Блоки:
- **Поточна погода**: температура, «відчувається як», хмарність, опади, вітер (швидкість + напрямок стрілкою), вологість, тиск, ймовірність дощу, схід/захід сонця, УФ-індекс.
- **Прогноз на 7 днів**: горизонтальний скрол карток — день тижня, іконка (мапа `weather_code` → emoji/lucide), min/max °C, % опадів, мм опадів, вітер + пориви, вологість.

## 7. Пасічницький аналіз

Для кожного дня рахую оцінку за температурою, вітром, опадами, грозою, вологістю:

```
🟢 Дуже сприятливий:  15..28°C, вітер <5 м/с, опади=0, немає грози
🟡 Сприятливий:       10..32°C, вітер <8, опади <2мм
🟠 Небажаний:          <10 або >32, вітер 8..12, опади 2..10мм
🔴 Не рекомендується: гроза, вітер >12, опади >10мм, <5°C або >35°C
```

Показую бейдж на кожній картці дня + короткі поради:
- Тепло + слабкий вітер → «Хороший день для огляду сімей»
- Спека >30 + сонячно → «Хороший день для відкачки меду»
- Вітер >10 → «Очікується сильний вітер»
- Опади завтра >5мм → «Не рекомендується перевозити пасіку»
- Дощ після обіду → «Очікується дощ після обіду»
- >35°C → «Підготуйте напувалки через спеку»
- Різкий перепад темп (>10°C за 24г) → «Очікується різке похолодання»

## 8. Push-сповіщення

Реалізую **як опціональну кнопку «Увімкнути сповіщення про погоду»** на сторінці точка. Використаю Web Notifications API + перевірка прогнозу при відкритті сторінки (тригери: дощ завтра, спека >35, вітер >15, заморозки, гроза).

Повноцінні фонові push через Service Worker + VAPID вимагають окремої інфраструктури — якщо потрібно, зроблю окремим кроком після цього оновлення. Поки — foreground-нотифікації.

## 9. Технічні деталі

- Open-Meteo — без ключа, безкоштовно.
- Google Maps посилання — прості URL, без JS API (не потребує ключа для відкриття).
- Для «Вибрати на карті» використаю існуючий конектор Google Maps через `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` — якщо конектор не підключений, кнопка ховається (fallback: тільки ручне введення GPS).
- Дизайн — той самий стиль (Card, honey-акценти, Lucide icons, мобільно-first).
- Усі мутації → `invalidateQueries`, без перезавантаження.

## Файли

**Створюю:**
- `supabase/migrations/..._points_extended.sql` — поля, `apiary_point_locations`, тригер історії, bucket, політики
- `src/components/point-edit-dialog.tsx` — форма редагування
- `src/components/point-weather.tsx` — блок погоди + прогноз + аналіз
- `src/components/point-photo-upload.tsx` — аплоуд фото
- `src/lib/weather.ts` — типи + fetch + оцінка дня + генератор порад

**Редагую:**
- `src/routes/_app.points.index.tsx` — фото на картці
- `src/routes/_app.points.$pointId.tsx` — кнопка редагування, банер фото, кнопки карти, блок погоди, історія кочівель
- `src/integrations/supabase/types.ts` — регенерується після міграції

Підтвердь план — і я одразу починаю з міграції.
