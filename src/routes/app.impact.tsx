import { createFileRoute } from "@tanstack/react-router";
import { Users, MapPinned, Wrench, TrendingDown } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCard } from "@/components/heatshield/cards";
import { ImpactMetric } from "@/components/heatshield/cards";
import { LiveIndicator, PageHeader, ProgressTrack } from "@/components/heatshield/primitives";
import { IMPACT } from "@/lib/heat-engine";

export const Route = createFileRoute("/app/impact")({
  head: () => ({
    meta: [
      { title: "HeatShield Impact — HeatShield AI" },
      { name: "description", content: "Measure decisions, not just temperatures — people protected, high-risk zones addressed, interventions deployed and exposure reduction." },
      { property: "og:title", content: "HeatShield Impact — HeatShield AI" },
      { property: "og:description", content: "Measure decisions, not just temperatures." },
    ],
  }),
  component: ImpactPage,
});

const tooltipStyle = {
  background: "oklch(0.21 0.026 262)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
} as const;

const DONUT_COLORS = ["#3AD6A8", "#29C7D9", "#FFB39C", "#9F8FF0"];

function ImpactPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="HeatShield Impact"
        subtitle="Measure decisions, not just temperatures."
        right={<LiveIndicator label="SEASON 2026 · YTD" tone="mint" />}
      />

      {/* metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ImpactMetric icon={Users} label="People Protected" value={IMPACT.peopleProtected} delta="+12.4% MoM" progress={71} tone="mint" />
        <ImpactMetric icon={MapPinned} label="High-Risk Zones" value={IMPACT.highRiskZones} delta="3 new this week" progress={42} tone="high" />
        <ImpactMetric icon={Wrench} label="Interventions" value={IMPACT.interventions} delta="+6 deployed" progress={58} tone="cyan" />
        <ImpactMetric icon={TrendingDown} label="Exposure Reduction" value={IMPACT.exposureReduction} suffix="%" delta="↓ since March" progress={IMPACT.exposureReduction} tone="peach" />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="People Protected" subtitle="Cumulative, by month" live>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={IMPACT.protectedByMonth} margin={{ top: 6, right: 6, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="impactBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3AD6A8" />
                    <stop offset="100%" stopColor="#29C7D9" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" name="People protected" radius={[8, 8, 0, 0]} fill="url(#impactBar)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Intervention Distribution" subtitle="Deployed measures by type">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={IMPACT.distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {IMPACT.distribution.map((d, i) => (
                    <Cell key={d.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => <span style={{ color: "#C6CEDD", fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Risk Reduction" subtitle="Before vs after, top five intervened zones">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={IMPACT.riskBeforeAfter} margin={{ top: 6, right: 6, left: -14, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8A94A8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "#C6CEDD", fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="before" name="Before" fill="#FF5C5C" radius={[6, 6, 0, 0]} opacity={0.85} />
                <Bar dataKey="after" name="After" fill="#3AD6A8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Exposure Reduction" subtitle="Progress toward the 40% seasonal target">
          <div className="flex h-60 flex-col justify-center gap-5 px-2">
            {[
              { label: "Overall exposure", value: IMPACT.exposureReduction, target: 40, tone: "peach" as const },
              { label: "Outdoor worker exposure", value: 33, target: 45, tone: "cyan" as const },
              { label: "Vulnerable population exposure", value: 24, target: 50, tone: "mint" as const },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-display font-semibold">
                    {row.value}% <span className="font-normal text-muted-foreground">/ {row.target}% target</span>
                  </span>
                </div>
                <ProgressTrack value={(row.value / row.target) * 100} tone={row.tone} trackClassName="h-2.5" />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Reduction measured against the March 2026 baseline using the FORTYGUARD Live Data Layer.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
