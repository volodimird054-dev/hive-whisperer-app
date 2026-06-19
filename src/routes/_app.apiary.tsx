import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_app/apiary")({
  component: ApiaryPage,
});

function ApiaryPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["apiary"],
    queryFn: async () => {
      const { data } = await supabase.from("apiaries").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name ?? "");
      setLocation(data.location ?? "");
      setDescription(data.description ?? "");
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user!.id;
    if (data) {
      await supabase.from("apiaries").update({ name, location, description }).eq("id", data.id);
    } else {
      await supabase.from("apiaries").insert({ user_id, name, location, description });
    }
    setSaving(false);
    toast.success("Збережено");
    qc.invalidateQueries({ queryKey: ["apiary"] });
    qc.invalidateQueries({ queryKey: ["apiary-one"] });
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Моя пасіка</h1>
      <Card className="p-4 space-y-3">
        <div>
          <Label>Назва</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Пасіка на лісовій галявині" />
        </div>
        <div>
          <Label>Розташування</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="с. Лісне, Київська обл." />
        </div>
        <div>
          <Label>Опис</Label>
          <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Породи, медозбір, особливості…" />
        </div>
        <Button onClick={save} disabled={saving || !name} className="w-full">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Зберегти
        </Button>
      </Card>

      {data && <TeamSection apiaryId={data.id} ownerId={data.user_id} />}
    </div>
  );
}

function TeamSection({ apiaryId, ownerId }: { apiaryId: string; ownerId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const isOwner = me === ownerId;

  const { data: members } = useQuery({
    queryKey: ["apiary-members", apiaryId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("apiary_members")
        .select("*").eq("apiary_id", apiaryId);
      const list = data ?? [];
      const ids = list.map((m: any) => m.user_id);
      const map: Record<string, any> = {};
      if (ids.length) {
        const { data: prof } = await supabase.from("profiles")
          .select("id, display_name, email, avatar_url").in("id", ids);
        (prof ?? []).forEach((p: any) => { map[p.id] = p; });
      }
      return list.map((m: any) => ({ ...m, profile: map[m.user_id] }));
    },
  });

  async function invite() {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const { data: found, error: rpcErr } = await (supabase as any)
        .rpc("find_user_by_email", { _email: email.trim() });
      if (rpcErr) throw rpcErr;
      const user = Array.isArray(found) ? found[0] : found;
      if (!user) {
        toast.error("Такого користувача немає. Він має спочатку зареєструватися в додатку.");
        return;
      }
      const { error } = await (supabase.from as any)("apiary_members").insert({
        apiary_id: apiaryId, user_id: user.id, role: "member",
      });
      if (error) {
        if (error.code === "23505") toast.info("Цей користувач вже в команді");
        else toast.error(error.message);
        return;
      }
      setEmail("");
      qc.invalidateQueries({ queryKey: ["apiary-members", apiaryId] });
      toast.success("Учасника додано");
    } finally { setAdding(false); }
  }

  async function remove(memberId: string) {
    if (!confirm("Видалити учасника з команди?")) return;
    const { error } = await (supabase.from as any)("apiary_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["apiary-members", apiaryId] });
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h2 className="font-semibold">Команда пасіки</h2>
      </div>

      <div className="space-y-2">
        {members?.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-2 rounded bg-muted/40">
            <div className="w-9 h-9 rounded-full bg-honey/40 flex items-center justify-center font-bold">
              {(m.profile?.display_name || m.profile?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{m.profile?.display_name || m.profile?.email || m.user_id}</div>
              <div className="text-xs text-muted-foreground">
                {m.role === "owner" ? "Власник" : "Учасник"}
                {m.profile?.email ? ` · ${m.profile.email}` : ""}
              </div>
            </div>
            {isOwner && m.role !== "owner" && (
              <Button size="icon" variant="ghost" onClick={() => remove(m.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner ? (
        <div className="space-y-2 pt-2 border-t">
          <Label>Запросити за email</Label>
          <div className="flex gap-2">
            <Input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com" type="email"
            />
            <Button onClick={invite} disabled={!email.trim() || adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Користувач має бути вже зареєстрованим у додатку.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Лише власник пасіки може додавати/видаляти учасників.
        </p>
      )}
    </Card>
  );
}
