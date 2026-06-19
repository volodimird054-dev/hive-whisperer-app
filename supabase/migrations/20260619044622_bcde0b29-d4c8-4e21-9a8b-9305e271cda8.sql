
-- Enum for point kind
CREATE TYPE public.point_kind AS ENUM ('hives', 'nuclei');
CREATE TYPE public.apiary_role AS ENUM ('owner', 'member');

-- apiary_points
CREATE TABLE public.apiary_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apiary_id uuid NOT NULL REFERENCES public.apiaries(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.point_kind NOT NULL DEFAULT 'hives',
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apiary_points TO authenticated;
GRANT ALL ON public.apiary_points TO service_role;
ALTER TABLE public.apiary_points ENABLE ROW LEVEL SECURITY;

-- apiary_members
CREATE TABLE public.apiary_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apiary_id uuid NOT NULL REFERENCES public.apiaries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.apiary_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apiary_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apiary_members TO authenticated;
GRANT ALL ON public.apiary_members TO service_role;
ALTER TABLE public.apiary_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of apiary
CREATE OR REPLACE FUNCTION public.is_apiary_member(_apiary_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apiary_members
    WHERE apiary_id = _apiary_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.apiaries WHERE id = _apiary_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_apiary_owner(_apiary_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apiaries WHERE id = _apiary_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.apiary_members
    WHERE apiary_id = _apiary_id AND user_id = _user_id AND role = 'owner'
  )
$$;

-- Add point_id to hives
ALTER TABLE public.hives ADD COLUMN point_id uuid REFERENCES public.apiary_points(id) ON DELETE SET NULL;
CREATE INDEX hives_point_idx ON public.hives(point_id);

-- Trigger to auto-create owner membership when apiary is created
CREATE OR REPLACE FUNCTION public.tg_apiary_owner_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.apiary_members (apiary_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (apiary_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;
CREATE TRIGGER apiaries_owner_member AFTER INSERT ON public.apiaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_apiary_owner_member();

-- Backfill memberships for existing apiaries
INSERT INTO public.apiary_members (apiary_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.apiaries
ON CONFLICT DO NOTHING;

-- updated_at trigger
CREATE TRIGGER apiary_points_updated_at BEFORE UPDATE ON public.apiary_points
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Policies: apiary_points
CREATE POLICY "members read points" ON public.apiary_points
  FOR SELECT TO authenticated USING (public.is_apiary_member(apiary_id, auth.uid()));
CREATE POLICY "members write points" ON public.apiary_points
  FOR INSERT TO authenticated WITH CHECK (public.is_apiary_member(apiary_id, auth.uid()));
CREATE POLICY "members update points" ON public.apiary_points
  FOR UPDATE TO authenticated USING (public.is_apiary_member(apiary_id, auth.uid()));
CREATE POLICY "members delete points" ON public.apiary_points
  FOR DELETE TO authenticated USING (public.is_apiary_member(apiary_id, auth.uid()));

-- Policies: apiary_members
CREATE POLICY "members see team" ON public.apiary_members
  FOR SELECT TO authenticated USING (public.is_apiary_member(apiary_id, auth.uid()));
CREATE POLICY "owner adds members" ON public.apiary_members
  FOR INSERT TO authenticated WITH CHECK (public.is_apiary_owner(apiary_id, auth.uid()));
CREATE POLICY "owner removes members" ON public.apiary_members
  FOR DELETE TO authenticated USING (public.is_apiary_owner(apiary_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "owner updates members" ON public.apiary_members
  FOR UPDATE TO authenticated USING (public.is_apiary_owner(apiary_id, auth.uid()));

-- Extend apiaries RLS so members can read/edit
DROP POLICY IF EXISTS "Users manage own apiaries" ON public.apiaries;
CREATE POLICY "owner manages apiary" ON public.apiaries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members read apiary" ON public.apiaries
  FOR SELECT TO authenticated USING (public.is_apiary_member(id, auth.uid()));
CREATE POLICY "members update apiary" ON public.apiaries
  FOR UPDATE TO authenticated USING (public.is_apiary_member(id, auth.uid()));

-- Extend hives RLS
DROP POLICY IF EXISTS "Users manage own hives" ON public.hives;
CREATE POLICY "owner manages hives" ON public.hives
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members access hives via point" ON public.hives
  FOR SELECT TO authenticated USING (
    point_id IS NOT NULL AND public.is_apiary_member(
      (SELECT apiary_id FROM public.apiary_points WHERE id = point_id), auth.uid()
    )
  );
CREATE POLICY "members insert hives via point" ON public.hives
  FOR INSERT TO authenticated WITH CHECK (
    point_id IS NULL OR public.is_apiary_member(
      (SELECT apiary_id FROM public.apiary_points WHERE id = point_id), auth.uid()
    )
  );
CREATE POLICY "members update hives via point" ON public.hives
  FOR UPDATE TO authenticated USING (
    point_id IS NOT NULL AND public.is_apiary_member(
      (SELECT apiary_id FROM public.apiary_points WHERE id = point_id), auth.uid()
    )
  );
CREATE POLICY "members delete hives via point" ON public.hives
  FOR DELETE TO authenticated USING (
    point_id IS NOT NULL AND public.is_apiary_member(
      (SELECT apiary_id FROM public.apiary_points WHERE id = point_id), auth.uid()
    )
  );

-- Extend inspections RLS
DROP POLICY IF EXISTS "Users manage own inspections" ON public.inspections;
CREATE POLICY "owner manages inspections" ON public.inspections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members access inspections" ON public.inspections
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hives h
    JOIN public.apiary_points p ON p.id = h.point_id
    WHERE h.id = inspections.hive_id AND public.is_apiary_member(p.apiary_id, auth.uid())
  ))
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.hives h
      LEFT JOIN public.apiary_points p ON p.id = h.point_id
      WHERE h.id = inspections.hive_id
        AND (p.id IS NULL OR public.is_apiary_member(p.apiary_id, auth.uid()))
    )
  );

-- Grant profiles read to authenticated so we can look up team members by email
GRANT SELECT ON public.profiles TO authenticated;

-- Add email to profiles if missing (for invite lookup)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill profile emails from auth.users
UPDATE public.profiles p SET email = u.email
FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(lower(email));

-- Update handle_new_user to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Allow finding a user by email for invite (RPC, security definer)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE(id uuid, display_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, email FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
