import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Flame } from "lucide-react";

import { BottomNavigation } from "@/components/heatshield/BottomNavigation";
import { MetroSwitcher } from "@/components/heatshield/MetroSwitcher";
import { MetroProvider } from "@/lib/metros";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const { user, ready } = useAuth();

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div
            className="flex size-12 items-center justify-center rounded-2xl glow-peach animate-pulse-soft"
            style={{
              background: "var(--gradient-peach)",
            }}
          >
            <Flame className="size-6 text-primary-foreground" />
          </div>

          <p className="font-display text-xs tracking-[0.2em] text-muted-foreground">
            HEATSHIELD AI
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <MetroProvider>
      <div className="min-h-screen bg-background">
        {/* Global header */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-5 sm:px-6">
          {/* Brand */}
          <Link
            to="/app"
            className="flex items-center gap-2.5"
            aria-label="HeatShield AI home"
          >
            <span
              className="flex size-8 items-center justify-center rounded-xl glow-peach"
              style={{
                background: "var(--gradient-peach)",
              }}
            >
              <Flame className="size-4 text-primary-foreground" />
            </span>

            <span className="font-display text-[11px] font-semibold tracking-[0.22em] text-muted-foreground">
              HEATSHIELD{" "}
              <span className="text-peach">AI</span>
            </span>
          </Link>

          {/* Single global metro selector */}
          <MetroSwitcher />
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-5 sm:px-6">
          <div
            key={pathname}
            className="animate-fade-up"
          >
            <Outlet />
          </div>
        </main>

        {/* Global bottom navigation */}
        <BottomNavigation />
      </div>
    </MetroProvider>
  );
}