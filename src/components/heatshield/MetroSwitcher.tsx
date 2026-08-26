import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  MapPin,
} from "lucide-react";

import {
  METROS,
  useMetro,
} from "@/lib/metros";

import { cn } from "@/lib/utils";

interface MetroSwitcherProps {
  className?: string;
}

export function MetroSwitcher({
  className,
}: MetroSwitcherProps) {
  const {
    metro,
    setMetroId,
  } = useMetro();

  const [open, setOpen] =
    useState(false);

  const ref =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        ref.current &&
        !ref.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  const handleSelect = (
    id: string,
  ) => {
    /*
     * IMPORTANT:
     * Only change the shared metro.
     *
     * Do NOT navigate to /app/city,
     * /app/map, or any other route.
     */
    setMetroId(id);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative",
        className,
      )}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (value) => !value,
          )
        }
        className="glass-panel flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors hover:border-peach/40"
      >
        <MapPin className="size-3.5 text-peach" />

        <span className="max-w-32 truncate">
          {metro.city}
        </span>

        <span className="text-muted-foreground">
          {metro.state}
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            open &&
              "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Select metro"
          className="absolute right-0 z-[100] mt-2 max-h-80 w-64 overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl"
        >
          {METROS.map(
            (item) => {
              const selected =
                item.id ===
                metro.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={
                    selected
                  }
                  onClick={() =>
                    handleSelect(
                      item.id,
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
                    selected &&
                      "bg-accent/50",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {item.city}
                    </span>

                    <span className="block text-[10px] text-muted-foreground">
                      {item.state}
                    </span>
                  </span>

                  {selected ? (
                    <Check className="size-4 text-mint" />
                  ) : null}
                </button>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}