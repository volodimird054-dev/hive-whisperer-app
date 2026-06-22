
# План оновлення проєкту "Пасічник"

## 1. Поточна архітектура (як є зараз)

- **Frontend**: React 19 + TanStack Start v1 (TanStack Router з file-based routing у `src/routes/`), Vite 7, Tailwind v4 (через `src/styles.css`), shadcn/ui компоненти, TanStack Query для даних.
- **Backend**: TanStack Start server functions (`createServerFn`) + Lovable Cloud (керований Supabase). Edge-runtime (Cloudflare Workers).
- **База даних**: Postgres у Lovable Cloud. Таблиці: `apiaries`, `apiary_members`, `apiary_points`, `hives`, `inspections`, `feedings`, `harvests`, `treatments`, `queen_batches`, `calendar_events`, `listings`, `chat_messages`, `profiles`. RLS включений.
- **Авторизація**: Lovable Cloud Auth (email + Google OAuth через брокер). Сесія в `localStorage`. Захищені маршрути під `_authenticated/`.
- **Зберігання файлів**: ще не використовується (бакетів немає). При потребі — додамо бакет.
- **QR модуль**: `qrcode` (canvas) + `jspdf` для PDF, у `src/components/hive-qr.tsx`. QR будується з URL `/h/<hiveId>` — тобто вже стабільний, не змінюється для вулика.
- **Голос**: Web Speech API (browser SpeechRecognition) у `src/components/voice-fab.tsx`. AI Gateway використовується для парсингу команд. Окремий серверний `voice.functions.ts`.

## 2. Що змінюємо (по пунктах ТЗ)

### 2. QR з номером у центрі
- Файл: `src/components/hive-qr.tsx`.
- Залишаємо поточний URL і розмір. Підвищуємо `errorCorrectionLevel` до `H`, після малювання QR на canvas малюємо білий круг у центрі (~22% ширини) з чорним номером вулика. Те саме при друку та в PDF (через off-screen canvas).
- QR не перевипускається: вже базується на `hive.id` — нічого додатково робити не треба.

### 3. Голос — українська + підтвердження
- `voice-fab.tsx`: жорстко `lang = "uk-UA"`, `interimResults = true`, додаємо словник підказок (через `SpeechGrammarList` де підтримується) для термінів: матка, червить, рамки, розплід, корпус, магазин, нуклеус, підгодівля, лікування.
- Після зупинки запису — показуємо діалог із розпізнаним текстом, дозволяємо відредагувати та лише потім надсилаємо в обробник/зберігаємо.

### 4. Ролі (owner / worker)
- БД: вже є `apiary_members.role`. Додаємо enum-значення `worker` (зараз вільний text). Helper `is_apiary_owner` вже існує; додамо `can_edit_apiary(apiary, user)` = owner OR worker (для оглядів/журналу), а delete-політики залишаємо лише owner.
- Міграція: оновити RLS на `apiaries`, `apiary_points`, `hives`, `inspections`, `apiary_members` так, щоб:
  - worker: SELECT + INSERT inspections/feedings/harvests/treatments;
  - owner: усе + DELETE + керування members.
- UI: у сторінці пасіки додати селектор ролі при додаванні учасника; ховати кнопки "Видалити" для worker.

### 5. Точки — адреса АБО GPS
- Таблиця `apiary_points` вже має `address`, `lat`, `lng`, `notes`. Робимо обидва поля опціональними у формі (валідація: має бути хоча б одне з address / GPS). Кнопка "Моя локація" для автозаповнення GPS.

### 6. Масове створення вуликів
- На сторінці точка `_app.points.$pointId.tsx`: в діалог "Додати" додаємо вкладку "Діапазон" — поля "від" / "до" (макс. 200 за раз), порода/рік матки на всіх однакові. Серверний `createHivesBulk` server fn з middleware `requireSupabaseAuth`, який робить один insert масивом. QR створюється автоматично (бо генерується з id).

### 7. Картка вулика
- `hive-card.tsx`: додаємо поля "Дата створення" (`created_at`) та "Останній огляд" (з `inspections`). Редагування всіх полів уже є.

