import { useEffect, useId, useState } from "react";
import { riskBand } from "@/lib/heat-engine";
import { toneVar, type Tone } from "./primitives";
import { cn } from "@/lib/utils";

/** Circular radial risk gauge with animated arc and glow. */
export function RiskGauge({
  score,
  size = 140,
  stroke = 10,
  label,
  sublabel,
  tone,
  className,
}: {
  score: number; // 0..100
  size?: number;
  stroke?: number;
  label?: string | undefined;
  sublabel?: string | undefined;
  tone?: Tone | undefined;
  className?: string | undefined;
}) {
  const id = useId();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(from + (score - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const band = riskBand(score);
  const color = toneVar[tone ?? band.tone];
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, animated)) / 100;
  // 270° arc starting at 135°
  const arc = c * 0.75;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[225deg]">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--peach)" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc * pct} ${c}`}
          style={{ filter: `drop-shadow(0 0 8px color-mix(in oklab, ${color} 60%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-semibold tabular-nums" style={{ fontSize: size * 0.22 }}>
          {Math.round(animated)}
        </span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
        <span
          className="mt-0.5 font-display text-[10px] font-semibold tracking-[0.18em]"
          style={{ color }}
        >
          {label ?? band.label.toUpperCase()}
        </span>
        {sublabel ? <span className="text-[10px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </div>
  );
}
