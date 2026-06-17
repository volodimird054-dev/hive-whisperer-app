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
- "add_inspection": додати огляд. fields: { hive_number: string, notes: string, queen_seen?: boolean }
- "add_feeding": годування. fields: { hive_number: string, feed_type?: string, amount?: string }
- "add_treatment": обробка. fields: { hive_number: string, product?: string, dose?: string }
- "add_harvest": збір меду. fields: { hive_number?: string, honey_kg?: number, honey_type?: string }
- "add_event": подія в календар. fields: { title: string, event_date?: string (ISO), description?: string }
- "unknown": якщо незрозуміло. fields: { reason: string }

Формат: { "action": "...", "fields": { ... }, "speech": "коротка відповідь українською" }

Приклади:
"відкрий мої вулики" -> {"action":"navigate","fields":{"screen":"hives"},"speech":"Відкриваю вулики"}
"У вулику пʼять матка червить додав рамку" -> {"action":"add_inspection","fields":{"hive_number":"5","notes":"матка червить, додав рамку","queen_seen":true},"speech":"Записав огляд вулика 5"}
"Записати годування вулика 3 одним літром сиропу" -> {"action":"add_feeding","fields":{"hive_number":"3","feed_type":"сироп","amount":"1 л"},"speech":"Записав годування вулика 3"}`;

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
      return parsed as {
        action: string;
        fields?: Record<string, unknown>;
        speech?: string;
      };
    } catch {
      return { action: "unknown", fields: { reason: "Не вдалося розпізнати" }, speech: text };
    }
  });
