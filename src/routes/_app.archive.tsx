import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArchiveRestore, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { sortHives } from "@/lib/hive-sort";

export const Route = createFileRoute("/_app/archive")({
  component: ArchivePage,
});

function ArchivePage() {
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: hives, isLoading } = useQuery({
    queryKey: ["archived-hives"],
    queryFn: async () => {
      const { data } = await (supabase.from("hives") as any)
        .select("*").not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      return data ?? [];
    },
  });

  const list = sortHives(hives);

  async function restore(id: string, num: string | number) {
    const h = (hives ?? []).find((x: any) => x.id === id) as any;
    if (h?.point_id) {
      const { data: dup } = await (supabase.from("hives") as any)
        .select("id").eq("point_id", h.point_id).eq("number", String(h.number))
        .is("archived_at", null).maybeSingle();
      if (dup) return toast.error(`Вулик №${num} вже існує в цьому точку. Спершу перейменуйте активний.`);
    }
    const { error } = await (supabase.from("hives") as any)
      .update({ archived_at: null }).eq("id", id);
    if (error) {
      if ((error as any).code === "23505") return toast.error(`Вулик №${num} вже існує в цьому точку.`);
      return toast.error(error.message);
    }
    toast.success(`Вулик №${num} відновлено`);
    invalidate();
  }

  async function hardDelete(id: string) {
    const { error } = await supabase.from("hives").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Видалено остаточно");
    setConfirmId(null);
    invalidate();
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["archived-hives"] });
    qc.invalidateQueries({ queryKey: ["hives"] });
    qc.invalidateQueries({ queryKey: ["point-hives"] });
    qc.invalidateQueries({ queryKey: ["points-counts"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  const target = list.find((h: any) => h.id === confirmId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Архів вуликів</h1>
      {!list.length ? (
        <Card className="p-8 text-center text-muted-foreground">Архів порожній.</Card>
      ) : (
        <div className="space-y-2">
          {list.map((h: any) => (
            <Card key={h.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-lg">
                  {h.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Вулик №{h.number}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {h.breed || "—"} · архівовано{" "}
                    {h.archived_at ? new Date(h.archived_at).toLocaleDateString("uk-UA") : "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" onClick={() => restore(h.id, h.number)}>
                  <ArchiveRestore className="w-4 h-4 mr-2" /> Відновити
                </Button>
                <Button variant="destructive" onClick={() => setConfirmId(h.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Видалити назавжди
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Остаточно видалити вулик №{target?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Дані вулика буде видалено назавжди без можливості відновлення.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmId && hardDelete(confirmId)}
            >
              Видалити назавжди
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
