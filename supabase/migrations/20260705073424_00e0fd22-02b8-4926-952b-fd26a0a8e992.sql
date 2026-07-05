
ALTER TABLE public.hives ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS hives_point_number_unique
  ON public.hives (point_id, number)
  WHERE archived_at IS NULL AND point_id IS NOT NULL;
