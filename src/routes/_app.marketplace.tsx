import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/marketplace")({
  component: MarketPage,
});

function MarketPage() {
  const qc = useQueryClient();
  const { data: listings } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => (await supabase.from("listings").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("sell");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");

  async function add() {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("listings").insert({
      user_id: u.user!.id, kind, title, price: price ? Number(price) : null, description: desc, contact,
    });
    setOpen(false); setTitle(""); setPrice(""); setDesc(""); setContact("");
    qc.invalidateQueries({ queryKey: ["listings"] });
  }

  const sells = listings?.filter(l => l.kind === "sell") ?? [];
  const buys = listings?.filter(l => l.kind === "buy") ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Купи / Продай</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Оголошення</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Нове оголошення</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button variant={kind === "sell" ? "default" : "outline"} onClick={() => setKind("sell")} className="flex-1">Продаю</Button>
                <Button variant={kind === "buy" ? "default" : "outline"} onClick={() => setKind("buy")} className="flex-1">Куплю</Button>
              </div>
              <div><Label>Заголовок</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Бджолопакети карпатка" /></div>
              <div><Label>Ціна (грн)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div><Label>Опис</Label><Textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} /></div>
              <div><Label>Контакт</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="+380…" /></div>
              <Button onClick={add} disabled={!title} className="w-full">Опублікувати</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="sell">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="sell">Продаж ({sells.length})</TabsTrigger>
          <TabsTrigger value="buy">Купівля ({buys.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="sell"><ListingList items={sells} /></TabsContent>
        <TabsContent value="buy"><ListingList items={buys} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ListingList({ items }: { items: any[] }) {
  if (!items.length) return <Card className="p-8 text-center text-muted-foreground mt-4">Поки порожньо.</Card>;
  return (
    <div className="space-y-2 mt-4">
      {items.map(l => (
        <Card key={l.id} className="p-4">
          <div className="flex justify-between gap-3">
            <div className="font-semibold">{l.title}</div>
            {l.price && <div className="text-honey font-bold whitespace-nowrap">{l.price} грн</div>}
          </div>
          {l.description && <div className="text-sm text-muted-foreground mt-1">{l.description}</div>}
          {l.contact && <div className="text-sm mt-2">📞 {l.contact}</div>}
        </Card>
      ))}
    </div>
  );
}
