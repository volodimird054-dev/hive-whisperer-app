import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const { data: messages } = useQuery({
    queryKey: ["chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles(display_name, avatar_url)")
        .order("created_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
  });

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("chat_messages").insert({ user_id: u.user!.id, body: text.trim() });
    setText("");
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)]">
      <h1 className="text-2xl font-bold mb-2">Чат з бджолярами</h1>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {!messages?.length && <Card className="p-6 text-center text-sm text-muted-foreground">Напишіть першим у чат бджолярів!</Card>}
        {messages?.map((m: any) => {
          const mine = m.user_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!mine && <div className="text-xs opacity-70 mb-0.5">{m.profiles?.display_name ?? "Пасічник"}</div>}
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 mt-2">
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Повідомлення…" />
        <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
