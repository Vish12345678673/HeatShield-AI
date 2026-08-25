import { useEffect, useState } from "react";
import type { TimelineSegment } from "@/lib/heat-engine";
import { TONE_HEX } from "@/lib/heat-engine";
import { cn } from "@/lib/utils";

/** Horizontal 24h heat-safety timeline with animated current-time marker. */
export function SafetyTimeline({
  segments,
  className,
}: {
  segments: TimelineSegment[];
  className?: string | undefined;
}) {
  const [nowHour, setNowHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowHour(d.getHours() + d.getMinutes() / 60);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <div className="flex h-12 w-full overflow-hidden rounded-xl border border-border">
          {segments.map((s) => {
            const widthPct = ((s.end - s.start) / 24) * 100;
            return (
              <div
                key={`${s.start}-${s.label}`}
                className="relative flex items-center justify-center"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(180deg, ${TONE_HEX[s.tone]}33, ${TONE_HEX[s.tone]}14)`,
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}
                title={`${s.label} · ${fmt(s.start)}–${fmt(s.end)}`}
              >
                {widthPct > 9 ? (
                  <span
                    className="font-display text-[10px] font-semibold tracking-wide"
                    style={{ color: TONE_HEX[s.tone] }}
                  >
                    {s.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {/* now marker */}
        <div
          className="absolute -top-1.5 -bottom-1.5 w-px transition-[left] duration-1000"
          style={{
            left: `${(nowHour / 24) * 100}%`,
            background: "var(--peach)",
            boxShadow: "0 0 10px 1px color-mix(in oklab, var(--peach) 70%, transparent)",
          }}
        >
          <span
            className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full animate-live-dot"
            style={{ background: "var(--peach)" }}
          />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        {["00", "04", "08", "12", "16", "20", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
    </div>
  );
}

function fmt(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
