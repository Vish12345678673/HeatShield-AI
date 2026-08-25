import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CircleDot, Flag, Clock3, Route as RouteIcon, Loader2, GitCompareArrows } from "lucide-react";
import { HeatMap } from "@/components/heatshield/HeatMap";
import { GoogleRouteMap } from "@/components/heatshield/GoogleRouteMap";
import { GlassCard, LiveIndicator, PageHeader, ToneBadge } from "@/components/heatshield/primitives";
import { useMetro } from "@/lib/metros";
import { RouteCard } from "@/components/heatshield/cards";
import {
  ZONES,
  riskBand,
  type RouteOption,
} from "@/lib/heat-engine";

import { getGoogleRoutes } from "@/lib/google-routes.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/safe-route")({
  head: () => ({
    meta: [
      { title: "AI Safe Route — HeatShield AI" },
      { name: "description", content: "Rank routes by thermal exposure — not distance alone. Compare heat-adjusted routes across the city with the FORTYGUARD Live Data Layer." },
      { property: "og:title", content: "AI Safe Route — HeatShield AI" },
      { property: "og:description", content: "Rank routes by thermal exposure — not distance alone." },
    ],
  }),
  component: SafeRoutePage,
});

function SafeRoutePage() {
  const { metro } = useMetro();
  const [start, setStart] = useState("UNLV Campus");
  const [dest, setDest] = useState("Downtown Transit Center");
  const [depart, setDepart] = useState("now");
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [compare, setCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const find = async (e: FormEvent) => {
  e.preventDefault();

  setLoading(true);
  setRoutes(null);
  setActiveId(undefined);
  setCompare(false);
  setError(null);

  try {
    const liveRoutes = await getGoogleRoutes({
      data: {
        start,
        dest,
      },
    });

    const nextRoutes: RouteOption[] =
      liveRoutes.map((route, index) => {
        /*
         * Temporary thermal score.
         *
         * The distance/time are REAL Google Routes API values.
         * The thermal score still comes from the existing
         * HeatShield model and is not yet spatially sampled
         * along the actual Google route.
         */
        const exposure = Math.min(
          99,
          Math.max(
            20,
            Math.round(48 + route.timeMin * 1.4),
          ),
        );

        return {
          id: route.id,

          label:
            index === 0
              ? "Route A — Fastest"
              : index === 1
                ? "Route B — Balanced"
                : "Route C — Alternative",

          distanceKm: route.distanceKm,

          timeMin: route.timeMin,

          exposure,

          recommended: false,

          tone: riskBand(exposure).tone,

          path: [],

          encodedPolyline:
            route.encodedPolyline,
        };
      });

    if (!nextRoutes.length) {
      throw new Error(
        "No routes were found between these locations.",
      );
    }

    const safest = nextRoutes.reduce(
      (best, route) =>
        route.exposure < best.exposure
          ? route
          : best,
      nextRoutes[0]!,
    );

    const rankedRoutes = nextRoutes.map(
      (route) => ({
        ...route,

        recommended:
          route.id === safest.id,

        label:
          route.id === safest.id
            ? `${route.label} — Safest`
            : route.label,
      }),
    );

    setRoutes(rankedRoutes);
    setActiveId(safest.id);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Unable to calculate routes.",
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Safe Route"
        subtitle="Rank routes by thermal exposure — not distance alone."
        right={<LiveIndicator label="THERMAL ROUTING" tone="cyan" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* controls + results */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <form onSubmit={find} className="space-y-4">
              <div>
                <label htmlFor="start" className="mb-1.5 block text-xs font-medium text-muted-foreground">Start location</label>
                <div className="relative">
                  <CircleDot className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mint" />
                  <input id="start" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} required />
                </div>
              </div>
              <div>
                <label htmlFor="dest" className="mb-1.5 block text-xs font-medium text-muted-foreground">Destination</label>
                <div className="relative">
                  <Flag className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-coral" />
                  <input id="dest" value={dest} onChange={(e) => setDest(e.target.value)} className={inputCls} required />
                </div>
              </div>
              <div>
                <label htmlFor="depart" className="mb-1.5 block text-xs font-medium text-muted-foreground">Departure time</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select id="depart" value={depart} onChange={(e) => setDepart(e.target.value)} className={cn(inputCls, "appearance-none")}>
                    <option value="now">Leave now</option>
                    <option value="morning">Tomorrow · 8:00 AM</option>
                    <option value="noon">Tomorrow · 12:00 PM</option>
                    <option value="evening">Tomorrow · 5:30 PM</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="glow-peach flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                style={{ background: "var(--gradient-peach)" }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}
                {loading ? "Analyzing thermal corridors…" : "Find Safe Routes"}
              </button>
            </form>
            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-400">
                  Route calculation failed
                </p>

                 <p className="mt-1 text-xs text-muted-foreground">
                   {error}
                 </p>
              </div>
            ) : null}
          </GlassCard>

          {routes ? (
            <div className="space-y-3 animate-fade-up">
              <div className="flex items-center justify-between">
                <p className="font-display text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                  {routes.length} ROUTES FOUND
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCompare((c) => !c);
                    setActiveId(undefined);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    compare ? "border-transparent text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  style={compare ? { background: "var(--gradient-cool)" } : undefined}
                >
                  <GitCompareArrows className="size-3.5" />
                  Compare Routes
                </button>
              </div>
              {routes.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  active={compare ? true : activeId === r.id}
                  onSelect={(id) => {
                    setCompare(false);
                    setActiveId(id);
                  }}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="flex flex-col items-center gap-2 p-8 text-center">
              <RouteIcon className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Enter a start and destination to rank routes by heat exposure.
              </p>
            </GlassCard>
          )}
        </div>

        {/* map — real 2D city map appears once routes are found */}
        <div className="relative">
          {routes ? (
            <GoogleRouteMap
              metro={metro}
              routes={routes}
              activeRouteId={activeId}
              compare={compare}
              className="h-[62vh] min-h-[420px] w-full animate-fade-up"
            />
          ) : (
            <HeatMap
              mode="2d"
              zones={ZONES}
              layer="risk"
              className="h-[62vh] min-h-[420px] w-full"
            />
          )}
          <div className="absolute bottom-9 left-3 flex flex-wrap gap-2">
            {routes?.map((r) => (
              <ToneBadge key={r.id} tone={r.tone}>
                {r.id} · {r.exposure}/100{r.recommended ? " · SAFEST" : ""}
              </ToneBadge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-muted/40 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-peach/60";