### 8. Робота через QR
- Маршрут `/h/$hiveId` (новий публічний редирект → `_authenticated/hives?scan=<id>`), або одразу відкривати картку через `forceOpen`. Вже частково реалізовано через `?scan=`. Додамо швидку кнопку "Новий огляд" у відкритій картці.

### 9. Журнал оглядів
- Розширити таблицю `inspections` структурованими полями:
  - `queen_status` enum ('present','absent','unknown')
  - `brood_level` enum ('none','weak','medium','strong')
  - `honey_level` enum ('none','low','medium','high')
  - `works` text[] (кодові значення)
  - `notes` text (вже є)
- Міграція + оновлені RLS + GRANT.
- Компонент `inspection-form.tsx`: форма з радіо-групами + чекбокси робіт + текст/голос. Зверху — кнопка "Новий огляд". Показуємо 5 останніх з кнопкою "Показати всю історію" → розгортає список. Кожен запис має автора (вже є).

### 10. Сторінка "Статистика"
- Новий маршрут `_app.stats.tsx`: лічильники по поточній пасіці (точки/вулики/нуклеуси/огляди/активні юзери за 30 днів) + сторінка вулика отримує таб "Історія" (огляди + зміни матки + роботи).
- Додаємо пункт меню "Статистика" у нав (заміняє приховані модулі).

### 11. PDF друку QR (точок)
- На сторінці точка — кнопка "Друк QR". Відкриває діалог зі списком вуликів цього точка + чекбокси + "Вибрати всі" + "Створити PDF".
- Генерація: A4 (210×297 мм), сітка наклейок 50×50 мм з підписом "Вулик №N" знизу (загальна висота клітинки ~58 мм), поля 10 мм. На сторінку ≈ 3 колонки × 4 ряди = 12 шт. Перенесення сторінок автоматично. Один PDF файл.

### 12. Приховати модулі
- Прибрати з нижньої навігації пункти "Купи/Продай" і "Чат". Файли маршрутів і код залишаються. Заодно прибрати з voice-fab правил видимості.

## 3. Послідовність виконання

1. Створити SQL міграцію (роль worker, нові поля у `inspections`, оновлені RLS+GRANT).
2. Оновити QR: круг з номером + EC=H (`hive-qr.tsx`).
3. Покращити голос (uk-UA, прев'ю+редагування) у `voice-fab.tsx` і виділити окремий `voice-dialog.tsx`.
4. Масове створення вуликів + сервер fn.
5. Журнал оглядів: форма + список + кнопка "Показати всю історію".
6. Сторінка "Статистика".
7. PDF друку QR з точка.
8. Сховати "Купи/Продай" і "Чат" з нав.
9. Розширити картку вулика (created_at, last inspection).
10. Точки: address OR GPS + кнопка "Моя локація".
11. Ролі: UI селектор при додаванні + приховування destructive дій для worker.

## 4. Технічні нотатки

- Міграція стартує з `CREATE TYPE` для нових enum, потім `ALTER TABLE inspections ADD COLUMN` (NULLable, з дефолтами), GRANT не потрібен (таблиця існує), RLS оновлюємо через `DROP POLICY ... CREATE POLICY`.
- `worker` роль: додаємо політику типу `USING (is_apiary_member(apiary_id, auth.uid()))` для SELECT/INSERT і `is_apiary_owner(...)` для DELETE/UPDATE структурних об'єктів.
- PDF: `jsPDF({format:'a4', unit:'mm'})`, для кожної наклейки `addImage(dataUrl, 'PNG', x, y, 50, 50)` + `text` під QR.
- QR центральний круг: після `QRCode.toCanvas` беремо `ctx`, малюємо `arc` білим, потім номер `fillText` чорним, шрифт ~ canvas/5.

## 5. Ризики

- Старі огляди без нових enum-полів — лишаємо NULL, у UI показуємо "—".
- Розпізнавання uk-UA нерівномірне у різних браузерах (Chrome OK, Safari iOS обмежено). Тому додаємо fallback: можливість редагування тексту перед збереженням.
