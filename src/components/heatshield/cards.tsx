import type { ReactNode } from "react";
import { ShieldCheck, type LucideIcon } from "lucide-react";
import type { RouteOption } from "@/lib/heat-engine";
import { riskBand } from "@/lib/heat-engine";
import {
  AnimatedNumber,
  GlassCard,
  LiveIndicator,
  ProgressTrack,
  Sparkline,
  ToneBadge,
  toneGradient,
  toneVar,
  type Tone,
} from "./primitives";
import { cn } from "@/lib/utils";

/* --------------------------------- MetricCard ------------------------------- */

export function MetricCard({
  icon: Icon,
  label,
  sub,
  tone = "peach",
  spark,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  sub?: ReactNode;
  tone?: Tone;
  spark?: number[] | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <GlassCard hover className={cn("relative overflow-hidden p-5", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${toneVar[tone]} 14%, transparent), transparent 55%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
            {label.toUpperCase()}
          </p>
          <span
            className="flex size-8 items-center justify-center rounded-lg"
            style={{
              color: toneVar[tone],
              background: `color-mix(in oklab, ${toneVar[tone]} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${toneVar[tone]} 25%, transparent)`,
            }}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <div className="mt-3">{children}</div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
        {spark && spark.length > 1 ? (
          <div className="mt-3">
            <Sparkline data={spark} tone={tone} height={36} />
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}

/* --------------------------------- ChartCard -------------------------------- */

export function ChartCard({
  title,
  subtitle,
  live = false,
  right,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  live?: boolean;
  right?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {live ? <LiveIndicator tone="mint" /> : null}
          {right}
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </GlassCard>
  );
}

/* --------------------------------- RouteCard -------------------------------- */

export function RouteCard({
  route,
  active,
  onSelect,
}: {
  route: RouteOption;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const band = riskBand(route.exposure);
  return (
    <button
      type="button"
      onClick={() => onSelect(route.id)}
      aria-pressed={active}
      className={cn(
        "glass-panel card-hover w-full rounded-2xl p-4 text-left transition-all",
        active && "glow-peach border-transparent",
      )}
      style={active ? { border: "1px solid color-mix(in oklab, var(--peach) 45%, transparent)" } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-7 items-center justify-center rounded-lg font-display text-xs font-bold"
            style={{ background: toneGradient[route.tone], color: "oklch(0.16 0.02 262)" }}
          >
            {route.id}
          </span>
          <span className="font-display text-sm font-semibold">{route.label}</span>
        </div>
        {route.recommended ? (
          <ToneBadge tone="mint">
            <ShieldCheck className="size-3" /> SAFEST
          </ToneBadge>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Distance</p>
          <p className="font-display text-sm font-semibold tabular-nums">{route.distanceKm} km</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Time</p>
          <p className="font-display text-sm font-semibold tabular-nums">{route.timeMin} min</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Heat Exposure</p>
          <p className="font-display text-sm font-semibold tabular-nums" style={{ color: band.hex }}>
            {route.exposure}/100
          </p>
        </div>
      </div>
      <div className="mt-3">
        <ProgressTrack value={route.exposure} tone={route.tone} />
      </div>
    </button>
  );
}

/* ------------------------------- AIResponseCard ----------------------------- */

export function AIResponseCard({
  title,
  paragraphs,
  why,
  action,
  tone = "peach",
  className,
}: {
  title: string;
  paragraphs: string[];
  why?: string[] | undefined;
  action?: string | undefined;
  tone?: Tone;
  className?: string | undefined;
}) {
  return (
    <GlassCard className={cn("animate-fade-up p-5", className)}>
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full animate-pulse-soft"
          style={{ background: toneVar[tone] }}
        />
        <h4 className="font-display text-sm font-semibold tracking-tight">{title}</h4>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {why && why.length > 0 ? (
        <div className="mt-4">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
            WHY?
          </p>
          <ul className="mt-2 space-y-1.5">
            {why.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm text-foreground/85">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ background: toneVar[tone] }}
                />
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {action ? (
        <div
          className="mt-4 rounded-xl p-3.5 text-sm"
          style={{
            background: `color-mix(in oklab, ${toneVar[tone]} 10%, transparent)`,
            border: `1px solid color-mix(in oklab, ${toneVar[tone]} 28%, transparent)`,
          }}
        >
          <p className="font-display text-[11px] font-semibold tracking-[0.16em]" style={{ color: toneVar[tone] }}>
            RECOMMENDED ACTION
          </p>
          <p className="mt-1 text-foreground/90">{action}</p>
        </div>
      ) : null}
    </GlassCard>
  );
}

/* -------------------------------- ImpactMetric ------------------------------ */

export function ImpactMetric({
  icon: Icon,
  label,
  value,
  suffix = "",
  delta,
  progress,
  tone = "peach",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  delta?: string | undefined;
  progress?: number | undefined;
  tone?: Tone;
  className?: string | undefined;
}) {
  return (
    <GlassCard hover className={cn("relative overflow-hidden p-5", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(130% 100% at 0% 0%, color-mix(in oklab, ${toneVar[tone]} 18%, transparent), transparent 60%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className="flex size-9 items-center justify-center rounded-xl"
            style={{
              color: toneVar[tone],
              background: `color-mix(in oklab, ${toneVar[tone]} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${toneVar[tone]} 25%, transparent)`,
            }}
          >
            <Icon className="size-4.5" />
          </span>
          {delta ? (
            <span className="font-display text-xs font-semibold" style={{ color: toneVar.mint }}>
              {delta}
            </span>
          ) : null}
        </div>
        <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        {progress !== undefined ? (
          <div className="mt-3">
            <ProgressTrack value={progress} tone={tone} />
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
