ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS photo_paths text[];

CREATE OR REPLACE FUNCTION public.can_access_hive(_hive_id text, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hives h
    LEFT JOIN public.apiary_points p ON p.id = h.point_id
    WHERE h.id::text = _hive_id AND (
      h.user_id = _user_id
      OR public.is_apiary_member(COALESCE(p.apiary_id, h.apiary_id), _user_id)
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_hive(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_hive(text, uuid) TO authenticated;

CREATE POLICY "Hive members view inspection photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'inspection-photos' AND public.can_access_hive((storage.foldername(name))[1], auth.uid()));
CREATE POLICY "Hive members upload inspection photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos' AND public.can_access_hive((storage.foldername(name))[1], auth.uid()));
CREATE POLICY "Hive members delete inspection photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos' AND public.can_access_hive((storage.foldername(name))[1], auth.uid()));