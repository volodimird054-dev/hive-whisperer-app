import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { path: string | null | undefined; className?: string; alt?: string };

export function usePointPhotoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("point-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

export function PointPhoto({ path, className, alt }: Props) {
  const url = usePointPhotoUrl(path);
  if (!url) return null;
  return <img src={url} alt={alt ?? "Фото точка"} className={className} loading="lazy" />;
}
