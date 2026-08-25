import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  MapPin,
} from "lucide-react";

import { METROS, useMetro } from "@/lib/metros";
import { cn } from "@/lib/utils";

interface MetroSwitcherProps {
  className?: string;
}

export function MetroSwitcher({
  className,
}: MetroSwitcherProps) {
  const { metro, setMetroId } = useMetro();

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectMetro = (id: string) => {
    setMetroId(id);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative z-50", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "glass-panel flex items-center gap-2 rounded-full",
          "border border-border/60 px-3.5 py-2",
          "text-xs font-medium transition-all",
          "hover:border-peach/40",
        )}
      >
        <MapPin className="size-3.5 text-coral" />

        <span className="font-display font-semibold">
          {metro.city}
        </span>

        <span className="text-muted-foreground">
          {metro.state}
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select US metro"
          className={cn(
            "glass-panel-strong absolute right-0 top-full mt-2",
            "w-72 overflow-hidden rounded-2xl p-1.5",
            "border border-border/60 shadow-2xl",
          )}
        >
          <div className="px-3 pb-2 pt-2.5">
            <p className="font-display text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
              US METROS
            </p>

            <p className="mt-1 text-[10px] text-muted-foreground/70">
              FORTYGUARD COVERAGE
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {METROS.map((item) => {
              const active = item.id === metro.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectMetro(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl",
                    "px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  <MapPin
                    className={cn(
                      "size-3.5 shrink-0",
                      active
                        ? "text-coral"
                        : "text-muted-foreground",
                    )}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">
                      {item.city}
                    </span>

                    <span className="block text-[10px] text-muted-foreground">
                      {item.state}
                    </span>
                  </span>

                  {active && (
                    <Check className="size-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}