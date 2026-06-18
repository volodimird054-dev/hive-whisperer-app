import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createLovableAiGatewayProvider,
} from "./ai-gateway.server";
import { generateText } from "ai";

const Input = z.object({ transcript: z.string().min(1).max(2000) });

const SYSTEM = `Ти — голосовий асистент пасічника. Користувач говорить українською.
Твоя задача — перетворити фразу в JSON-команду для додатку.
Поверни ТІЛЬКИ валідний JSON без markdown, без коментарів.

Доступні дії:
- "navigate": перехід між екранами. screen: "home" | "apiary" | "hives" | "queens" | "calendar" | "marketplace" | "chat"
- "add_hive": додати вулик. fields: { number: string, breed?: string, notes?: string }
- "update_hive": змінити дані картки вулика. fields: { hive_number: string, breed?: string, queen_year?: number, new_number?: string, notes?: string }
  ВАЖЛИВО: якщо користувач каже про зміну породи/матки/року — використовуй САМЕ update_hive, а не add_inspection. Запис в нотатку — лише якщо явно сказано "запиши в нотатку".
- "add_inspection": додати огляд (загальний запис у журнал). fields: { hive_number: string, notes: string, queen_seen?: boolean }
- "add_feeding": годування. fields: { hive_number: string, feed_type?: string, amount?: string }
- "add_treatment": обробка. fields: { hive_number: string, product?: string, dose?: string }
- "add_harvest": збір меду. fields: { hive_number?: string, honey_kg?: number, honey_type?: string }
- "add_event": подія в календар. fields: { title: string, event_date?: string (ISO), description?: string }
- "update_queen_batch": оновити партію виведення маток (наприклад, частина не вийшла). fields: { name: string, count?: number }
- "delete_queen_batch": видалити партію. fields: { name: string }
- "unknown": якщо незрозуміло. fields: { reason: string }

Формат: { "action": "...", "fields": { ... }, "speech": "коротка відповідь українською" }

Приклади:
"відкрий мої вулики" -> {"action":"navigate","fields":{"screen":"hives"},"speech":"Відкриваю вулики"}
"У вулику пʼять матка червить додав рамку" -> {"action":"add_inspection","fields":{"hive_number":"5","notes":"матка червить, додав рамку","queen_seen":true},"speech":"Записав огляд вулика 5"}
"Змінив матку у вулику 3 на породу бакфаст" -> {"action":"update_hive","fields":{"hive_number":"3","breed":"Бакфаст"},"speech":"Оновив породу вулика 3 на Бакфаст"}
"У вулику 7 матка 2025 року" -> {"action":"update_hive","fields":{"hive_number":"7","queen_year":2025},"speech":"Оновив рік матки вулика 7"}
"Записати годування вулика 3 одним літром сиропу" -> {"action":"add_feeding","fields":{"hive_number":"3","feed_type":"сироп","amount":"1 л"},"speech":"Записав годування вулика 3"}
"У партії номер 1 залишилось 8 маточників" -> {"action":"update_queen_batch","fields":{"name":"Партія №1","count":8},"speech":"Оновив партію №1"}`;

export const interpretCommand = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");
    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: data.transcript,
    });

    // Extract JSON
    let raw = text.trim();
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

    try {
      const parsed = JSON.parse(raw);
      return { json: JSON.stringify(parsed) };
    } catch {
      return {
        json: JSON.stringify({
          action: "unknown",
          fields: { reason: "Не вдалося розпізнати" },
          speech: text,
        }),
      };
    }
  });
