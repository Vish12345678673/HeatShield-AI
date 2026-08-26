import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Crosshair,
  Flame,
  Map as MapIcon,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { MetroSwitcher } from "@/components/heatshield/MetroSwitcher";

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
  zonesFor,
  riskBand,
  timeAgo,
  useLiveReading,
} from "@/lib/heat-engine";

import { useMetro } from "@/lib/metros";

import { cn } from "@/lib/utils";

export const Route =
  createFileRoute(
    "/app/map",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Heat Map — HeatShield AI",
        },
        {
          name: "description",
          content:
            "Real-time thermal exposure on a live city map.",
        },
        {
          property: "og:title",
          content:
            "Heat Map — HeatShield AI",
        },
        {
          property:
            "og:description",
          content:
            "Real-time thermal exposure on a live city map.",
        },
      ],
    }),

    component: HeatMapPage,
  });

function HeatMapPage() {
  const { metro } =
    useMetro();

  /*
   * Zones are generated from the
   * currently selected metro.
   */
  const zones = useMemo(
    () => zonesFor(metro),
    [metro],
  );

  const [mode, setMode] =
    useState<
      "2d" | "3d"
    >("2d");

  const [layer, setLayer] =
    useState<HeatLayer>(
      "risk",
    );

  const {
    reading,
    status,
  } =
    useLiveReading(metro);

  const [now, setNow] =
    useState(() =>
      Date.now(),
    );

  const [focus, setFocus] =
    useState<{
      id: string;
      n: number;
    } | null>(null);

  /*
   * Clock used by the
   * "Updated X ago" label.
   */
  useEffect(() => {
    const id =
      window.setInterval(
        () =>
          setNow(
            Date.now(),
          ),
        1000,
      );

    return () =>
      window.clearInterval(
        id,
      );
  }, []);

  /*
   * Rank zones according to
   * the currently selected layer.
   */
  const ranked =
    useMemo(
      () =>
        [...zones].sort(
          (a, b) =>
            layerValue(
              b,
              layer,
            ) -
            layerValue(
              a,
              layer,
            ),
        ),
      [zones, layer],
    );

  const hottest =
    ranked[0];

  const avgRisk =
    zones.length > 0
      ? Math.round(
          zones.reduce(
            (
              sum,
              zone,
            ) =>
              sum +
              layerValue(
                zone,
                layer,
              ),
            0,
          ) /
            zones.length,
        )
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Urban Heat Intelligence"
        subtitle={`Real-time thermal exposure across ${metro.city} on a live city map.`}
        right={
          <div className="flex items-center gap-2">
            <MetroSwitcher />

            <div className="glass-panel flex rounded-full p-1">
              {[
                {
                  key: "2d",
                  label:
                    "2D Heat Map",
                  icon: MapIcon,
                },
                {
                  key: "3d",
                  label:
                    "3D Satellite",
                  icon: Box,
                },
              ].map(
                (item) => {
                  const active =
                    mode ===
                    item.key;

                  return (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        setMode(
                          item.key as
                            | "2d"
                            | "3d",
                        )
                      }
                      aria-pressed={
                        active
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-xs font-semibold transition-all duration-300",
                        active
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      style={
                        active
                          ? {
                              background:
                                "var(--gradient-peach)",
                            }
                          : undefined
                      }
                    >
                      <item.icon className="size-3.5" />
                      {item.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        }
      />

      <div className="relative">
        {/*
         * KEY IS CRITICAL.
         *
         * Google Maps is imperative and keeps
         * internal state outside React.
         *
         * Changing metro.id forces a complete
         * GoogleHeatMap remount so the old
         * city's map/markers/overlays cannot
         * survive the metro change.
         */}
        <GoogleHeatMap
          key={metro.id}
          metro={metro}
          mode={mode}
          zones={zones}
          layer={layer}
          focusZoneId={
            focus?.id
          }
          focusNonce={
            focus?.n
          }
          className="h-[62vh] min-h-[420px] w-full"
        />

        <GlassCard className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] p-3.5 sm:max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <LiveIndicator
              label={
                status ===
                "live"
                  ? "LIVE DATA"
                  : "LIVE DATA · SIMULATED"
              }
              tone={
                status ===
                "live"
                  ? "mint"
                  : "peach"
              }
            />

            <span className="text-[10px] text-muted-foreground tabular-nums">
              Updated{" "}
              {reading
                ? timeAgo(
                    reading.updatedAt,
                    now,
                  )
                : "—"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {HEAT_LAYERS.map(
              (item) => {
                const active =
                  layer ===
                  item.key;

                return (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() =>
                      setLayer(
                        item.key,
                      )
                    }
                    aria-pressed={
                      active
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200",
                      active
                        ? "border-transparent text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-peach/40 hover:text-foreground",
                    )}
                    style={
                      active
                        ? {
                            background:
                              "var(--gradient-peach)",
                          }
                        : undefined
                    }
                  >
                    {
                      item.label
                    }
                  </button>
                );
              },
            )}
          </div>
        </GlassCard>

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
                {hottest?.district ??
                  "—"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">
                Avg intensity
              </span>

              <span
                className="font-semibold tabular-nums"
                style={{
                  color:
                    riskBand(
                      avgRisk,
                    ).hex,
                }}
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
                {zones.length}{" "}
                monitored
              </span>
            </div>
          </div>
        </GlassCard>

        <HeatLegend className="absolute bottom-3 left-3" />

        <p className="absolute bottom-3 right-3 hidden rounded-full bg-popover/70 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur sm:block">
          Scroll to zoom · drag
          to pan · hover zones
          for details
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wide">
            Priority Zones

            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              ranked by live{" "}
              {HEAT_LAYERS.find(
                (item) =>
                  item.key ===
                  layer,
              )
                ?.label.toLowerCase()}
            </span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ranked
            .slice(0, 4)
            .map(
              (
                zone,
                index,
              ) => {
                const value =
                  Math.round(
                    layerValue(
                      zone,
                      layer,
                    ),
                  );

                const band =
                  riskBand(
                    value,
                  );

                return (
                  <GlassCard
                    key={
                      zone.id
                    }
                    className="group p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
                          #
                          {index +
                            1}{" "}
                          ·{" "}
                          {zone.name.toUpperCase()}
                        </p>

                        <p className="mt-1 font-display text-sm font-semibold">
                          {
                            zone.district
                          }
                        </p>
                      </div>

                      <span
                        className="rounded-full px-2 py-0.5 font-display text-[11px] font-bold tabular-nums"
                        style={{
                          color:
                            band.hex,
                          background:
                            `${band.hex}1f`,
                        }}
                      >
                        {value}
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${value}%`,
                          background:
                            band.hex,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {zone.trend >=
                        0 ? (
                          <TrendingUp className="size-3 text-coral" />
                        ) : (
                          <TrendingDown className="size-3 text-mint" />
                        )}

                        {zone.trend >=
                        0
                          ? "+"
                          : ""}
                        {
                          zone.trend
                        }
                        ° trend
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setFocus(
                            {
                              id: zone.id,
                              n: Date.now(),
                            },
                          )
                        }
                        className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium transition-all duration-200 hover:border-peach/50 hover:text-peach"
                      >
                        <Crosshair className="size-3" />
                        Focus
                      </button>
                    </div>
                  </GlassCard>
                );
              },
            )}
        </div>
      </section>
    </div>
  );
}