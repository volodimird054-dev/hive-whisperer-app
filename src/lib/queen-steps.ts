import { supabase } from "@/integrations/supabase/client";
import { addDays, buildStepDefs, nextActionOf, type QueenMethod } from "@/lib/queens";

export async function createStepsFor(batch: any) {
  const method: QueenMethod = (batch.method ?? "comb") as QueenMethod;
  const defs = buildStepDefs(method, nextActionOf(batch));
  const rows = defs.map((def, index) => ({
    batch_id: batch.id,
    user_id: batch.user_id,
    step_key: def.key,
    day_offset: def.dayFrom,
    planned_on: addDays(batch.grafted_on, def.dayFrom),
    sort_order: index,
  }));
  await supabase.from("queen_batch_steps").upsert(rows, { onConflict: "batch_id,step_key" });
}