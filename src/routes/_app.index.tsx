import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Home as HomeIcon, Boxes, Crown, CalendarDays, ShoppingBag, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

const ITEMS = [
  { to: "/apiary", title: "Моя пасіка", desc: "Профіль вашої пасіки", icon: HomeIcon, color: "from-amber-200 to-amber-100" },
  { to: "/hives", title: "Мої вулики", desc: "Облік бджолосімей", icon: Boxes, color: "from-yellow-200 to-amber-100" },
  { to: "/queens", title: "Виведення маток", desc: "Графік щеплень і виходу", icon: Crown, color: "from-orange-200 to-amber-100" },
  { to: "/calendar", title: "Календар пасічника", desc: "Сезонні роботи", icon: CalendarDays, color: "from-lime-200 to-green-100" },
  { to: "/marketplace", title: "Купи / Продай", desc: "Оголошення бджолярів", icon: ShoppingBag, color: "from-rose-200 to-amber-100" },
  { to: "/chat", title: "Чат з бджолярами", desc: "Спільнота", icon: MessageCircle, color: "from-sky-200 to-amber-100" },
] as const;

function HomePage() {
  return (
    <div>
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold">Вітаю, пасічнику! 🐝</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Натисніть мікрофон унизу — і керуйте додатком голосом.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ to, title, desc, icon: Icon, color }) => (
          <Link key={to} to={to}>
            <Card className={`p-4 h-full bg-gradient-to-br ${color} border-honey/30 hover:shadow-md transition-shadow active:scale-[0.98]`}>
              <Icon className="w-7 h-7 mb-3 text-foreground/80" />
              <div className="font-semibold text-foreground">{title}</div>
              <div className="text-xs text-foreground/70 mt-1">{desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
