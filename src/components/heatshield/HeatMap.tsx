import { useEffect, useRef, useState } from "react";
import {
  TONE_HEX,
  riskBand,
  type RouteOption,
  type Zone,
} from "@/lib/heat-engine";
import { cn } from "@/lib/utils";

export type HeatLayer =
  | "temperature"
  | "heatIndex"
  | "risk"
  | "population"
  | "solar"
  | "historical"
  | "forecast";

export const HEAT_LAYERS: { key: HeatLayer; label: string }[] = [
  { key: "temperature", label: "Temperature" },
  { key: "heatIndex", label: "Heat Index" },
  { key: "risk", label: "Risk" },
  { key: "population", label: "Population Exposure" },
  { key: "solar", label: "Solar Exposure" },
  { key: "historical", label: "Historical Heat" },
  { key: "forecast", label: "Forecast" },
];

export function layerValue(zone: Zone, layer: HeatLayer): number {
  switch (layer) {
    case "temperature":
    case "risk":
      return zone.risk;
    case "heatIndex":
      return Math.min(99, zone.risk * 0.97 + 2);
    case "population":
      return zone.populationPct;
    case "solar":
      return zone.solar;
    case "historical":
      return zone.risk * 0.85;
    case "forecast":
      return Math.min(99, zone.risk * 1.06 + zone.trend);
  }
}

interface View {
  zoom: number;
  ox: number;
  oy: number;
}

interface HeatMapProps {
  mode?: "2d" | "3d";
  zones: Zone[];
  layer?: HeatLayer;
  routes?: RouteOption[] | undefined;
  activeRouteId?: string | undefined;
  className?: string | undefined;
}

