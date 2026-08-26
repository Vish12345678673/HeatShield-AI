import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bot,
  Loader2,
  MapPinned,
  Route as RouteIcon,
  ThermometerSun,
} from "lucide-react";

import { AIResponseCard } from "@/components/heatshield/cards";
import { PageHeader } from "@/components/heatshield/primitives";

import {
  geoaiRanking,
  useLiveReading,
  type LiveReading,
} from "@/lib/heat-engine";

import {
  useMetro,
  type Metro,
} from "@/lib/metros";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/agent")({
  head: () => ({
    meta: [
      {
        title: "AI Heat Agent — HeatShield AI",
      },
      {
        name: "description",
        content:
          "Your intelligent heat-response copilot — explain risk, find intervention zones and safe routes in natural language.",
      },
      {
        property: "og:title",
        content: "AI Heat Agent — HeatShield AI",
      },
      {
        property: "og:description",
        content:
          "Your intelligent heat-response copilot.",
      },
    ],
  }),
  component: AgentPage,
});

interface AgentReply {
  id: string;
  title: string;
  paragraphs: string[];
  why?: string[];
  action?: string;
}

type AgentAction =
  | "explain"
  | "zones"
  | "route";

function buildReply(
  action: AgentAction,
  reading: LiveReading | null,
  metro: Metro,
): AgentReply {
  const temp =
    reading?.temperature ?? 38.7;

  const hi =
    reading?.heatIndex ?? 44.2;

  const risk =
    reading?.riskScore ?? 92;

  const label = reading
    ? reading.riskLabel.toLowerCase()
    : "extreme";

  const cap =
    label.charAt(0).toUpperCase() +
    label.slice(1);

  if (action === "explain") {
    return {
      id: `explain-${Date.now()}`,
      title: "Current heat risk explained",
      paragraphs: [
        `Current heat risk in ${metro.city} is ${cap} (${risk}/100). Temperature is ${temp}°C and the heat index is ${hi}°C.`,
        "Peak heat is expected around 15:00, when solar load and accumulated surface heat overlap.",
      ],
      why: [
        "High temperature",
        "Elevated heat index",
        "Solar exposure",
        "Historical heat trend",
      ],
      action:
        "Avoid prolonged outdoor exposure between 2:30 PM and 4:30 PM.",
    };
  }

  if (action === "zones") {
    const top = geoaiRanking(metro).slice(
      0,
      3,
    );

    return {
      id: `zones-${Date.now()}`,
      title: "Priority intervention zones",
      paragraphs: [
        `GeoAI ranked the zones in ${metro.city} by combined heat risk, population exposure and solar load.`,
        top.length > 0
          ? `Top candidates: ${top
              .map(
                (z) =>
                  `${z.name} (${z.district}, priority ${z.priority})`,
              )
              .join(" · ")}.`
          : "No priority zones are currently available.",
      ],
      why: top.map(
        (z) =>
          `${z.name} — ${z.interventions.join(" + ")} could protect the most residents`,
      ),
      action:
        "Open the City Heat Planner to review the full GeoAI leaderboard.",
    };
  }

  return {
    id: `route-${Date.now()}`,
    title: "Thermally-optimised routing",
    paragraphs: [
      `Three candidate corridors were analysed across ${metro.city}.`,
      "Route C adds 5 minutes but lowers heat exposure from 89/100 to 38/100 by tracing the shaded Wash corridor.",
    ],
    why: [
      "Avoids the unshaded arterial at peak solar angle",
      "Passes two active cooling stations",
      "Higher tree-canopy coverage for 61% of the path",
    ],
    action:
      "Open AI Safe Route and press Find Safe Routes to see all three on the live map.",
  };
}

const ACTIONS: {
  key: AgentAction;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}[] = [
  {
    key: "explain",
    label: "Explain Risk",
    icon: ThermometerSun,
  },
  {
    key: "zones",
    label: "Find Intervention Zones",
    icon: MapPinned,
  },
  {
    key: "route",
    label: "Find Safe Route",
    icon: RouteIcon,
  },
];

