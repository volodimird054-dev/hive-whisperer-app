ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS aggression text,
  ADD COLUMN IF NOT EXISTS swarming text;