import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crown, TreePine, Home, Tent, Snowflake, Wind, Sprout, Users, Flame, type LucideIcon } from "lucide-react";
import { ChartCard } from "@/components/heatshield/cards";
import { HeatMap } from "@/components/heatshield/HeatMap";
import {
  GlassCard, LiveIndicator, PageHeader, ProgressTrack, ToneBadge, toneVar,
} from "@/components/heatshield/primitives";
import { ZONES, geoaiRanking, riskBand, type RankedZone } from "@/lib/heat-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/city")({
  head: () => ({
    meta: [
      { title: "City Heat Planner — HeatShield AI" },
      { name: "description", content: "GeoAI ranks where intervention can protect the most people — a live leaderboard of priority heat-mitigation zones." },
      { property: "og:title", content: "City Heat Planner — HeatShield AI" },
      { property: "og:description", content: "GeoAI ranks where intervention can protect the most people." },
    ],
  }),
  component: CityPage,
});

const INTERVENTION_ICONS: Record<string, LucideIcon> = {
  "Tree Canopy": TreePine,
  "Cool Roofs": Home,
  "Shade Structures": Tent,
  "Cooling Stations": Snowflake,
  "Mist Corridors": Wind,
  "Green Medians": Sprout,
};

function CityPage() {
  const ranking = useMemo(() => geoaiRanking(), []);
  const [selected, setSelected] = useState<string | null>(ranking[0]?.id ?? null);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3, 9);
  const selectedZone = ranking.find((z) => z.id === selected) ?? ranking[0]!;

  return (
    <div className="space-y-5">
      <PageHeader
        title="City Heat Planner"
        subtitle="GeoAI ranks where intervention can protect the most people."
        right={<LiveIndicator label="GEOAI RANKING ENGINE" tone="cyan" />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* podium */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {top3.map((z, i) => (
              <PodiumCard
                key={z.id}
                zone={z}
                position={i + 1}
                active={selected === z.id}
                onSelect={() => setSelected(z.id)}
              />
            ))}
          </div>

          {/* rest of leaderboard */}
          <GlassCard className="divide-y divide-border overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="font-display text-xs font-semibold tracking-[0.16em] text-muted-foreground">
                FULL RANKING
              </p>
              <p className="text-[10px] text-muted-foreground">{ranking.length} zones analysed</p>
            </div>
            {rest.map((z, i) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelected(z.id)}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-accent/40",
                  selected === z.id && "bg-accent/50",
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="w-7 font-display text-sm font-bold text-muted-foreground tabular-nums">
                  #{z.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold">
                    {z.name} <span className="font-normal text-muted-foreground">· {z.district}</span>
                  </p>
                  <div className="mt-1.5 max-w-xs">
                    <ProgressTrack value={z.priority} tone={riskBand(z.priority).tone} />
                  </div>
                </div>
                <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                  <p>Risk <span className="font-semibold" style={{ color: riskBand(z.risk).hex }}>{z.risk}</span></p>
                  <p>Exposure {z.populationPct}%</p>
                </div>
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold"
                  style={{
                    background: `conic-gradient(${riskBand(z.priority).hex} ${z.priority * 3.6}deg, var(--muted) 0deg)`,
                  }}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-card tabular-nums">
                    {z.priority}
                  </span>
                </span>
              </button>
            ))}
          </GlassCard>
        </div>

        {/* zone detail + mini map */}
        <div className="space-y-4">
          <ChartCard title="Zone Preview" subtitle={selectedZone ? `${selectedZone.name} · ${selectedZone.district}` : undefined}>
            <HeatMap
              mode="2d"
              zones={ZONES}
              layer="risk"
              className="h-52 w-full rounded-xl"
            />
          </ChartCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">{selectedZone.name} · {selectedZone.district}</h3>
              <ToneBadge tone={riskBand(selectedZone.risk).tone}>
                RISK {selectedZone.risk}
              </ToneBadge>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <div className="mb-1 flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Flame className="size-3" /> Heat risk</span>
                  <span className="font-semibold text-foreground">{selectedZone.risk}/100</span>
                </div>
                <ProgressTrack value={selectedZone.risk} tone={riskBand(selectedZone.risk).tone} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="size-3" /> Population exposure</span>
                  <span className="font-semibold text-foreground">{selectedZone.populationPct}%</span>
                </div>
                <ProgressTrack value={selectedZone.populationPct} tone="cyan" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Crown className="size-3" /> GeoAI priority</span>
                  <span className="font-semibold text-foreground">{selectedZone.priority}</span>
                </div>
                <ProgressTrack value={selectedZone.priority} tone="peach" />
              </div>
            </div>
            <p className="mt-4 font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
              RECOMMENDED INTERVENTIONS
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedZone.interventions.map((name) => {
                const Icon = INTERVENTION_ICONS[name] ?? TreePine;
                return (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium"
                  >
                    <Icon className="size-3.5 text-mint" />
                    {name}
                  </span>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  zone, position, active, onSelect,
}: {
  zone: RankedZone;
  position: number;
  active: boolean;
  onSelect: () => void;
}) {
  const band = riskBand(zone.risk);
  const isFirst = position === 1;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "glass-panel card-hover relative overflow-hidden rounded-2xl p-5 text-left animate-fade-up",
        isFirst && "glow-peach",
        active && "border-peach/50",
      )}
      style={{ animationDelay: `${position * 90}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, ${isFirst ? "var(--peach)" : toneVar.cyan} ${isFirst ? 18 : 10}%, transparent), transparent 60%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl font-display text-base font-bold",
              isFirst ? "text-primary-foreground" : "bg-muted text-foreground",
            )}
            style={isFirst ? { background: "var(--gradient-peach)" } : undefined}
          >
            {isFirst ? <Crown className="size-4" /> : `#${position}`}
          </span>
          <span
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${band.hex} ${zone.priority * 3.6}deg, var(--muted) 0deg)` }}
          >
            <span className="flex size-11 flex-col items-center justify-center rounded-full bg-card">
              <span className="font-display text-sm font-bold leading-none tabular-nums">{zone.priority}</span>
              <span className="text-[8px] text-muted-foreground">PRIORITY</span>
            </span>
          </span>
        </div>
        <p className="mt-3 font-display text-base font-semibold">{zone.name}</p>
        <p className="text-xs text-muted-foreground">{zone.district}</p>
        <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
          <span>Risk <span className="font-semibold" style={{ color: band.hex }}>{zone.risk}</span></span>
          <span>Exposure <span className="font-semibold text-foreground">{zone.populationPct}%</span></span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {zone.interventions.map((name) => {
            const Icon = INTERVENTION_ICONS[name] ?? TreePine;
            return (
              <span key={name} className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
                <Icon className="size-3 text-mint" />
                {name}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