/** Interactive thermal intelligence map — canvas rendered, 2D + isometric 3D. */
export function HeatMap({
  mode = "2d",
  zones,
  layer = "risk",
  routes,
  activeRouteId,
  className,
}: HeatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>({ zoom: 1, ox: 0, oy: 0 });
  const stateRef = useRef({ mode, zones, layer, routes, activeRouteId });
  stateRef.current = { mode, zones, layer, routes, activeRouteId };
  const [hovered, setHovered] = useState<{ zone: Zone; x: number; y: number } | null>(null);

  /* ----- coordinate transforms ----- */
  const toScreen = (px: number, py: number, w: number, h: number) => {
    const { zoom, ox, oy } = viewRef.current;
    const base = Math.min(w, h) * 0.94;
    return {
      x: w / 2 + (px - 0.5) * base * zoom + ox,
      y: h / 2 + (py - 0.5) * base * zoom + oy,
      scale: base * zoom,
    };
  };

  /* ----- wheel zoom (non-passive, cursor-anchored) ----- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      const next = Math.min(4.5, Math.max(0.7, v.zoom * Math.exp(-dy * 0.0015)));
      const k = next / v.zoom;
      // keep the cursor point stationary while zooming
      viewRef.current = {
        zoom: next,
        ox: px - (px - v.ox) * k,
        oy: py - (py - v.oy) * k,
      };
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ----- drag pan + hover ----- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (dragging) {
        viewRef.current.ox += e.clientX - lastX;
        viewRef.current.oy += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      // hover hit-test
      const canvas = canvasRef.current;
      if (!canvas) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best: Zone | null = null;
      let bestD = 26;
      for (const z of stateRef.current.zones) {
        const s = toScreen(z.x, z.y, rect.width, rect.height);
        const d = Math.hypot(s.x - mx, s.y - my);
        if (d < bestD) {
          bestD = d;
          best = z;
        }
      }
      setHovered(best ? { zone: best, x: mx, y: my } : null);
    };
    const onLeave = () => setHovered(null);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* ----- render loop ----- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const drawStreets = (t: number) => {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      const step = 0.05;
      for (let gx = 0; gx <= 1.001; gx += step) {
        const a = toScreen(gx, 0, w, h);
        const b = toScreen(gx, 1, w, h);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let gy = 0; gy <= 1.001; gy += step) {
        const a = toScreen(0, gy, w, h);
        const b = toScreen(1, gy, w, h);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // arterial roads
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      for (const gy of [0.25, 0.5, 0.75]) {
        const a = toScreen(0.02, gy + Math.sin(t / 4000 + gy * 9) * 0.01, w, h);
        const b = toScreen(0.98, gy - Math.sin(t / 4000 + gy * 7) * 0.01, w, h);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(w / 2, (a.y + b.y) / 2 - 14, b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawRoutes = (t: number) => {
      const { routes: rs, activeRouteId: activeId } = stateRef.current;
      if (!rs || rs.length === 0) return;
      for (const r of rs) {
        const active = activeId ? r.id === activeId : r.recommended;
        const hex = TONE_HEX[r.tone];
        ctx.save();
        ctx.beginPath();
        r.path.forEach((p, i) => {
          const s = toScreen(p.x, p.y, w, h);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        });
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (active) {
          ctx.strokeStyle = hex;
          ctx.lineWidth = 4.5;
          ctx.shadowColor = hex;
          ctx.shadowBlur = 16;
          ctx.setLineDash([14, 10]);
          ctx.lineDashOffset = -(t / 40) % 24;
        } else {
          ctx.strokeStyle = hex;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 7]);
        }
        ctx.stroke();
        ctx.restore();
        // endpoints
        const first = r.path[0]!;
        const last = r.path[r.path.length - 1]!;
        for (const [p, fill] of [[first, "#3AD6A8"], [last, "#FF8F70"]] as const) {
          const s = toScreen(p.x, p.y, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x, s.y, active ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.shadowColor = fill;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      }
    };

    const draw2D = (t: number) => {
      const { zones: zs, layer: ly } = stateRef.current;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const z of zs) {
        const v = layerValue(z, ly);
        const band = riskBand(v);
        const s = toScreen(z.x, z.y, w, h);
        const pulse = 1 + 0.06 * Math.sin(t / 900 + z.x * 20);
        const r = (0.05 + (z.populationPct / 100) * 0.085) * s.scale * pulse;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, hexA(band.hex, 0.5 + (v / 100) * 0.3));
        g.addColorStop(0.45, hexA(band.hex, 0.22));
        g.addColorStop(1, hexA(band.hex, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // hotspot cores
      for (const z of zs) {
        const v = layerValue(z, ly);
        if (v < 62) continue;
        const band = riskBand(v);
        const s = toScreen(z.x, z.y, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3 + (v / 100) * 3, 0, Math.PI * 2);
        ctx.fillStyle = band.hex;
        ctx.shadowColor = band.hex;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      }
    };

    const draw3D = (t: number) => {
      const { zones: zs, layer: ly } = stateRef.current;
      const { zoom, ox, oy } = viewRef.current;
      const base = Math.min(w, h) * 0.8 * zoom;
      const cx = w / 2 + ox;
      const cy = h / 2 + oy - base * 0.08;
      const iso = (px: number, py: number, pz: number) => ({
        x: cx + (px - py) * 0.866 * base * 0.62,
        y: cy + (px + py - 1) * 0.5 * base * 0.62 - pz,
      });
      // ground plane
      const corners = [iso(0, 0, 0), iso(1, 0, 0), iso(1, 1, 0), iso(0, 1, 0)];
      ctx.save();
      ctx.beginPath();
      corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
      ctx.closePath();
      const ground = ctx.createLinearGradient(cx, cy - base * 0.3, cx, cy + base * 0.4);
      ground.addColorStop(0, "rgba(41,199,217,0.05)");
      ground.addColorStop(1, "rgba(255,143,112,0.06)");
      ctx.fillStyle = ground;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // ground grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      for (let i = 1; i < 10; i++) {
        const f = i / 10;
        let a = iso(f, 0, 0);
        let b = iso(f, 1, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        a = iso(0, f, 0);
        b = iso(1, f, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
      // columns, painter-sorted
      const sorted = [...zs].sort((a, b) => a.x + a.y - (b.x + b.y));
      for (const z of sorted) {
        const v = layerValue(z, ly);
        const band = riskBand(v);
        const pulse = 1 + 0.05 * Math.sin(t / 800 + z.y * 24);
        const height = (v / 100) * base * 0.34 * pulse;
        const foot = iso(z.x, z.y, 0);
        const top = iso(z.x, z.y, height);
        const rw = (0.035 + (z.populationPct / 100) * 0.028) * base * 0.62;
        // column sides
        ctx.save();
        const side = ctx.createLinearGradient(foot.x - rw, foot.y, foot.x + rw, foot.y);
        side.addColorStop(0, hexA(band.hex, 0.16));
        side.addColorStop(0.5, hexA(band.hex, 0.5));
        side.addColorStop(1, hexA(band.hex, 0.12));
        ctx.fillStyle = side;
        ctx.beginPath();
        ctx.moveTo(foot.x - rw, foot.y);
        ctx.lineTo(top.x - rw, top.y);
        ctx.lineTo(top.x + rw, top.y);
        ctx.lineTo(foot.x + rw, foot.y);
        ctx.closePath();
        ctx.fill();
        // glowing top
        ctx.beginPath();
        ctx.ellipse(top.x, top.y, rw, rw * 0.42, 0, 0, Math.PI * 2);
        ctx.fillStyle = hexA(band.hex, 0.95);
        ctx.shadowColor = band.hex;
        ctx.shadowBlur = v > 80 ? 22 : 10;
        ctx.fill();
        ctx.restore();
      }
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const { mode: m } = stateRef.current;
      if (m === "2d") {
        drawStreets(t);
        draw2D(t);
        drawRoutes(t);
      } else {
        draw3D(t);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-popover [touch-action:none]",
        className,
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {hovered ? (
        <div
          className="glass-panel-strong pointer-events-none absolute z-10 w-48 rounded-xl p-3 animate-scale-in"
          style={{
            left: Math.min(hovered.x + 14, (wrapRef.current?.clientWidth ?? 300) - 200),
            top: Math.max(hovered.y - 10, 8),
          }}
        >
          <p className="font-display text-xs font-semibold">{hovered.zone.name} · {hovered.zone.district}</p>
          <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between"><span>Risk</span><span className="font-semibold" style={{ color: riskBand(hovered.zone.risk).hex }}>{hovered.zone.risk}/100</span></div>
            <div className="flex justify-between"><span>Population</span><span>{hovered.zone.populationPct}%</span></div>
            <div className="flex justify-between"><span>Solar</span><span>{hovered.zone.solar}%</span></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* --------------------------------- legend ---------------------------------- */

export function HeatLegend({ className }: { className?: string | undefined }) {
  const stops = [
    { label: "Cool", color: TONE_HEX.low },
    { label: "Mild", color: "#7FD4A8" },
    { label: "Warm", color: TONE_HEX.moderate },
    { label: "Hot", color: TONE_HEX.high },
    { label: "Extreme", color: TONE_HEX.extreme },
  ];
  return (
    <div className={cn("glass-panel rounded-xl px-3.5 py-2.5", className)}>
      <p className="mb-1.5 font-display text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
        HEAT INTENSITY
      </p>
      <div
        className="h-1.5 w-44 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${stops.map((s) => s.color).join(", ")})`,
        }}
      />
      <div className="mt-1 flex w-44 justify-between text-[9px] text-muted-foreground">
        {stops.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}
