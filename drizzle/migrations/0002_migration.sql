CREATE OR REPLACE FUNCTION public.shares_apiary(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a = _b OR EXISTS (
    SELECT 1 FROM public.apiary_members m1
    JOIN public.apiary_members m2 ON m1.apiary_id = m2.apiary_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  )
$$;
REVOKE EXECUTE ON FUNCTION public.shares_apiary(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_apiary(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Signed-in users read profiles" ON public.profiles;
CREATE POLICY "Read own or teammate profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.shares_apiary(auth.uid(), id));

DROP POLICY IF EXISTS "Auth users read chat" ON public.chat_messages;
CREATE POLICY "Read own or teammate chat" ON public.chat_messages
  FOR SELECT TO authenticated USING (public.shares_apiary(auth.uid(), user_id));