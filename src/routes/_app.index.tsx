import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Crown, CalendarDays, Archive, ChevronRight } from "lucide-react";
import { HomeWeather } from "@/components/home-weather";
import heroBee from "@/assets/hero-bee.jpg";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

const QUICK = [
  { to: "/points", title: "Точки", icon: Boxes },
  { to: "/queens", title: "Матки", icon: Crown },
  { to: "/calendar", title: "Календар", icon: CalendarDays },
  { to: "/archive", title: "Архів", icon: Archive },
] as const;

function HomePage() {
  return (
    <div className="space-y-4">
      <section className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-6 pt-6">
        <img
          src={heroBee}
          alt=""
          width={1024}
          height={1024}
          className="pointer-events-none absolute right-0 top-0 h-full w-[75%] object-cover opacity-90"
          style={{ maskImage: "linear-gradient(to right, transparent, black 55%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 55%)" }}
        />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        <div className="relative max-w-[62%]">
          <h1 className="text-[1.7rem] font-extrabold leading-tight">
            Здорові бджоли —
            <br />
            <span className="text-honey-glow">сильніше завтра</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Догляд. Розвиток. Врожай.</p>
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2">
        {QUICK.map(({ to, title, icon: Icon }) => (
          <Link key={to} to={to} className="bee-tile flex flex-col items-center gap-2 px-1 py-3 text-center">
            <Icon className="h-7 w-7 text-honey drop-shadow-[0_0_8px_var(--honey)]" />
            <span className="text-xs font-medium leading-tight">{title}</span>
          </Link>
        ))}
      </div>

      <HomeWeather />

      <Link to="/points" className="hero-honey flex items-center gap-3 rounded-2xl p-4 font-bold shadow-[0_0_28px_-6px_var(--honey)]">
        <span className="text-2xl">🐝</span>
        <span className="flex-1 leading-tight">Кращі пасічники створюють кращий світ</span>
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
