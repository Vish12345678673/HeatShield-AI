import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  TriangleAlert, CalendarClock, Coffee, Ban, Droplets, Sunset,
} from "lucide-react";
import { GradientCard, LiveIndicator, PageHeader, ToneBadge } from "@/components/heatshield/primitives";
import { ChartCard } from "@/components/heatshield/cards";
import { RiskGauge } from "@/components/heatshield/RiskGauge";
import { SafetyTimeline } from "@/components/heatshield/SafetyTimeline";
import { useLiveReading, workerGuidance } from "@/lib/heat-engine";
import type { Tone } from "@/components/heatshield/primitives";

export const Route = createFileRoute("/app/worker")({
  head: () => ({
    meta: [
      { title: "Worker Heat Safety — HeatShield AI" },
      { name: "description", content: "Protect workers before exposure becomes dangerous — safe work windows, mandatory breaks and hydration guidance." },
      { property: "og:title", content: "Worker Heat Safety — HeatShield AI" },
      { property: "og:description", content: "Protect workers before exposure becomes dangerous." },
    ],
  }),
  component: WorkerPage,
});

function WorkerPage() {
  const { reading, status } = useLiveReading();
  const guidance = useMemo(() => workerGuidance(reading), [reading]);

  const cards: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub: string;
    tone: Tone;
  }[] = [
    { icon: TriangleAlert, label: "Current Risk", value: guidance.riskLabel, sub: `City risk index ${reading?.riskScore ?? 92}/100`, tone: "danger" },
    { icon: CalendarClock, label: "Recommended Work Window", value: guidance.workWindow, sub: "Lowest thermal load today", tone: "mint" },
    { icon: Coffee, label: "Mandatory Break", value: `Every ${guidance.breakEveryMin} minutes`, sub: "Shaded recovery, 10 min minimum", tone: "amber" },
    { icon: Ban, label: "Avoid Exposure", value: guidance.avoidWindow, sub: "Peak solar + heat index overlap", tone: "high" },
    { icon: Droplets, label: "Hydration", value: guidance.hydration, sub: "250ml every 20 minutes", tone: "cyan" },
    { icon: Sunset, label: "Next Safe Window", value: guidance.nextSafeWindow, sub: "Risk drops below moderate", tone: "lavender" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Worker Heat Safety"
        subtitle="Protect workers before exposure becomes dangerous."
        right={
          <div className="flex items-center gap-3">
            <ToneBadge tone={guidance.tone}>OUTDOOR WORK · {guidance.riskLabel}</ToneBadge>
            <LiveIndicator label={status === "live" ? "LIVE" : "SIMULATED"} tone={status === "live" ? "mint" : "peach"} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <GradientCard
            key={c.label}
            tone={c.tone}
            className="p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
                {c.label.toUpperCase()}
              </p>
              <c.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-xl font-semibold tracking-tight">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </GradientCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <ChartCard title="Heat Safety Timeline" subtitle="Safe → Caution → Dangerous → Extreme → Safe · today" live>
          <SafetyTimeline segments={guidance.timeline} className="py-2" />
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span><span className="font-semibold text-mint">Safe</span> — unrestricted outdoor work</span>
            <span><span className="font-semibold text-amber">Caution</span> — schedule shade breaks</span>
            <span><span className="font-semibold text-heat">Dangerous</span> — essential work only</span>
            <span><span className="font-semibold text-danger">Extreme</span> — suspend outdoor work</span>
          </div>
        </ChartCard>

        <ChartCard title="Worker Safety Score" subtitle="Higher is safer">
          <div className="flex flex-col items-center py-2">
            <RiskGauge
              score={guidance.score}
              size={150}
              tone={guidance.score > 40 ? "mint" : guidance.score > 20 ? "amber" : "danger"}
              label={guidance.score > 40 ? "SAFE" : guidance.score > 20 ? "CAUTION" : "UNSAFE"}
            />
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              Derived from live heat index, solar load and duration of exposure windows.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
