import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BrainCircuit,
  Clock3,
  Target,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/heatshield/cards";

import {
  AnimatedNumber,
  GlassCard,
  LiveIndicator,
  PageHeader,
  ProgressTrack,
} from "@/components/heatshield/primitives";

import { RiskGauge } from "@/components/heatshield/RiskGauge";

import {
  TONE_HEX,
  forecastSeries,
  riskBand,
} from "@/lib/heat-engine";

import { useMetro } from "@/lib/metros";

export const Route = createFileRoute(
  "/app/prediction",
)({
  head: () => ({
    meta: [
      {
        title:
          "Heat Risk Prediction — HeatShield AI",
      },
      {
        name: "description",
        content:
          "AI-powered forecasting of thermal risk — risk forecast, factor breakdown and heat intensity matrix.",
      },
      {
        property: "og:title",
        content:
          "Heat Risk Prediction — HeatShield AI",
      },
      {
        property: "og:description",
        content:
          "AI-powered forecasting of thermal risk.",
      },
    ],
  }),

  component: PredictionPage,
});

const tooltipStyle = {
  background:
    "oklch(0.21 0.026 262)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
} as const;

const FACTORS = [
  {
    name: "Temperature",
    value: 92,
  },
  {
    name: "Heat Index",
    value: 88,
  },
  {
    name: "Humidity",
    value: 64,
  },
  {
    name: "Solar Exposure",
    value: 76,
  },
  {
    name: "Historical Trend",
    value: 58,
  },
];

const FACTOR_COLORS = [
  "#FF8F70",
  "#FF9F32",
  "#29C7D9",
  "#FFB39C",
  "#9F8FF0",
];

const MATRIX_DAYS = [
  "Today",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
];

const MATRIX_HOURS = [
  6,
  9,
  12,
  15,
  18,
  21,
];

function matrixValue(
  day: number,
  hour: number,
): number {
  const peak =
    Math.exp(
      -Math.pow(
        hour - 15,
        2,
      ) /
        (2 * 3 * 3),
    );

  const base =
    22 + 66 * peak;

  const drift =
    day * 2.4;

  const wave =
    Math.sin(
      day * 2.1 + hour,
    ) * 5;

  return Math.round(
    Math.max(
      8,
      Math.min(
        99,
        base +
          drift +
          wave,
      ),
    ),
  );
}

function PredictionPage() {
  const { metro } =
    useMetro();

  /*
   * forecastSeries requires:
   * now,
   * pastHours,
   * futureHours,
   * metro.
   *
   * The selected metro is included in the
   * dependency array so changing cities
   * regenerates the forecast.
   */
  const series = useMemo(
    () =>
      forecastSeries(
        new Date(),
        12,
        24,
        metro,
      ),
    [metro],
  );

  const nowHour = `${String(
    new Date().getHours(),
  ).padStart(2, "0")}:00`;

  const peakRisk = useMemo(
    () =>
      series.length
        ? Math.max(
            ...series.map(
              (point) =>
                point.risk,
            ),
          )
        : 0,
    [series],
  );

  const band =
    riskBand(peakRisk);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Heat Risk Prediction"
        subtitle="AI-powered forecasting of thermal risk."
        right={
          <LiveIndicator
            label="MODEL v2.4 · ENSEMBLE"
            tone="cyan"
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Heat Risk Forecast"
          subtitle="Past 12h → now → next 24h"
          live
        >
          <div className="h-64">
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
                    id="forecastFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#FF9F32"
                      stopOpacity={0.35}
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
                  interval={4}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#8A94A8",
                  }}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    0,
                    100,
                  ]}
                />

                <Tooltip
                  contentStyle={
                    tooltipStyle
                  }
                  cursor={{
                    stroke:
                      "rgba(255,255,255,0.15)",
                  }}
                />

                <ReferenceLine
                  x={nowHour}
                  stroke="#FFB39C"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  label={{
                    value: "NOW",
                    position:
                      "top",
                    fontSize: 9,
                    fill: "#FFB39C",
                  }}
                />

                <ReferenceLine
                  y={85}
                  stroke="#FF5C5C"
                  strokeDasharray="4 6"
                  strokeOpacity={0.4}
                />

                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Predicted risk"
                  unit="/100"
                  stroke="#FF9F32"
                  strokeWidth={2.5}
                  fill="url(#forecastFill)"
                  dot={false}
                  activeDot={{
                    r: 4,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <GlassCard className="flex flex-col items-center justify-center p-5">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
            PEAK FORECAST RISK
          </p>

          <div className="mt-3">
            <RiskGauge
              score={peakRisk}
              size={150}
              tone={
                peakRisk >= 85
                  ? "danger"
                  : peakRisk >= 60
                    ? "amber"
                    : "mint"
              }
              label={
                band.label.toUpperCase()
              }
            />
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {metro.id} · next 24 hours
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Risk Drivers"
          subtitle="Factors contributing to predicted heat risk"
        >
          <div className="space-y-4">
            {FACTORS.map(
              (
                factor,
                index,
              ) => (
                <div
                  key={
                    factor.name
                  }
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {
                        factor.name
                      }
                    </span>

                    <span className="font-display text-xs font-semibold">
                      {
                        factor.value
                      }
                      %
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${factor.value}%`,
                        backgroundColor:
                          FACTOR_COLORS[
                            index
                          ],
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Forecast Summary"
          subtitle={`Current metro: ${metro.id}`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <Clock3 className="size-4 text-cyan" />

              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                Forecast Window
              </p>

              <p className="mt-1 font-display text-lg font-semibold">
                24h
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4">
              <Target className="size-4 text-peach" />

              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                Peak Risk
              </p>

              <p className="mt-1 font-display text-lg font-semibold">
                {peakRisk}/100
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4">
              <BrainCircuit className="size-4 text-mint" />

              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                Model
              </p>

              <p className="mt-1 font-display text-lg font-semibold">
                v2.4
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Heat Intensity Matrix"
        subtitle="Expected thermal intensity by day and hour"
      >
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-7 gap-2">
              <div />

              {MATRIX_HOURS.map(
                (hour) => (
                  <div
                    key={hour}
                    className="text-center text-[10px] font-semibold text-muted-foreground"
                  >
                    {String(
                      hour,
                    ).padStart(
                      2,
                      "0",
                    )}
                    :00
                  </div>
                ),
              )}

              {MATRIX_DAYS.map(
                (
                  day,
                  dayIndex,
                ) => (
                  <div
                    key={day}
                    className="contents"
                  >
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>

                    {MATRIX_HOURS.map(
                      (hour) => {
                        const value =
                          matrixValue(
                            dayIndex,
                            hour,
                          );

                        const tone =
                          riskBand(
                            value,
                          );

                        return (
                          <div
                            key={`${day}-${hour}`}
                            className="flex h-12 items-center justify-center rounded-lg border border-border/50"
                            style={{
                              backgroundColor:
                                `${tone.hex}18`,
                            }}
                            title={`${day} ${hour}:00 · Risk ${value}/100`}
                          >
                            <span
                              className="font-display text-xs font-semibold"
                              style={{
                                color:
                                  tone.hex,
                              }}
                            >
                              {value}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <AnimatedNumber
            value={peakRisk}
            suffix="/100"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Peak predicted risk
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <AnimatedNumber
            value={series.length}
            suffix=" pts"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Forecast data points
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <ProgressTrack
            value={peakRisk}
          />

          <p className="mt-2 text-xs text-muted-foreground">
            Thermal risk intensity
          </p>
        </GlassCard>
      </div>
    </div>
  );
}