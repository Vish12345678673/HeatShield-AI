import { MetroSwitcher } from "@/components/heatshield/MetroSwitcher";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMetro } from "@/lib/metros";
import {
  Box,
  Crosshair,
  Flame,
  Map as MapIcon,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  HEAT_LAYERS,
  HeatLegend,
  layerValue,
  type HeatLayer,
} from "@/components/heatshield/HeatMap";
import { GoogleHeatMap } from "@/components/heatshield/GoogleHeatMap";
import {
  GlassCard,
  LiveIndicator,
  PageHeader,
} from "@/components/heatshield/primitives";
import {
  ZONES,
  riskBand,
  timeAgo,
  useLiveReading,
} from "@/lib/heat-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/map")({
  head: () => ({
    meta: [
      { title: "Heat Map — HeatShield AI" },
      {
        name: "description",
        content:
          "Real-time thermal map of Las Vegas — live hotspots, heat zones and population exposure from the FORTYGUARD Live Data Layer on an interactive city map.",
      },
      {
        property: "og:title",
        content: "Heat Map — HeatShield AI",
      },
      {
        property: "og:description",
        content:
          "Real-time thermal map of Las Vegas — live hotspots, heat zones and population exposure.",
      },
    ],
  }),
  component: HeatMapPage,
});

function HeatMapPage() {
  const { metro } = useMetro();
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [layer, setLayer] = useState<HeatLayer>("risk");
  const { reading, status } = useLiveReading();
  const [now, setNow] = useState(() => Date.now());
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, []);

  const ranked = [...ZONES].sort(
    (a, b) => layerValue(b, layer) - layerValue(a, layer),
  );

  const hottest = ranked[0]!;

  const avgRisk = Math.round(
    ZONES.reduce((sum, z) => sum + layerValue(z, layer), 0) / ZONES.length,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Urban Heat Intelligence"
        subtitle={`Real-time thermal exposure across ${metro.city} on a live city map.`}
        right={
          <div className="flex items-center gap-2">
            {/* Metro selector */}
            <MetroSwitcher />

            {/* 2D / 3D toggle */}
            <div className="glass-panel flex rounded-full p-1">
              {[
                {
                  key: "2d",
                  label: "2D Heat Map",
                  icon: MapIcon,
                },
                {
                  key: "3d",
                  label: "3D Satellite",
                  icon: Box,
                },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key as "2d" | "3d")}
                  aria-pressed={mode === m.key}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-xs font-semibold transition-all duration-300",
                    mode === m.key
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  style={
                    mode === m.key
                      ? { background: "var(--gradient-peach)" }
                      : undefined
                  }
                >
                  <m.icon className="size-3.5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="relative">
        <GoogleHeatMap
          metro={metro}
          mode={mode}
          zones={ZONES}
          layer={layer}
          focusZoneId={focus?.id}
          focusNonce={focus?.n}
          className="h-[62vh] min-h-[420px] w-full"
        />

        {/* Floating control panel */}
        <GlassCard className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] p-3.5 sm:max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <LiveIndicator
              label={
                status === "live"
                  ? "LIVE DATA"
                  : "LIVE DATA · SIMULATED"
              }
              tone={status === "live" ? "mint" : "peach"}
            />

            <span className="text-[10px] text-muted-foreground tabular-nums">
              Updated{" "}
              {reading
                ? timeAgo(reading.updatedAt, now)
                : "—"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {HEAT_LAYERS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLayer(l.key)}
                aria-pressed={layer === l.key}
                className={cn(
                  "rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200",
                  layer === l.key
                    ? "border-transparent text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-peach/40 hover:text-foreground",
                )}
                style={
                  layer === l.key
                    ? { background: "var(--gradient-peach)" }
                    : undefined
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Live metro stats */}
        <GlassCard className="absolute right-3 top-3 hidden p-3.5 md:block">
          <p className="font-display text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            METRO STATUS
          </p>

          <div className="mt-2 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Flame className="size-3 text-peach" />
                Hottest
              </span>

              <span className="font-semibold">
                {hottest.district}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">
                Avg intensity
              </span>

              <span
                className="font-semibold tabular-nums"
                style={{ color: riskBand(avgRisk).hex }}
              >
                {avgRisk}/100
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-3 text-mint" />
                Zones
              </span>

              <span className="font-semibold tabular-nums">
                {ZONES.length} monitored
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Legend */}
        <HeatLegend className="absolute bottom-3 left-3" />

        {/* Map hint */}
        <p className="absolute bottom-3 right-3 hidden rounded-full bg-popover/70 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur sm:block">
          Scroll to zoom · drag to pan · hover zones for details
        </p>
      </div>

      {/* Priority zones */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wide">
            Priority Zones

            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              ranked by live{" "}
              {HEAT_LAYERS.find(
                (l) => l.key === layer,
              )?.label.toLowerCase()}
            </span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ranked.slice(0, 4).map((z, i) => {
            const v = Math.round(layerValue(z, layer));
            const band = riskBand(v);

            return (
              <GlassCard
                key={z.id}
                className="group p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
                      #{i + 1} · {z.name.toUpperCase()}
                    </p>

                    <p className="mt-1 font-display text-sm font-semibold">
                      {z.district}
                    </p>
                  </div>

                  <span
                    className="rounded-full px-2 py-0.5 font-display text-[11px] font-bold tabular-nums"
                    style={{
                      color: band.hex,
                      background: `${band.hex}1f`,
                    }}
                  >
                    {v}
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${v}%`,
                      background: band.hex,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {z.trend >= 0 ? (
                      <TrendingUp className="size-3 text-coral" />
                    ) : (
                      <TrendingDown className="size-3 text-mint" />
                    )}

                    {z.trend >= 0 ? "+" : ""}
                    {z.trend}° trend
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setFocus({
                        id: z.id,
                        n: Date.now(),
                      })
                    }
                    className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium transition-all duration-200 hover:border-peach/50 hover:text-peach"
                  >
                    <Crosshair className="size-3" />
                    Focus
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}