import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------- tone helpers ------------------------------ */

export type Tone = "low" | "moderate" | "high" | "extreme" | "mint" | "peach" | "cyan" | "lavender" | "amber" | "danger";

export const toneVar: Record<Tone, string> = {
  low: "var(--cyan)",
  moderate: "var(--amber)",
  high: "var(--heat)",
  extreme: "var(--danger)",
  mint: "var(--mint)",
  peach: "var(--peach)",
  cyan: "var(--cyan)",
  lavender: "var(--lavender)",
  amber: "var(--amber)",
  danger: "var(--danger)",
};

export const toneGradient: Record<Tone, string> = {
  low: "var(--gradient-cool)",
  moderate: "var(--gradient-amber)",
  high: "linear-gradient(135deg, var(--heat), var(--coral))",
  extreme: "var(--gradient-heat)",
  mint: "var(--gradient-mint)",
  peach: "var(--gradient-peach)",
  cyan: "var(--gradient-cool)",
  lavender: "linear-gradient(135deg, var(--lavender), var(--cyan))",
  amber: "var(--gradient-amber)",
  danger: "var(--gradient-heat)",
};

/* --------------------------------- GlassCard -------------------------------- */

export function GlassCard({
  className,
  children,
  hover = false,
  ...rest
}: {
  className?: string | undefined;
  children: ReactNode;
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass-panel rounded-2xl", hover && "card-hover", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ------------------------------- GradientCard ------------------------------- */

export function GradientCard({
  tone = "peach",
  className,
  children,
  ...rest
}: {
  tone?: Tone;
  className?: string | undefined;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("card-hover relative overflow-hidden rounded-2xl border border-border", className)}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(140% 120% at 0% 0%, color-mix(in oklab, ${toneVar[tone]} 22%, transparent), transparent 55%), linear-gradient(160deg, var(--elevated), var(--card))`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------- LiveIndicator ------------------------------ */

export function LiveIndicator({
  label = "LIVE",
  tone = "mint",
  className,
}: {
  label?: string;
  tone?: "mint" | "peach" | "danger" | "cyan";
  className?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="size-2 rounded-full animate-live-dot"
        style={{ background: toneVar[tone] }}
      />
      <span
        className="font-display text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: toneVar[tone] }}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------- AnimatedNumber ----------------------------- */

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 800,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string | undefined;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* --------------------------------- Sparkline -------------------------------- */

export function Sparkline({
  data,
  tone = "peach",
  height = 40,
  className,
}: {
  data: number[];
  tone?: Tone;
  height?: number;
  className?: string | undefined;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.82) - h * 0.09;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = useRef(`spark-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={toneVar[tone]} stopOpacity="0.35" />
          <stop offset="100%" stopColor={toneVar[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={toneVar[tone]}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------- ProgressTrack ------------------------------ */

export function ProgressTrack({
  value,
  tone = "peach",
  className,
  trackClassName,
}: {
  value: number; // 0..100
  tone?: Tone;
  className?: string | undefined;
  trackClassName?: string | undefined;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", trackClassName)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", className)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: toneGradient[tone] }}
      />
    </div>
  );
}

/* --------------------------------- PageHeader ------------------------------- */

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
    </div>
  );
}

/* --------------------------------- ToneBadge -------------------------------- */

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-semibold tracking-[0.14em]",
        className,
      )}
      style={{
        color: toneVar[tone],
        background: `color-mix(in oklab, ${toneVar[tone]} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${toneVar[tone]} 30%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
