import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Flame, Mail, Lock, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AuthScenery } from "@/components/heatshield/AuthScenery";
import { LiveIndicator } from "@/components/heatshield/primitives";
import { DEMO_EMAIL, DEMO_PASSWORD, login, validateEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — HeatShield AI" },
      { name: "description", content: "Sign in to HeatShield AI — hyperlocal heat intelligence for safer cities, workers and communities." },
      { property: "og:title", content: "Sign In — HeatShield AI" },
      { property: "og:description", content: "Hyperlocal heat intelligence for safer cities, workers and communities." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!validateEmail(email)) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    // brief delay for perceived intelligence / state transition
    setTimeout(() => {
      try {
        login(email, password, remember);
        toast.success("Welcome back to HeatShield AI");
        void navigate({ to: "/app" });
      } catch (err) {
        setLoading(false);
        toast.error(err instanceof Error ? err.message : "Sign in failed.");
      }
    }, 650);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuthScenery />

      <div className="relative z-10 w-full max-w-md">
        {/* brand */}
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl glow-peach" style={{ background: "var(--gradient-peach)" }}>
            <Flame className="size-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            HEATSHIELD <span className="text-gradient-peach">AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hyperlocal heat intelligence for safer cities, workers and communities.
          </p>
          <div className="mt-3 flex justify-center">
            <LiveIndicator label="FORTYGUARD · LIVE DATA LAYER" tone="mint" />
          </div>
        </div>

        {/* card */}
        <form
          onSubmit={submit}
          noValidate
          className="glass-panel-strong rounded-3xl p-7 shadow-2xl animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <h2 className="font-display text-lg font-semibold">Sign in</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Access your city heat command center.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@city.gov"
                  className={cn(inputCls, errors.email && "border-destructive")}
                />
              </div>
              {errors.email ? <p className="mt-1.5 text-xs text-destructive">{errors.email}</p> : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset is handled by your city administrator in this demo.")}
                  className="text-xs text-peach hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(inputCls, "pr-11", errors.password && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password ? <p className="mt-1.5 text-xs text-destructive">{errors.password}</p> : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded accent-[oklch(0.75_0.135_40)]"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="glow-peach flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.015] active:scale-[0.99] disabled:opacity-60"
              style={{ background: "var(--gradient-peach)" }}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Authenticating…" : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail(DEMO_EMAIL);
                setPassword(DEMO_PASSWORD);
                toast.success("Demo credentials filled — press Log in");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-peach/40 hover:text-foreground"
            >
              <Sparkles className="size-3.5 text-peach" />
              Use demo account
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-peach hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-muted/40 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-peach/60";
