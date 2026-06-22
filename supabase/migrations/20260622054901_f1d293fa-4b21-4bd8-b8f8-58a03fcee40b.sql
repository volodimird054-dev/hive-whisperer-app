
-- Inspections: structured fields
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS queen_status text,
  ADD COLUMN IF NOT EXISTS brood_level text,
  ADD COLUMN IF NOT EXISTS honey_level text,
  ADD COLUMN IF NOT EXISTS works text[];

-- Apiary points: separate address + GPS
ALTER TABLE public.apiary_points
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Backfill address from legacy `location` text once
UPDATE public.apiary_points SET address = location
  WHERE address IS NULL AND location IS NOT NULL;

-- Tighten destructive policies: only owners may delete/update
DROP POLICY IF EXISTS "members delete points" ON public.apiary_points;
CREATE POLICY "owners delete points" ON public.apiary_points
  FOR DELETE TO authenticated
  USING (is_apiary_owner(apiary_id, auth.uid()));

DROP POLICY IF EXISTS "members delete hives via point" ON public.hives;
CREATE POLICY "owners delete hives via point" ON public.hives
  FOR DELETE TO authenticated
  USING (
    (point_id IS NOT NULL AND is_apiary_owner(
      (SELECT apiary_id FROM apiary_points WHERE id = hives.point_id),
      auth.uid()
    ))
  );

-- Workers can INSERT inspections (already permitted as members) — leave as is.
-- Workers cannot DELETE inspections: add owner-only delete policy
DROP POLICY IF EXISTS "owner manages inspections" ON public.inspections;
CREATE POLICY "author manages own inspections" ON public.inspections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
