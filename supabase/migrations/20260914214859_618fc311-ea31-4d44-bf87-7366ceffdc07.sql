ALTER TABLE public.queen_batches
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'comb',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS larvae_count integer,
  ADD COLUMN IF NOT EXISTS eggs_laid_on date,
  ADD COLUMN IF NOT EXISTS larvae_hatched_on date,
  ADD COLUMN IF NOT EXISTS starter_on date,
  ADD COLUMN IF NOT EXISTS acceptance_check_on date,
  ADD COLUMN IF NOT EXISTS nurse_on date,
  ADD COLUMN IF NOT EXISTS sealed_on date,
  ADD COLUMN IF NOT EXISTS next_action_planned_on date,
  ADD COLUMN IF NOT EXISTS accepted_count integer,
  ADD COLUMN IF NOT EXISTS next_action_done_on date,
  ADD COLUMN IF NOT EXISTS cells_harvested integer,
  ADD COLUMN IF NOT EXISTS virgin_queens_count integer,
  ADD COLUMN IF NOT EXISTS emerged_on date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS queen_batches_updated_at ON public.queen_batches;
CREATE TRIGGER queen_batches_updated_at BEFORE UPDATE ON public.queen_batches
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.queen_batch_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.queen_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  day_offset integer NOT NULL DEFAULT 0,
  planned_on date,
  done boolean NOT NULL DEFAULT false,
  done_on date,
  actual_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (batch_id, step_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queen_batch_steps TO authenticated;
GRANT ALL ON public.queen_batch_steps TO service_role;
ALTER TABLE public.queen_batch_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batch steps" ON public.queen_batch_steps
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER queen_batch_steps_updated_at BEFORE UPDATE ON public.queen_batch_steps
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.queen_batch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.queen_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queen_batch_events TO authenticated;
GRANT ALL ON public.queen_batch_events TO service_role;
ALTER TABLE public.queen_batch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batch events" ON public.queen_batch_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS queen_batch_steps_batch_idx ON public.queen_batch_steps(batch_id);
CREATE INDEX IF NOT EXISTS queen_batch_events_batch_idx ON public.queen_batch_events(batch_id);