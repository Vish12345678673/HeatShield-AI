import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BrainCircuit, Clock3, Target } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCard } from "@/components/heatshield/cards";
import { AnimatedNumber, GlassCard, LiveIndicator, PageHeader, ProgressTrack } from "@/components/heatshield/primitives";
import { RiskGauge } from "@/components/heatshield/RiskGauge";
import { TONE_HEX, forecastSeries, riskBand } from "@/lib/heat-engine";

export const Route = createFileRoute("/app/prediction")({
  head: () => ({
    meta: [
      { title: "Heat Risk Prediction — HeatShield AI" },
      { name: "description", content: "AI-powered forecasting of thermal risk — risk forecast, factor breakdown and heat intensity matrix." },
      { property: "og:title", content: "Heat Risk Prediction — HeatShield AI" },
      { property: "og:description", content: "AI-powered forecasting of thermal risk." },
    ],
  }),
  component: PredictionPage,
});

const tooltipStyle = {
  background: "oklch(0.21 0.026 262)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
} as const;

const FACTORS = [
  { name: "Temperature", value: 92 },
  { name: "Heat Index", value: 88 },
  { name: "Humidity", value: 64 },
  { name: "Solar Exposure", value: 76 },
  { name: "Historical Trend", value: 58 },
];

const FACTOR_COLORS = ["#FF8F70", "#FF9F32", "#29C7D9", "#FFB39C", "#9F8FF0"];

const MATRIX_DAYS = ["Today", "Tue", "Wed", "Thu", "Fri"];
const MATRIX_HOURS = [6, 9, 12, 15, 18, 21];

function matrixValue(day: number, hour: number): number {
  const peak = Math.exp(-Math.pow(hour - 15, 2) / (2 * 3 * 3));
  const base = 22 + 66 * peak;
  const drift = day * 2.4;
  const wave = Math.sin(day * 2.1 + hour) * 5;
  return Math.round(Math.max(8, Math.min(99, base + drift + wave)));
}

function PredictionPage() {
  const series = useMemo(() => forecastSeries(), []);
  const nowHour = `${String(new Date().getHours()).padStart(2, "0")}:00`;
  const peakRisk = useMemo(() => Math.max(...series.map((p) => p.risk)), [series]);
  const band = riskBand(peakRisk);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Heat Risk Prediction"
        subtitle="AI-powered forecasting of thermal risk."
        right={<LiveIndicator label="MODEL v2.4 · ENSEMBLE" tone="cyan" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* forecast chart */}
        <ChartCard
          className="lg:col-span-2"
          title="Heat Risk Forecast"
          subtitle="Past 12h → now → next 24h"
          live
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF9F32" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF9F32" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
                <ReferenceLine x={nowHour} stroke="#FFB39C" strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: "NOW", position: "top", fontSize: 9, fill: "#FFB39C" }} />
                <ReferenceLine y={85} stroke="#FF5C5C" strokeDasharray="4 6" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="risk" name="Predicted risk" unit="/100" stroke="#FF9F32" strokeWidth={2.5} fill="url(#forecastFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* prediction summary */}
        <GlassCard className="relative flex flex-col items-center justify-center overflow-hidden p-6 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(100% 80% at 50% 0%, color-mix(in oklab, var(--danger) 14%, transparent), transparent 60%)" }}
          />
          <p className="relative font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
            PREDICTION SUMMARY
          </p>
          <RiskGauge score={peakRisk} size={150} className="relative mt-3" />
          <div className="relative mt-4 grid w-full grid-cols-2 gap-2 text-left">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" /> Expected peak</p>
              <p className="mt-0.5 font-display text-sm font-semibold tabular-nums">15:00</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Target className="size-3" /> Confidence</p>
              <p className="mt-0.5 font-display text-sm font-semibold text-mint">
                <AnimatedNumber value={91} suffix="%" />
              </p>
            </div>
          </div>
          <div className="relative mt-3 w-full">
            <ProgressTrack value={91} tone="mint" />
            <p className="mt-1.5 text-[10px] text-muted-foreground">Model confidence · {band.label} band</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* factor breakdown */}
        <ChartCard title="Risk Factor Breakdown" subtitle="Relative contribution to today's peak risk">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FACTORS} layout="vertical" margin={{ top: 0, right: 16, left: 24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#C6CEDD" }} tickLine={false} axisLine={false} width={104} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" name="Contribution" unit="%" radius={[0, 8, 8, 0]} barSize={16}>
                  {FACTORS.map((f, i) => (
                    <Cell key={f.name} fill={FACTOR_COLORS[i % FACTOR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* heat intensity matrix */}
        <ChartCard title="Heat Intensity Matrix" subtitle="Risk by hour × day — hover cells for detail">
          <div className="space-y-1.5">
            <div className="grid" style={{ gridTemplateColumns: `64px repeat(${MATRIX_HOURS.length}, 1fr)` }}>
              <span />
              {MATRIX_HOURS.map((h) => (
                <span key={h} className="text-center text-[10px] text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {MATRIX_DAYS.map((day, d) => (
              <div key={day} className="grid items-center gap-1.5" style={{ gridTemplateColumns: `64px repeat(${MATRIX_HOURS.length}, 1fr)` }}>
                <span className="text-[11px] text-muted-foreground">{day}</span>
                {MATRIX_HOURS.map((h) => {
                  const v = matrixValue(d, h);
                  const b = riskBand(v);
                  return (
                    <div
                      key={h}
                      title={`${day} ${String(h).padStart(2, "0")}:00 — risk ${v}/100 (${b.label})`}
                      className="flex h-9 items-center justify-center rounded-lg text-[10px] font-semibold transition-transform duration-200 hover:scale-105"
                      style={{
                        background: `color-mix(in oklab, ${b.hex} ${18 + v * 0.5}%, transparent)`,
                        color: v > 60 ? "#0B0F1C" : "#E7ECF5",
                      }}
                    >
                      {v}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-end gap-3 pt-2 text-[10px] text-muted-foreground">
              {(["low", "moderate", "high", "extreme"] as const).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: TONE_HEX[t] }} />
                  {t[0]!.toUpperCase() + t.slice(1)}
                </span>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <GlassCard className="flex items-start gap-3 p-4">
        <BrainCircuit className="mt-0.5 size-4 shrink-0 text-lavender" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Forecasts blend the FORTYGUARD Live Data Layer with an ensemble thermal model.
          Confidence reflects agreement between live observations and the diurnal baseline.
        </p>
      </GlassCard>
    </div>
  );
}