function AgentPage() {
  /*
   * Always use the currently selected metro.
   */
  const { metro } = useMetro();

  const {
    reading,
  } = useLiveReading(metro);

  const navigate = useNavigate();

  const [thinking, setThinking] =
    useState<AgentAction | null>(null);

  const [replies, setReplies] =
    useState<AgentReply[]>([]);

  const ask = (
    action: AgentAction,
  ) => {
    setThinking(action);

    setTimeout(() => {
      setReplies((current) =>
        [
          buildReply(
            action,
            reading,
            metro,
          ),
          ...current,
        ].slice(0, 4),
      );

      setThinking(null);

      if (action === "zones") {
        setTimeout(() => {
          void navigate({
            to: "/app/city",
          });
        }, 2400);
      }
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Heat Agent"
        subtitle="Your intelligent heat-response copilot."
      />

      <div className="relative overflow-hidden rounded-3xl border border-border">
        {/*
          Reserved media layer.

          Replace this fallback with an animated GIF,
          video or image if required.
        */}
        <div
          id="AI_AGENT_BACKGROUND_GIF"
          data-media-slot="gif|video|image"
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 100% at 80% 0%, color-mix(in oklab, var(--lavender) 20%, transparent), transparent 55%)," +
              "radial-gradient(80% 90% at 10% 100%, color-mix(in oklab, var(--cyan) 16%, transparent), transparent 55%)," +
              "radial-gradient(60% 70% at 50% 50%, color-mix(in oklab, var(--coral) 12%, transparent), transparent 60%)," +
              "linear-gradient(160deg, var(--elevated), var(--background))",
          }}
        />

        <div
          aria-hidden
          className="absolute inset-0 opacity-30 animate-drift"
          style={{
            background:
              "repeating-radial-gradient(circle at 70% 20%, transparent 0 38px, color-mix(in oklab, var(--peach) 14%, transparent) 38px 39px)",
          }}
        />

        <div className="relative z-10 flex min-h-[62vh] flex-col p-5 md:p-8">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-2xl glow-cyan"
              style={{
                background:
                  "var(--gradient-cool)",
              }}
            >
              <Bot className="size-5 text-primary-foreground" />
            </div>

            <div>
              <p className="font-display text-sm font-semibold">
                HeatShield Copilot
              </p>

              <p className="text-xs text-muted-foreground">
                Connected to FORTYGUARD Live Data
                Layer ·{" "}
                {reading
                  ? `${reading.temperature}°C · risk ${reading.riskScore}`
                  : "syncing…"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() =>
                  ask(action.key)
                }
                disabled={
                  thinking !== null
                }
                className={cn(
                  "glass-panel flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300",
                  "hover:glow-cyan hover:border-cyan/40 hover:text-foreground disabled:opacity-50",
                  thinking ===
                    action.key &&
                    "glow-cyan border-cyan/50",
                )}
              >
                {thinking ===
                action.key ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <action.icon className="size-3.5 text-cyan" />
                )}

                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex-1 space-y-4">
            {thinking ? (
              <div className="glass-panel inline-flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs text-muted-foreground animate-fade-in">
                <span className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-peach animate-pulse-soft" />
                  <span
                    className="size-1.5 rounded-full bg-coral animate-pulse-soft"
                    style={{
                      animationDelay:
                        "150ms",
                    }}
                  />
                  <span
                    className="size-1.5 rounded-full bg-heat animate-pulse-soft"
                    style={{
                      animationDelay:
                        "300ms",
                    }}
                  />
                </span>

                Reasoning over live thermal
                data…
              </div>
            ) : null}

            {replies.length === 0 &&
            !thinking ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                <p className="font-display text-lg font-semibold text-foreground/80">
                  Ask me anything about
                  today's heat.
                </p>

                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  I translate raw thermal
                  telemetry into decisions —
                  risk explanations,
                  intervention priorities
                  and safe corridors.
                </p>
              </div>
            ) : null}

            {replies.map((reply) => (
              <AIResponseCard
                key={reply.id}
                title={reply.title}
                paragraphs={
                  reply.paragraphs
                }
                why={reply.why}
                action={reply.action}
                className="max-w-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}