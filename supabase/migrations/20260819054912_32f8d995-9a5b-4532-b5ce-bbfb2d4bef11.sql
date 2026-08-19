DROP POLICY IF EXISTS "Members can view point photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload point photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can update point photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete point photos" ON storage.objects;

CREATE POLICY "Members can view point photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'point-photos' AND EXISTS (
  SELECT 1 FROM public.apiary_points p
  WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
    AND public.is_apiary_member(p.apiary_id, auth.uid())
));

CREATE POLICY "Members can upload point photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'point-photos' AND EXISTS (
  SELECT 1 FROM public.apiary_points p
  WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
    AND public.is_apiary_member(p.apiary_id, auth.uid())
));

CREATE POLICY "Members can update point photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'point-photos' AND EXISTS (
  SELECT 1 FROM public.apiary_points p
  WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
    AND public.is_apiary_member(p.apiary_id, auth.uid())
))
WITH CHECK (bucket_id = 'point-photos' AND EXISTS (
  SELECT 1 FROM public.apiary_points p
  WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
    AND public.is_apiary_member(p.apiary_id, auth.uid())
));

CREATE POLICY "Members can delete point photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'point-photos' AND EXISTS (
  SELECT 1 FROM public.apiary_points p
  WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
    AND public.is_apiary_member(p.apiary_id, auth.uid())
));