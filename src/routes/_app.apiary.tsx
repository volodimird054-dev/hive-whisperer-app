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
import { Loader2 } from "lucide-react";

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
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10" />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Моя пасіка</h1>
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
    </div>
  );
}
