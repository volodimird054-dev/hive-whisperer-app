DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Signed-in users read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_emails(_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.email FROM public.profiles p
  WHERE p.id = ANY(_ids) AND (
    p.id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.apiary_members a JOIN public.apiary_members b ON a.apiary_id = b.apiary_id
      WHERE a.user_id = auth.uid() AND b.user_id = p.id
    ) OR EXISTS (
      SELECT 1 FROM public.apiaries ap JOIN public.apiary_members m ON m.apiary_id = ap.id
      WHERE (ap.user_id = auth.uid() AND m.user_id = p.id) OR (ap.user_id = p.id AND m.user_id = auth.uid())
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_emails(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_emails(uuid[]) TO authenticated;