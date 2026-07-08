CREATE OR REPLACE FUNCTION public.tg_lock_hive_qr_uuid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.qr_uuid IS NULL THEN
      NEW.qr_uuid := gen_random_uuid();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.qr_uuid := OLD.qr_uuid;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_hive_qr_uuid ON public.hives;
CREATE TRIGGER lock_hive_qr_uuid
BEFORE INSERT OR UPDATE ON public.hives
FOR EACH ROW
EXECUTE FUNCTION public.tg_lock_hive_qr_uuid();

UPDATE public.hives
SET qr_uuid = gen_random_uuid()
WHERE qr_uuid IS NULL;

ALTER TABLE public.hives
  ALTER COLUMN qr_uuid SET DEFAULT gen_random_uuid(),
  ALTER COLUMN qr_uuid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hives_qr_uuid_unique ON public.hives(qr_uuid);