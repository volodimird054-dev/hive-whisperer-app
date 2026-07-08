import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HiveQrButton } from "@/components/hive-qr";
import { ArrowLeft, Archive, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/h/$qrUuid")({
  component: HiveQrPage,
});

function HiveQrPage() {
  const { qrUuid } = Route.useParams();

  const { data: hive, isLoading } = useQuery({
    queryKey: ["hive-by-qr", qrUuid],
    queryFn: async () => {
      const safeToken = qrUuid.replace(/[^0-9a-f-]/gi, "");
      if (!safeToken) return null;
      const { data, error } = await (supabase.from("hives") as any)
        .select("*")
        .or(`qr_uuid.eq.${safeToken},id.eq.${safeToken}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  if (!hive) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> На головну
        </Link>
        <Card className="p-8 text-center text-muted-foreground">
          Вулик за цим QR не знайдено або у вас немає доступу.
        </Card>
      </div>
    );
  }

  const archived = !!hive.archived_at;
  const label = "Вулик";

  return (
    <div className="space-y-4">
      <a href={archived ? "/archive" : `/hives?scan=${hive.id}`} className="inline-flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> {archived ? "До архіву" : "До списку вуликів"}
      </a>

      <Card className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-honey/30 flex items-center justify-center font-bold text-xl">
            {hive.number}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{label} №{hive.number}</h1>
            <p className="text-sm text-muted-foreground">
              {hive.breed || "—"}{hive.queen_year ? ` · матка ${hive.queen_year}` : ""}
            </p>
            {archived && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                <Archive className="w-3 h-3" /> В архіві з {new Date(hive.archived_at).toLocaleDateString("uk-UA")}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm space-y-1">
          <div><b>Створено:</b> {hive.created_at ? new Date(hive.created_at).toLocaleDateString("uk-UA") : "—"}</div>
          <div><b>Порода:</b> {hive.breed || "—"}</div>
          <div><b>Рік матки:</b> {hive.queen_year || "—"}</div>
          {hive.notes && <div><b>Нотатки:</b> {hive.notes}</div>}
        </div>

        <HiveQrButton qrUuid={hive.qr_uuid} number={hive.number} label={label} />

        {!archived && (
          <Button asChild className="w-full">
            <a href={`/hives?scan=${hive.id}`}>Відкрити в списку</a>
          </Button>
        )}
      </Card>
    </div>
  );
}