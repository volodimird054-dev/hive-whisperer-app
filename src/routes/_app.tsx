import { createFileRoute, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Boxes, Plus, BarChart3, User, ClipboardList, Crown, CalendarPlus, MapPinPlus } from "lucide-react";
import { VoiceFab } from "@/components/voice-fab";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const [quick, setQuick] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🐝</span>
            <span className="text-lg">Пасічник</span>
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 pb-36">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid h-16 max-w-3xl grid-cols-5 items-center text-[11px]">
          {[
            { to: "/", label: "Головна", icon: Home },
            { to: "/points", label: "Точки", icon: Boxes },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex flex-col items-center gap-1 text-muted-foreground" activeProps={{ className: "!text-honey" }}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
          <button type="button" onClick={() => setQuick(true)} aria-label="Додати" className="mx-auto -mt-6 grid h-14 w-14 place-items-center bg-honey text-honey-foreground shadow-[0_0_24px_-4px_var(--honey)] [clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]">
            <Plus className="h-7 w-7" />
          </button>
          {[
            { to: "/stats", label: "Статистика", icon: BarChart3 },
            { to: "/apiary", label: "Профіль", icon: User },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1 text-muted-foreground" activeProps={{ className: "!text-honey" }}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </div>
      </nav>
      <Sheet open={quick} onOpenChange={setQuick}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Швидкі дії</SheetTitle></SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              { label: "Новий огляд", icon: ClipboardList, go: () => navigate({ to: "/points" }) },
              { label: "Нова партія маток", icon: Crown, go: () => navigate({ to: "/queens/new" }) },
              { label: "Подія в календарі", icon: CalendarPlus, go: () => navigate({ to: "/calendar" }) },
              { label: "Новий точок", icon: MapPinPlus, go: () => navigate({ to: "/points", search: { new: true } }) },
            ] as const).map(({ label, icon: Icon, go }) => (
              <button key={label} type="button" onClick={() => { setQuick(false); go(); }} className="bee-tile flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium">
                <Icon className="h-6 w-6 text-honey" />{label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <VoiceFab />
    </div>
  );
}
