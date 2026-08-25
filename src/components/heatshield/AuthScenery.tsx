import { useEffect, useRef } from "react";

/**
 * Animated thermal backdrop for auth screens: drifting heat particles over
 * layered navy gradients and abstract thermal contour rings.
 */
export function AuthScenery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#FF8F70", "#FFB39C", "#FF9F32", "#29C7D9"];
    const particles = Array.from({ length: 46 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: -0.0004 - Math.random() * 0.0009,
      color: COLORS[i % COLORS.length]!,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        const alpha = 0.25 + 0.2 * Math.sin(t / 1400 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* base gradients */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 700px at 80% -10%, oklch(0.32 0.09 40 / 0.28), transparent 60%)," +
            "radial-gradient(900px 700px at -10% 100%, oklch(0.3 0.09 205 / 0.22), transparent 60%)," +
            "radial-gradient(700px 500px at 30% 110%, oklch(0.35 0.12 60 / 0.14), transparent 60%)," +
            "linear-gradient(180deg, oklch(0.17 0.022 262), oklch(0.13 0.018 262))",
        }}
      />
      {/* thermal contour rings */}
      <svg
        className="absolute -right-40 -top-40 size-[720px] opacity-25 animate-drift"
        viewBox="0 0 400 400"
        fill="none"
      >
        {[180, 145, 110, 75, 42].map((r, i) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            stroke={i % 2 ? "#FF8F70" : "#FF9F32"}
            strokeOpacity={0.35 - i * 0.05}
            strokeWidth="1"
            strokeDasharray={i % 2 ? "4 8" : undefined}
          />
        ))}
      </svg>
      <svg
        className="absolute -bottom-48 -left-44 size-[640px] opacity-20 animate-drift"
        style={{ animationDelay: "-6s" }}
        viewBox="0 0 400 400"
        fill="none"
      >
        {[170, 130, 90, 52].map((r, i) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            stroke="#29C7D9"
            strokeOpacity={0.3 - i * 0.05}
            strokeWidth="1"
            strokeDasharray={i % 2 ? "3 7" : undefined}
          />
        ))}
      </svg>
      {/* heat particles */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(80% 70% at 50% 45%, transparent, oklch(0.12 0.016 262 / 0.7))" }}
      />
    </div>
  );
}
