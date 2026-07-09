
-- 1) Extend apiary_points
ALTER TABLE public.apiary_points
  ADD COLUMN IF NOT EXISTS stationary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS honey_base text,
  ADD COLUMN IF NOT EXISTS hives_count_manual integer,
  ADD COLUMN IF NOT EXISTS water_source text,
  ADD COLUMN IF NOT EXISTS car_access boolean,
  ADD COLUMN IF NOT EXISTS has_electricity boolean,
  ADD COLUMN IF NOT EXISTS has_security boolean,
  ADD COLUMN IF NOT EXISTS land_owner text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS installed_at date,
  ADD COLUMN IF NOT EXISTS removed_at date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 2) Locations history
CREATE TABLE IF NOT EXISTS public.apiary_point_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id uuid NOT NULL REFERENCES public.apiary_points(id) ON DELETE CASCADE,
  address text,
  lat double precision,
  lng double precision,
  notes text,
  moved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apiary_point_locations TO authenticated;
GRANT ALL ON public.apiary_point_locations TO service_role;

ALTER TABLE public.apiary_point_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view point locations"
  ON public.apiary_point_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apiary_points p
      WHERE p.id = apiary_point_locations.point_id
        AND public.is_apiary_member(p.apiary_id, auth.uid())
    )
  );

CREATE POLICY "Members can insert point locations"
  ON public.apiary_point_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.apiary_points p
      WHERE p.id = apiary_point_locations.point_id
        AND public.is_apiary_member(p.apiary_id, auth.uid())
    )
  );

CREATE POLICY "Owners can update point locations"
  ON public.apiary_point_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apiary_points p
      WHERE p.id = apiary_point_locations.point_id
        AND public.is_apiary_owner(p.apiary_id, auth.uid())
    )
  );

CREATE POLICY "Owners can delete point locations"
  ON public.apiary_point_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apiary_points p
      WHERE p.id = apiary_point_locations.point_id
        AND public.is_apiary_owner(p.apiary_id, auth.uid())
    )
  );

-- 3) Trigger: record migration history when address/coords change
CREATE OR REPLACE FUNCTION public.tg_apiary_point_location_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.address IS NOT NULL OR NEW.lat IS NOT NULL OR NEW.lng IS NOT NULL THEN
      INSERT INTO public.apiary_point_locations (point_id, address, lat, lng)
      VALUES (NEW.id, NEW.address, NEW.lat, NEW.lng);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (COALESCE(NEW.address,'') IS DISTINCT FROM COALESCE(OLD.address,''))
       OR (NEW.lat IS DISTINCT FROM OLD.lat)
       OR (NEW.lng IS DISTINCT FROM OLD.lng) THEN
      INSERT INTO public.apiary_point_locations (point_id, address, lat, lng)
      VALUES (NEW.id, NEW.address, NEW.lat, NEW.lng);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apiary_point_location_history ON public.apiary_points;
CREATE TRIGGER trg_apiary_point_location_history
AFTER INSERT OR UPDATE ON public.apiary_points
FOR EACH ROW EXECUTE FUNCTION public.tg_apiary_point_location_history();

-- 4) Backfill history for existing points that have any location data
INSERT INTO public.apiary_point_locations (point_id, address, lat, lng, moved_at)
SELECT p.id, p.address, p.lat, p.lng, p.created_at
FROM public.apiary_points p
LEFT JOIN public.apiary_point_locations l ON l.point_id = p.id
WHERE l.id IS NULL
  AND (p.address IS NOT NULL OR p.lat IS NOT NULL OR p.lng IS NOT NULL);
