import { createFileRoute, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home } from "lucide-react";
import { VoiceFab } from "@/components/voice-fab";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🐝</span>
            <span>Пасічник</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/">
              <Button variant="ghost" size="icon"><Home className="w-5 h-5" /></Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut} title={user?.email ?? ""}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 pb-28">
        <Outlet />
      </main>
      <VoiceFab />
    </div>
  );
}
