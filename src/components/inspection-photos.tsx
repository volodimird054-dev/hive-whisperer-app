import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const INSPECTION_BUCKET = "inspection-photos";
const MAX_PHOTOS = 6;

async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
  } catch {
    return file;
  }
}

export async function uploadInspectionPhotos(hiveId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const f of files) {
    const blob = await compress(f);
    const path = `${hiveId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(INSPECTION_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export function InspectionPhotoPicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  return (
    <div className="flex flex-wrap gap-2">
      {previews.map((u, i) => (
        <div key={u} className="relative w-20 h-20">
          <img src={u} alt="" className="w-20 h-20 object-cover rounded-lg" />
          <button
            type="button"
            aria-label="Прибрати фото"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {files.length < MAX_PHOTOS && (
        <label className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground cursor-pointer">
          <Camera className="w-5 h-5 mb-1" />
          Фото
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              onChange([...files, ...picked].slice(0, MAX_PHOTOS));
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

export function InspectionPhotoGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from(INSPECTION_BUCKET).createSignedUrls(paths, 300).then(({ data }) => {
      if (alive) setUrls((data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[]);
    });
    return () => { alive = false; };
  }, [paths.join("|")]);
  if (!urls.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((u) => (
          <button key={u} type="button" onClick={() => setOpen(u)}>
            <img src={u} alt="Фото огляду" className="w-16 h-16 object-cover rounded-md" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="p-2">
          {open && <img src={open} alt="Фото огляду" className="w-full h-auto rounded-md" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
