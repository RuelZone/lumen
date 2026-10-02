"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { PixelBulb } from "@/components/ui/pixel-bulb";

type Position = { x: number; y: number };
type Drag = Position & {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const STORAGE_KEY = "lumen-floating-icon-position";
const ICON_SIZE = 56;
const EDGE_GAP = 8;

function clampPosition(position: Position): Position {
  return {
    x: Math.max(
      EDGE_GAP,
      Math.min(
        position.x,
        window.innerWidth - ICON_SIZE - EDGE_GAP,
      ),
    ),
    y: Math.max(
      EDGE_GAP,
      Math.min(
        position.y,
        window.innerHeight - ICON_SIZE - EDGE_GAP,
      ),
    ),
  };
}

export default function FloatingLumen() {
  const pathname = usePathname();
  const router = useRouter();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);

  const [position, setPosition] = useState<Position | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "x" in parsed &&
          "y" in parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          setPosition(
            clampPosition({
              x: parsed.x,
              y: parsed.y,
            }),
          );
        }
      }
    } catch {
      // Keep the default corner position if local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!position) return;

    const keepOnScreen = () =>
      setPosition(
        (current) => current && clampPosition(current),
      );

    window.addEventListener("resize", keepOnScreen);

    return () =>
      window.removeEventListener("resize", keepOnScreen);
  }, [position]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === "/login") return null;

  function savePosition(next: Position) {
    const clamped = clampPosition(next);

    setPosition(clamped);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(clamped),
      );
    } catch {
      // The icon still moves for this session if local storage is unavailable.
    }
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const origin =
      position ?? {
        x: rect.left,
        y: rect.top,
      };

    dragRef.current = {
      ...origin,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      if (!drag.moved) {
        drag.moved = true;
        setIsDragging(true);
        setIsOpen(false);
      }
    }

    if (drag.moved) {
      setPosition(
        clampPosition({
          x: drag.x + deltaX,
          y: drag.y + deltaY,
        }),
      );
    }
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    if (drag.moved) {
      suppressClickRef.current = true;

      savePosition({
        x:
          drag.x +
          event.clientX -
          drag.startX,
        y:
          drag.y +
          event.clientY -
          drag.startY,
      });
    }

    dragRef.current = null;
    setIsDragging(false);
  }

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    if (!event.key.startsWith("Arrow")) return;

    event.preventDefault();

    const rect =
      buttonRef.current?.getBoundingClientRect();

    const current =
      position ?? {
        x: rect?.left ?? 0,
        y: rect?.top ?? 0,
      };

    const step = event.shiftKey ? 24 : 8;

    savePosition({
      x:
        current.x +
        (event.key === "ArrowRight"
          ? step
          : event.key === "ArrowLeft"
            ? -step
            : 0),

      y:
        current.y +
        (event.key === "ArrowDown"
          ? step
          : event.key === "ArrowUp"
            ? -step
            : 0),
    });
  }

  function handleQuestionSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const query = question.trim();

    if (!query) return;

    setIsOpen(false);

    window.dispatchEvent(
      new CustomEvent("lumen-prefill-question", {
        detail: {
          question: query,
          autoSubmit: true,
        },
      }),
    );

    router.push(
      `/ai?q=${encodeURIComponent(query)}&send=1`,
    );
  }

  const dialogOpensBelow =
    position !== null && position.y < 300;

  const dialogAlignsLeft =
    position !== null &&
    position.x + 320 <=
      window.innerWidth - EDGE_GAP;

  return (
    <div
      className="group fixed z-50"
      style={
        position
          ? {
              left: position.x,
              top: position.y,
            }
          : {
              right: 24,
              bottom: 24,
            }
      }
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Ask Lumen"
        aria-description="Drag to move this icon. Click to type a question for Ask Lumen. Use arrow keys to reposition."
        title="Drag to move · Click to Ask Lumen"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }

          setIsOpen((open) => !open);
        }}
        className="relative flex h-14 w-14 touch-none cursor-grab select-none items-center justify-center rounded-full border border-white/15 bg-[#172033] shadow-[0_8px_28px_rgba(23,32,51,0.28)] transition duration-200 hover:scale-105 hover:shadow-[0_12px_34px_rgba(23,32,51,0.36)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F806C]/35 dark:border-[#7FA894]/30 dark:bg-[#1A2521]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-[-5px] rounded-full border border-[#4F806C]/20 transition group-hover:scale-110 group-hover:border-[#4F806C]/45 dark:border-[#7FA894]/20 dark:group-hover:border-[#7FA894]/45"
        />

        <PixelBulb
          size="md"
          glow
          className="relative transition-transform duration-200 group-hover:scale-110"
        />
      </button>

      {(isOpen || isDragging) && (
        <section
          role="dialog"
          aria-label="Ask Lumen a question"
          aria-hidden={isDragging}
          className={`absolute ${
            dialogOpensBelow
              ? "top-full mt-3"
              : "bottom-full mb-3"
          } ${
            dialogAlignsLeft
              ? "left-0"
              : "right-0"
          } w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-lumen-border bg-card shadow-[0_16px_48px_rgba(15,23,42,0.2)] transition-opacity duration-200 ${
            isDragging
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between border-b border-lumen-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ask Lumen
              </p>

              <p className="mt-0.5 text-[11px] text-lumen-muted">
                Ask about a patient&apos;s record
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close question box"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lumen-muted transition hover:bg-card-hover hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <form
            onSubmit={handleQuestionSubmit}
            className="flex items-center gap-2 p-3"
          >
            <input
              ref={inputRef}
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              placeholder="Type your question..."
              aria-label="Question for Ask Lumen"
              className="min-w-0 flex-1 rounded-xl border border-lumen-border bg-input px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-lumen-muted focus:border-lumen-green"
            />

            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Continue to Ask Lumen"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lumen-navy text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#0B1110]"
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      )}

      {!isOpen && !isDragging && (
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 rounded-lg border border-lumen-border bg-card px-3 py-2 text-xs font-medium text-foreground opacity-0 shadow-lg transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
          Drag to move · Ask Lumen
        </span>
      )}
    </div>
  );
}