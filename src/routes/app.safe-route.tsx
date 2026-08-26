import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  CircleDot,
  Flag,
  Clock3,
  Route as RouteIcon,
  Loader2,
  GitCompareArrows,
  Thermometer,
} from "lucide-react";

import { GoogleRouteMap } from "@/components/heatshield/GoogleRouteMap";

import {
  GlassCard,
  LiveIndicator,
  PageHeader,
  ToneBadge,
} from "@/components/heatshield/primitives";

import { RouteCard } from "@/components/heatshield/cards";

import {
  computeRoutes,
  type RouteOption,
} from "@/lib/heat-engine";

import { useMetro } from "@/lib/metros";

import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/app/safe-route",
)({
  head: () => ({
    meta: [
      {
        title: "AI Safe Route — HeatShield AI",
      },
      {
        name: "description",
        content:
          "Rank routes by thermal exposure — not distance alone.",
      },
      {
        property: "og:title",
        content:
          "AI Safe Route — HeatShield AI",
      },
      {
        property: "og:description",
        content:
          "Rank routes by thermal exposure — not distance alone.",
      },
    ],
  }),

  component: SafeRoutePage,
});

function SafeRoutePage() {
  const { metro } = useMetro();

  const [start, setStart] =
    useState(metro.waypoints.start);

  const [dest, setDest] =
    useState(metro.waypoints.dest);

  const [routes, setRoutes] =
    useState<RouteOption[]>([]);

  const [activeRouteId, setActiveRouteId] =
    useState<string | undefined>();

  const [compare, setCompare] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Reset route state whenever the selected
   * metro changes.
   *
   * This is important because routes are
   * normalized against the selected metro.
   */
  useEffect(() => {
    setStart(metro.waypoints.start);
    setDest(metro.waypoints.dest);
    setRoutes([]);
    setActiveRouteId(undefined);
    setCompare(false);
    setError(null);
  }, [metro]);

  const handleFindRoutes = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!start.trim() || !dest.trim()) {
      setError(
        "Enter both a starting point and destination.",
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const nextRoutes = computeRoutes(
        metro,
        start,
        dest,
      );

      setRoutes(nextRoutes);

      setActiveRouteId(
        nextRoutes[0]?.id,
      );

      if (nextRoutes.length === 0) {
        setError(
          "No safe route candidates were generated.",
        );
      }
    } catch (err) {
      console.error(
        "[HeatShield AI] Route calculation failed:",
        err,
      );

      setRoutes([]);
      setActiveRouteId(undefined);

      setError(
        "Unable to calculate safe routes.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRoutesCalculated = (
    calculatedRoutes: RouteOption[],
  ) => {
    setRoutes(calculatedRoutes);

    setActiveRouteId(
      calculatedRoutes[0]?.id,
    );

    setError(null);
  };

  const handleRouteError = (
    message: string,
  ) => {
    setError(message);
  };

  const activeRoute =
    routes.find(
      (route) =>
        route.id === activeRouteId,
    ) ?? routes[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Safe Route"
        subtitle="Rank routes by thermal exposure — not distance alone."
        right={
          <div className="flex items-center gap-3">
            <ToneBadge tone="cyan">
              {metro.label.toUpperCase()}
            </ToneBadge>

            <LiveIndicator
              label="LIVE"
              tone="mint"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <GlassCard className="p-5">
          <div className="mb-5">
            <p className="font-display text-sm font-semibold">
              Find a thermally safer route
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Routes are ranked using heat
              exposure, solar load and thermal
              risk instead of distance alone.
            </p>
          </div>

          <form
            onSubmit={handleFindRoutes}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="route-start"
                className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-muted-foreground"
              >
                START
              </label>

              <div className="relative">
                <CircleDot className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan" />

                <input
                  id="route-start"
                  value={start}
                  onChange={(event) =>
                    setStart(
                      event.target.value,
                    )
                  }
                  placeholder="Starting location"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="route-destination"
                className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-muted-foreground"
              >
                DESTINATION
              </label>

              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-peach" />

                <input
                  id="route-destination"
                  value={dest}
                  onChange={(event) =>
                    setDest(
                      event.target.value,
                    )
                  }
                  placeholder="Destination"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !start.trim() ||
                !dest.trim()
              }
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold",
                "bg-gradient-to-r from-cyan to-mint text-background",
                "transition-all duration-200",
                "hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Calculating…
                </>
              ) : (
                <>
                  <RouteIcon className="size-4" />
                  Find Safe Routes
                </>
              )}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-danger">
                {error}
              </p>
            </div>
          ) : null}

          {routes.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
                  ROUTE OPTIONS
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setCompare(
                      (value) => !value,
                    )
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                    compare
                      ? "bg-cyan/10 text-cyan"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GitCompareArrows className="size-3.5" />
                  Compare
                </button>
              </div>

              <div className="space-y-2.5">
                {routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    active={
                      route.id ===
                      activeRouteId
                    }
                    onSelect={(id: string) => {
                      setCompare(false);
                      setActiveRouteId(id);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-center">
              <RouteIcon className="mx-auto size-5 text-muted-foreground" />

              <p className="mt-2 text-xs font-semibold">
                No routes calculated yet
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Enter a start and destination
                to compare thermal exposure.
              </p>
            </div>
          )}

          {activeRoute ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
                SELECTED ROUTE
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat
                  icon={Clock3}
                  label="Time"
                  value={`${activeRoute.timeMin} min`}
                />

                <Stat
                  icon={Thermometer}
                  label="Exposure"
                  value={`${activeRoute.exposure}/100`}
                />
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="min-h-[560px] overflow-hidden p-0">
          <GoogleRouteMap
            key={metro.id}
            metro={metro}
            start={start}
            destination={dest}
            routes={routes}
            {...(
              activeRouteId !==
              undefined
                ? {
                    activeRouteId,
                  }
                : {}
            )}
            compare={compare}
            onRoutesCalculated={
              handleRoutesCalculated
            }
            onRouteError={
              handleRouteError
            }
            className="min-h-[560px] rounded-none border-0"
          />
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />

        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
          {label.toUpperCase()}
        </p>
      </div>

      <p className="mt-1 font-display text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20";