import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  Thermometer,
  Activity,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth";

import {
  last24h,
  peakHeatWindow,
  timeAgo,
  useLiveReading,
} from "@/lib/heat-engine";

import {
  MetricCard,
  ChartCard,
} from "@/components/heatshield/cards";

import {
  AnimatedNumber,
  GlassCard,
  LiveIndicator,
  ToneBadge,
} from "@/components/heatshield/primitives";

import { RiskGauge } from "@/components/heatshield/RiskGauge";

import { useMetro } from "@/lib/metros";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      {
        title: "Command Center — HeatShield AI",
      },
      {
        name: "description",
        content:
          "Your city's live heat intelligence overview — temperature, heat risk, heat index and peak heat, powered by the FORTYGUARD Live Data Layer.",
      },
      {
        property: "og:title",
        content: "Command Center — HeatShield AI",
      },
      {
        property: "og:description",
        content:
          "Your city's live heat intelligence overview, powered by the FORTYGUARD Live Data Layer.",
      },
    ],
  }),
  component: CommandCenter,
});

const tooltipStyle = {
  background: "oklch(0.21 0.026 262)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
} as const;

function CommandCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { metro } = useMetro();

  const {
    reading,
    status,
    refresh,
  } = useLiveReading(metro);

  const history = useMemo(
    () => last24h(new Date(), metro),
    [metro],
  );

  const [now, setNow] =
    useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const id = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(id);
  }, []);

  const hour =
    now !== null
      ? new Date(now).getHours()
      : null;

  const greeting =
    hour === null
      ? "Hello"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

  const firstName =
    user?.name?.split(" ")[0] ?? "there";

  const peak = useMemo(
    () => peakHeatWindow(),
    [],
  );

  /*
   * last24h() already returns HourPoint objects
   * containing the hour value used by the charts.
   *
   * Do NOT access point.ts here.
   */
  const series = history;

  const sparkTemp = series
    .slice(-12)
    .map((point) => point.temp);

  const tempTrend =
    series.length > 1
      ? series[series.length - 1]!.temp -
        series[series.length - 2]!.temp
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <LiveIndicator
              label="FORTYGUARD · LIVE DATA LAYER"
              tone={
                status === "live"
                  ? "mint"
                  : "peach"
              }
            />
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {greeting},{" "}
            <span className="text-gradient-peach">
              {firstName}
            </span>
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Here's your city's heat intelligence
            overview for{" "}
            <span className="font-semibold text-foreground">
              {metro.city}
            </span>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void navigate({
              to: "/app/map",
            })
          }
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-cyan/40 hover:text-foreground"
        >
          Open Heat Map
        </button>
      </header>

      {status === "degraded" ? (
        <GlassCard className="flex flex-wrap items-center justify-between gap-3 border-amber/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-amber">
              Live data temporarily unavailable.
            </span>{" "}
            Showing the simulated thermal model —
            last synchronized{" "}
            {reading
              ? timeAgo(
                  reading.updatedAt,
                  now ?? Date.now(),
                )
              : "—"}
            .
          </p>

          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Thermometer}
          label="Temperature"
          tone="peach"
          spark={sparkTemp}
          sub={
            <span className="flex items-center gap-1.5">
              Feels like{" "}
              {reading
                ? `${reading.feelsLike}°C`
                : "—"}

              {tempTrend >= 0 ? (
                <span className="flex items-center gap-0.5 text-coral">
                  <TrendingUp className="size-3" />
                  {tempTrend.toFixed(1)}°
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-cyan">
                  <TrendingDown className="size-3" />
                  {tempTrend.toFixed(1)}°
                </span>
              )}
            </span>
          }
        >
          <p className="font-display text-3xl font-semibold tracking-tight">
            {reading ? (
              <AnimatedNumber
                value={reading.temperature}
                decimals={1}
                suffix="°C"
              />
            ) : (
              "—"
            )}
          </p>

          <p className="text-xs text-muted-foreground">
            {reading?.location ??
              metro.city ??
              "Loading…"}
          </p>
        </MetricCard>

        <GlassCard
          hover
          className="flex items-center justify-between gap-2 p-5"
        >
          <div>
            <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
              HEAT RISK
            </p>

            <div className="mt-3">
              <ToneBadge
                tone={
                  reading?.riskTone ??
                  "extreme"
                }
              >
                {reading?.riskLabel ??
                  "EXTREME"}
              </ToneBadge>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Exposure index across the metro area
            </p>
          </div>

          <RiskGauge
            score={
              reading?.riskScore ?? 92
            }
            size={124}
          />
        </GlassCard>

        <MetricCard
          icon={Activity}
          label="Heat Index"
          tone="high"
          sub="Humidity-adjusted thermal load"
        >
          <p className="font-display text-3xl font-semibold tracking-tight">
            {reading ? (
              <AnimatedNumber
                value={reading.heatIndex}
                decimals={1}
                suffix="°C"
              />
            ) : (
              "—"
            )}
          </p>

          <ToneBadge
            tone="high"
            className="mt-1"
          >
            VERY HIGH
          </ToneBadge>
        </MetricCard>

        <MetricCard
          icon={Clock}
          label="Peak Heat"
          tone="cyan"
          sub="Time until today's thermal peak"
        >
          <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
            {peak.peak}
          </p>

          <p className="text-xs text-muted-foreground">
            in{" "}
            <span className="font-semibold text-cyan">
              {peak.countdown}
            </span>
          </p>
        </MetricCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Live Temperature"
          subtitle="Last 24 hours · hourly sampling"
          live
        >
          <div className="h-60">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={series}
                margin={{
                  top: 6,
                  right: 6,
                  left: -18,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="tempFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#FF8F70"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="#FF8F70"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="hour"
                  tick={{
                    fontSize: 10,
                    fill: "#8A94A8",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#8A94A8",
                  }}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    "dataMin - 1",
                    "dataMax + 1",
                  ]}
                  unit="°"
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    stroke:
                      "rgba(255,255,255,0.15)",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  stroke="#FF8F70"
                  strokeWidth={2.5}
                  fill="url(#tempFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Temperature vs Heat Index"
          subtitle="How humidity amplifies the heat"
        >
          <div className="h-60">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={series}
                margin={{
                  top: 6,
                  right: 6,
                  left: -18,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="hour"
                  tick={{
                    fontSize: 10,
                    fill: "#8A94A8",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#8A94A8",
                  }}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    "dataMin - 1",
                    "dataMax + 1",
                  ]}
                  unit="°"
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    stroke:
                      "rgba(255,255,255,0.15)",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="temp"
                  name="Temperature"
                  unit="°C"
                  stroke="#FFB39C"
                  strokeWidth={2.5}
                  dot={false}
                  strokeLinecap="round"
                />

                <Line
                  type="monotone"
                  dataKey="heatIndex"
                  name="Heat Index"
                  unit="°C"
                  stroke="#29C7D9"
                  strokeWidth={2.5}
                  dot={false}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-peach" />
              Temperature
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-cyan" />
              Heat Index
            </span>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Risk Trend"
        subtitle="Heat-risk index across the last 24 hours"
        live
      >
        <div className="h-56">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={series}
              margin={{
                top: 6,
                right: 6,
                left: -14,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="riskFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#FF5C5C"
                    stopOpacity={0.32}
                  />
                  <stop
                    offset="60%"
                    stopColor="#FF9F32"
                    stopOpacity={0.12}
                  />
                  <stop
                    offset="100%"
                    stopColor="#FF9F32"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                tick={{
                  fontSize: 10,
                  fill: "#8A94A8",
                }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />

              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "#8A94A8",
                }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />

              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{
                  stroke:
                    "rgba(255,255,255,0.15)",
                }}
              />

              <ReferenceLine
                y={85}
                stroke="#FF5C5C"
                strokeDasharray="4 6"
                strokeOpacity={0.5}
                label={{
                  value: "EXTREME",
                  position:
                    "insideTopRight",
                  fontSize: 9,
                  fill: "#FF5C5C",
                }}
              />

              <ReferenceLine
                y={60}
                stroke="#FF9F32"
                strokeDasharray="4 6"
                strokeOpacity={0.4}
                label={{
                  value: "HIGH",
                  position:
                    "insideTopRight",
                  fontSize: 9,
                  fill: "#FF9F32",
                }}
              />

              <ReferenceLine
                y={40}
                stroke="#F5C04E"
                strokeDasharray="4 6"
                strokeOpacity={0.35}
                label={{
                  value: "MODERATE",
                  position:
                    "insideTopRight",
                  fontSize: 9,
                  fill: "#F5C04E",
                }}
              />

              <Area
                type="monotone"
                dataKey="risk"
                name="Risk"
                unit="/100"
                stroke="#FF9F32"
                strokeWidth={2.5}
                fill="url(#riskFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}