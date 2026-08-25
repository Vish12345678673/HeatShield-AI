import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  Flame, User, Mail, Lock, Phone, MapPin, Globe2, Building2, Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AuthScenery } from "@/components/heatshield/AuthScenery";
import { passwordStrength, register, validateEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — HeatShield AI" },
      { name: "description", content: "Create your HeatShield AI account to access hyperlocal heat intelligence, safe routing and worker safety tools." },
      { property: "og:title", content: "Create Account — HeatShield AI" },
      { property: "og:description", content: "Create your HeatShield AI account to access hyperlocal heat intelligence." },
    ],
  }),
  component: RegisterPage,
});

const STRENGTH_COLORS = ["var(--danger)", "var(--heat)", "var(--amber)", "var(--cyan)", "var(--mint)"];

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  phone?: string;
  city?: string;
  country?: string;
  terms?: string;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    phone: "", city: "", country: "", org: "",
  });
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (form.name.trim().length < 2) next.name = "Full name is required.";
    if (!validateEmail(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match.";
    if (form.phone && !/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) next.phone = "Enter a valid phone number.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.country.trim()) next.country = "Country is required.";
    if (!terms) next.terms = "You must accept the Terms & Privacy policy.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      try {
        register({
          name: form.name, email: form.email, password: form.password,
          ...(form.phone ? { phone: form.phone } : {}),
          ...(form.city ? { city: form.city } : {}),
          ...(form.country ? { country: form.country } : {}),
          ...(form.org ? { org: form.org } : {}),
        });
        setDone(true);
        toast.success("Account created — please sign in");
        setTimeout(() => void navigate({ to: "/login" }), 1400);
      } catch (err) {
        setLoading(false);
        toast.error(err instanceof Error ? err.message : "Registration failed.");
      }
    }, 800);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuthScenery />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center animate-fade-up">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl glow-peach" style={{ background: "var(--gradient-peach)" }}>
            <Flame className="size-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Join <span className="text-gradient-peach">HEATSHIELD AI</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Hyperlocal heat intelligence into decisions.
          </p>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="glass-panel-strong rounded-3xl p-7 shadow-2xl animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          {done ? (
            <div className="flex flex-col items-center py-8 text-center animate-scale-in">
              <CheckCircle2 className="size-12 text-mint" />
              <h2 className="mt-4 font-display text-lg font-semibold">Account created</h2>
              <p className="mt-1 text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field icon={User} id="name" label="Full Name" value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" />
              <Field icon={Mail} id="email" label="Email Address" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" />

              <div className="sm:col-span-2">
                <Field icon={Lock} id="password" label="Password" type="password" value={form.password} onChange={set("password")} error={errors.password} autoComplete="new-password" />
                {form.password ? (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors duration-300"
                          style={{
                            background:
                              i <= strength.score
                                ? STRENGTH_COLORS[strength.score]
                                : "var(--muted)",
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Strength: <span style={{ color: STRENGTH_COLORS[strength.score] }}>{strength.label}</span>
                    </p>
                  </div>
                ) : null}
              </div>

              <Field icon={Lock} id="confirm" label="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} autoComplete="new-password" />
              <Field icon={Phone} id="phone" label="Phone Number" value={form.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" />
              <Field icon={MapPin} id="city" label="City" value={form.city} onChange={set("city")} error={errors.city} />
              <Field icon={Globe2} id="country" label="Country" value={form.country} onChange={set("country")} error={errors.country} />
              <div className="sm:col-span-2">
                <Field icon={Building2} id="org" label="Organization / Workplace (optional)" value={form.org} onChange={set("org")} />
              </div>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 size-4 rounded accent-[oklch(0.75_0.135_40)]"
                  />
                  <span>
                    I accept the <span className="text-peach">Terms of Service</span> and{" "}
                    <span className="text-peach">Privacy Policy</span>, including processing of
                    location-based heat exposure data.
                  </span>
                </label>
                {errors.terms ? <p className="mt-1.5 text-xs text-destructive">{errors.terms}</p> : null}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glow-peach flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
                style={{ background: "var(--gradient-peach)" }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </div>
          )}

          {!done ? (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-peach hover:underline">
                Sign in
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, id, label, value, onChange, error, type = "text", autoComplete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | undefined;
  type?: string;
  autoComplete?: string | undefined;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={cn(
            "w-full rounded-xl border border-input bg-muted/40 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-peach/60",
            error && "border-destructive",
          )}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
