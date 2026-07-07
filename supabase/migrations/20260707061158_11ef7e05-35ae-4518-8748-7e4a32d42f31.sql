
-- 1) QR UUID for hives
ALTER TABLE public.hives
  ADD COLUMN IF NOT EXISTS qr_uuid uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS hives_qr_uuid_unique ON public.hives(qr_uuid);

-- 2) Calendar events: extra fields
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS remind_at timestamptz,
  ADD COLUMN IF NOT EXISTS seasonal_task_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) Seasonal tasks table
CREATE TABLE IF NOT EXISTS public.seasonal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  season text NOT NULL DEFAULT 'spring',
  month text,
  target_date date,
  priority text NOT NULL DEFAULT 'normal',
  category text,
  done boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  apiary_id uuid REFERENCES public.apiaries(id) ON DELETE SET NULL,
  point_id uuid REFERENCES public.apiary_points(id) ON DELETE SET NULL,
  hive_id uuid REFERENCES public.hives(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasonal_tasks TO authenticated;
GRANT ALL ON public.seasonal_tasks TO service_role;

ALTER TABLE public.seasonal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own seasonal tasks" ON public.seasonal_tasks;
CREATE POLICY "Users manage own seasonal tasks"
  ON public.seasonal_tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS seasonal_tasks_updated_at ON public.seasonal_tasks;
CREATE TRIGGER seasonal_tasks_updated_at
  BEFORE UPDATE ON public.seasonal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS seasonal_tasks_user_idx ON public.seasonal_tasks(user_id);
CREATE INDEX IF NOT EXISTS seasonal_tasks_order_idx ON public.seasonal_tasks(user_id, season, sort_order);
