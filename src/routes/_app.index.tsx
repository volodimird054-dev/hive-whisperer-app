import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Home as HomeIcon, Boxes, Crown, CalendarDays, BarChart3, Archive } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

const ITEMS = [
  { to: "/apiary", title: "Моя пасіка", desc: "Профіль вашої пасіки", icon: HomeIcon, tone: "main-menu-card--apiary" },
  { to: "/points", title: "Мої точки", desc: "Вулики та нуклеуси", icon: Boxes, tone: "main-menu-card--hives" },
  { to: "/queens", title: "Виведення маток", desc: "Графік щеплень і виходу", icon: Crown, tone: "main-menu-card--queens" },
  { to: "/calendar", title: "Календар пасічника", desc: "Сезонні роботи", icon: CalendarDays, tone: "main-menu-card--calendar" },
  { to: "/stats", title: "Статистика", desc: "Аналітика пасіки", icon: BarChart3, tone: "main-menu-card--queens" },
  { to: "/archive", title: "Архів", desc: "Архівовані вулики", icon: Archive, tone: "main-menu-card--apiary" },
] as const;

function HomePage() {
  return (
    <div className="overflow-hidden">
      <div className="mb-6 mt-2">
        <h1 className="text-xl font-bold sm:text-2xl">Вітаю, пасічнику! 🐝</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Натисніть мікрофон унизу — і керуйте додатком голосом.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map(({ to, title, desc, icon: Icon, tone }) => (
          <Link key={to} to={to} className="block min-w-0">
            <Card className={`main-menu-card ${tone}`}>
              <Icon className="main-menu-card__icon" />
              <div className="main-menu-card__title">{title}</div>
              <div className="main-menu-card__desc">{desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
