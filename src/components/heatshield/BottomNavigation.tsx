import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  Route as RouteIcon,
  TrendingUp,
  HardHat,
  Bot,
  Building2,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { to: "/app", label: "Command", icon: LayoutDashboard },
  { to: "/app/map", label: "Heat Map", icon: Map },
  { to: "/app/safe-route", label: "Safe Route", icon: RouteIcon },
  { to: "/app/prediction", label: "Prediction", icon: TrendingUp },
  { to: "/app/worker", label: "Worker", icon: HardHat },
  { to: "/app/agent", label: "AI Agent", icon: Bot },
  { to: "/app/city", label: "City", icon: Building2 },
  { to: "/app/simulator", label: "Simulator", icon: SlidersHorizontal },
  { to: "/app/impact", label: "Impact", icon: Target },
];

export function BottomNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 sm:bottom-5"
    >
      <div className="glass-panel-strong glow-peach flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item) => {
          const active =
            item.to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex shrink-0 flex-col items-center gap-0.5 rounded-full px-3 py-2 transition-all duration-300 sm:px-3.5",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full animate-scale-in"
                  style={{
                    background: "var(--gradient-peach)",
                    boxShadow: "0 4px 20px -4px color-mix(in oklab, var(--coral) 65%, transparent)",
                  }}
                />
              ) : null}
              <Icon className="relative size-[18px]" strokeWidth={active ? 2.4 : 2} />
              <span className="relative hidden font-display text-[9px] font-semibold tracking-wide md:block">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
