import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  TreePine, Home, Tent, Snowflake, Play, Loader2, Info,
  ArrowRight, Thermometer, Users, Gauge, type LucideIcon,
} from "lucide-react";
import { ChartCard } from "@/components/heatshield/cards";
import { RiskGauge } from "@/components/heatshield/RiskGauge";
import {
  AnimatedNumber, GlassCard, PageHeader, ToneBadge,
} from "@/components/heatshield/primitives";
import {
  simulateIntervention, riskBand, type SimulationInput, type SimulationResult,
} from "@/lib/heat-engine";

export const Route = createFileRoute("/app/simulator")({
  head: () => ({
    meta: [
      { title: "Intervention Simulator — HeatShield AI" },
      { name: "description", content: "Model potential heat-reduction scenarios before implementation — trees, cool roofs, shade structures and cooling stations." },
      { property: "og:title", content: "Intervention Simulator — HeatShield AI" },
      { property: "og:description", content: "Model potential heat-reduction scenarios before implementation." },
    ],
  }),
  component: SimulatorPage,
});

const CONTROLS: {
  key: keyof SimulationInput;
  label: string;
  icon: LucideIcon;
  hint: string;
  color: string;
}[] = [
  { key: "trees", label: "Trees", icon: TreePine, hint: "Street & park canopy coverage", color: "var(--mint)" },
  { key: "roofs", label: "Reflective Roofs", icon: Home, hint: "High-albedo roof conversion", color: "var(--cyan)" },
  { key: "shade", label: "Shade Structures", icon: Tent, hint: "Pergolas, awnings, bus stops", color: "var(--amber)" },
  { key: "stations", label: "Cooling Stations", icon: Snowflake, hint: "Public hydration & cooling points", color: "var(--lavender)" },
];

function SimulatorPage() {
  const [input, setInput] = useState<SimulationInput>({ trees: 60, roofs: 55, shade: 40, stations: 35 });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const preview = useMemo(() => simulateIntervention(input), [input]);

  const run = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(simulateIntervention(input));
      setRunning(false);
    }, 1400);
  };

  const shown = result ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Intervention Simulator"
        subtitle="Model potential heat-reduction scenarios before implementation."
        right={<ToneBadge tone="cyan">SCENARIO BUILDER</ToneBadge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* controls */}
        <GlassCard className="space-y-5 p-5">
          {CONTROLS.map((c) => (
            <div key={c.key}>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`sim-${c.key}`} className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ color: c.color, background: `color-mix(in oklab, ${c.color} 12%, transparent)` }}
                  >
                    <c.icon className="size-3.5" />
                  </span>
                  {c.label}
                </label>
                <span className="font-display text-sm font-semibold tabular-nums" style={{ color: c.color }}>
                  {input[c.key]}%
                </span>
              </div>
              <input
                id={`sim-${c.key}`}
                type="range"
                min={0}
                max={100}
                value={input[c.key]}
                onChange={(e) => setInput((s) => ({ ...s, [c.key]: Number(e.target.value) }))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground"
                style={{
                  background: `linear-gradient(90deg, ${c.color} ${input[c.key]}%, var(--muted) ${input[c.key]}%)`,
                }}
                aria-label={c.label}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
            </div>
          ))}

          <button
            type="button"
            onClick={run}
            disabled={running}
            className="glow-peach flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--gradient-peach)" }}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Simulating city response…" : "Simulate Impact"}
          </button>

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-cyan" />
            Scenario estimate — not a validated physical cooling model.
          </p>
        </GlassCard>

        {/* results */}
        <div className="space-y-4">
          <ChartCard title="Projected Risk Reduction" subtitle={running ? "Running scenario…" : "Before → after comparison"}>
            {running ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-peach" />
                <p className="text-sm">Propagating interventions through the thermal model…</p>
              </div>
            ) : shown ? (
              <div className="animate-fade-up">
                <div className="flex flex-wrap items-center justify-center gap-6 py-4 md:gap-10">
                  <RiskGauge score={shown.before} size={130} label="BEFORE" />
                  <div className="flex flex-col items-center">
                    <ArrowRight className="size-7 text-peach" />
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight">
                      <span className="text-danger">{shown.before}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="text-mint">{shown.after}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">risk index</p>
                  </div>
                  <RiskGauge score={shown.after} size={130} label="AFTER" />
                </div>

                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ResultStat
                    icon={Thermometer}
                    label="Estimated Temperature Change"
                    value={<AnimatedNumber value={shown.deltaTemp} decimals={2} suffix="°C" />}
                    tone="var(--cyan)"
                  />
                  <ResultStat
                    icon={Gauge}
                    label="Exposure"
                    value={
                      <span className="tabular-nums">
                        {shown.exposureBefore} <span className="text-muted-foreground">→</span>{" "}
                        <span style={{ color: riskBand(shown.after).hex }}>{shown.exposureAfter}</span>
                      </span>
                    }
                    tone="var(--amber)"
                  />
                  <ResultStat
                    icon={Users}
                    label="People Protected"
                    value={<AnimatedNumber value={shown.peopleProtected} />}
                    tone="var(--mint)"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Gauge className="size-8 text-muted-foreground/50" />
                <p className="max-w-xs text-sm">
                  Adjust the intervention sliders and press{" "}
                  <span className="font-semibold text-foreground">Simulate Impact</span> to project the city response.
                </p>
                <p className="text-xs">
                  Current slider mix projects risk <span className="font-semibold text-peach">{preview.before} → {preview.after}</span>
                </p>
              </div>
            )}
          </ChartCard>

          <GlassCard className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-cyan" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Scenario estimate — not a validated physical cooling model. Projections combine
              published intervention efficacies with the city's current thermal profile from the
              FORTYGUARD Live Data Layer, and are intended for comparative planning only.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ResultStat({
  icon: Icon, label, value, tone,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
      <Icon className="mx-auto size-4" />
      <p className="mt-2 font-display text-xl font-semibold tracking-tight" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
