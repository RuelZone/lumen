"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Pixel-art patterns (8 rows x 10 cols) ───────────────────────────────────

// Healthcare Heartbeat Pattern
const HEART_PATTERN = [
  [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
] as const;

// Lumen Illumination Light Bulb Pattern
const BULB_PATTERN = [
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // row 0: top dome of bulb
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], // row 1: upper bulb curve
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0], // row 2: widest incandescent globe
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0], // row 3: incandescent globe
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], // row 4: tapering lower curve
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // row 5: collar / neck
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // row 6: metal screw base
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // row 7: contact terminal
] as const;

const ROWS = 8;
const COLS = 10;
const WAVE_STEP_MS = 50;
const HOLD_MS = 700;
const CELL_ANIM_MS = 300;

// Heart: Rose-500
const HEART_FILL = "#f43f5e";

// Bulb: Warm incandescent illumination & metallic base
const BULB_GLASS = "#f59e0b";     // Amber-500: warm radiant bulb glass
const BULB_FILAMENT = "#fef08a";  // Yellow-200: brilliant glowing filament core
const BULB_BASE = "#94a3b8";      // Slate-400: metallic screw threads
const BULB_TIP = "#475569";       // Slate-600: bottom contact terminal

const BULB_FILAMENT_KEYS = new Set(["2,4", "2,5", "3,4", "3,5"]);
const BULB_BASE_KEYS = new Set(["6,3", "6,4", "6,5", "6,6"]);
const BULB_TIP_KEYS = new Set(["7,4", "7,5"]);

function getBulbFill(row: number, col: number): string {
  const key = `${row},${col}`;
  if (BULB_FILAMENT_KEYS.has(key)) return BULB_FILAMENT;
  if (BULB_BASE_KEYS.has(key)) return BULB_BASE;
  if (BULB_TIP_KEYS.has(key)) return BULB_TIP;
  return BULB_GLASS;
}

// Corner radius in SVG units (cell = 1x1)
const R = 0.3;

type CornerSpec = { tl?: number; tr?: number; bl?: number; br?: number };

const CORNER_MAP: Record<string, CornerSpec> = {
  // Heart corners
  "0,2": { tl: R },
  "0,7": { tr: R },
  "2,0": { tl: R },
  "3,0": { bl: R },
  "2,9": { tr: R },
  "3,9": { br: R },
  // Bulb top dome
  "0,3": { tl: R },
  "0,6": { tr: R },
  // Bulb globe
  "1,2": { tl: R },
  "1,7": { tr: R },
  "2,1": { tl: R },
  "2,8": { tr: R },
  "3,1": { bl: R },
  "3,8": { br: R },
  "4,2": { bl: R },
  "4,7": { br: R },
  // Screw base & tip
  "6,3": { bl: R },
  "6,6": { br: R },
  "7,4": { bl: R },
  "7,5": { br: R },
};

function cellPath(x: number, y: number, c: CornerSpec = {}): string {
  const w = 1.01;
  const h = 1.01;
  const { tl = 0, tr = 0, br = 0, bl = 0 } = c;
  const p: string[] = [];
  p.push(`M ${x + tl},${y}`);
  p.push(`L ${x + w - tr},${y}`);
  if (tr) p.push(`Q ${x + w},${y} ${x + w},${y + tr}`);
  p.push(`L ${x + w},${y + h - br}`);
  if (br) p.push(`Q ${x + w},${y + h} ${x + w - br},${y + h}`);
  p.push(`L ${x + bl},${y + h}`);
  if (bl) p.push(`Q ${x},${y + h} ${x},${y + h - bl}`);
  p.push(`L ${x},${y + tl}`);
  if (tl) p.push(`Q ${x},${y} ${x + tl},${y}`);
  p.push("Z");
  return p.join(" ");
}

type CellData = {
  row: number;
  col: number;
  idx: number;
  inHeart: boolean;
  inBulb: boolean;
  bulbFill: string;
  d: string;
};

function buildCellData(): CellData[] {
  const raw: CellData[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${row},${col}`;
      raw.push({
        row,
        col,
        idx: row * COLS + col,
        inHeart: HEART_PATTERN[row][col] === 1,
        inBulb: BULB_PATTERN[row][col] === 1,
        bulbFill: getBulbFill(row, col),
        d: cellPath(col, row, CORNER_MAP[key]),
      });
    }
  }

  raw.sort((a, b) => {
    const d = (r: number, c: number) =>
      Math.sqrt((r - 3.5) ** 2 + (c - 4.5) ** 2);
    return d(a.row, a.col) - d(b.row, b.col);
  });
  return raw;
}

const CELL_DATA = buildCellData();
const CELL_BY_IDX: CellData[] = Array(ROWS * COLS);
CELL_DATA.forEach((c) => {
  CELL_BY_IDX[c.idx] = c;
});

const WAVE_GROUPS: { indices: number[] }[] = (() => {
  const map = new Map<number, number[]>();
  CELL_DATA.forEach((c) => {
    const key = Math.round(
      Math.sqrt((c.row - 3.5) ** 2 + (c.col - 4.5) ** 2) * 2,
    );
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c.idx);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, indices]) => ({ indices }));
})();

export interface LoadingAnimationSvgProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  showText?: boolean;
}

export function LoadingAnimationSvg({
  className,
  size = "md",
  text = "Illuminating Lumen",
  showText = true,
}: LoadingAnimationSvgProps) {
  const beatRef = React.useRef<SVGGElement>(null);
  const rectRefs = React.useRef<(SVGPathElement | null)[]>(
    Array(ROWS * COLS).fill(null),
  );
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = React.useRef(true);
  const isFirstShow = React.useRef(true);

  const schedule = React.useCallback((fn: () => void, delay: number) => {
    const id: ReturnType<typeof setTimeout> = setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, delay);
    timers.current.push(id);
  }, []);

  const clearAllTimers = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const show = React.useCallback(
    (next: "heart" | "bulb", onDone?: () => void) => {
      const first = isFirstShow.current;
      if (first) isFirstShow.current = false;

      const nextProp = next === "heart" ? "inHeart" : "inBulb";
      const prevProp = next === "heart" ? "inBulb" : "inHeart";
      const groups = next === "bulb" ? [...WAVE_GROUPS].reverse() : WAVE_GROUPS;
      const waveDuration = (groups.length - 1) * WAVE_STEP_MS;

      // Heartbeat or Bulb Lumination Pulse
      schedule(
        () => {
          if (!mounted.current) return;
          if (next === "bulb") {
            // Radiant illumination flash
            beatRef.current?.animate(
              [
                { transform: "scale(1)", filter: "drop-shadow(0 0 0px transparent)", offset: 0 },
                { transform: "scale(1.08)", filter: "drop-shadow(0 0 16px rgba(245,158,11,0.65))", offset: 0.2 },
                { transform: "scale(1)", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.3))", offset: 0.46 },
                { transform: "scale(1.04)", filter: "drop-shadow(0 0 12px rgba(245,158,11,0.5))", offset: 0.68 },
                { transform: "scale(1)", filter: "drop-shadow(0 0 4px rgba(245,158,11,0.25))", offset: 1 },
              ],
              { duration: 580, easing: "ease-in-out", fill: "none" },
            );
          } else {
            // Lub-dub cardiac heartbeat pulse
            beatRef.current?.animate(
              [
                { transform: "scale(1)", filter: "drop-shadow(0 0 0px transparent)", offset: 0 },
                { transform: "scale(1.08)", filter: "drop-shadow(0 0 14px rgba(244,63,94,0.5))", offset: 0.2 },
                { transform: "scale(1)", filter: "drop-shadow(0 0 6px rgba(244,63,94,0.25))", offset: 0.46 },
                { transform: "scale(1.03)", filter: "drop-shadow(0 0 10px rgba(244,63,94,0.4))", offset: 0.68 },
                { transform: "scale(1)", filter: "drop-shadow(0 0 4px rgba(244,63,94,0.2))", offset: 1 },
              ],
              { duration: 580, easing: "ease-in-out", fill: "none" },
            );
          }
        },
        Math.round(waveDuration * 0.45),
      );

      // Ripple wavefront across quantized radius rings
      groups.forEach(({ indices }, i) => {
        schedule(() => {
          if (!mounted.current) return;
          indices.forEach((idx) => {
            const cell = CELL_BY_IDX[idx];
            if (!cell) return;
            const inNext = cell[nextProp as "inHeart" | "inBulb"];
            const inPrev = !first && cell[prevProp as "inHeart" | "inBulb"];
            if (!inNext && !inPrev) return;

            const el = rectRefs.current[idx];
            if (!el) return;

            el.getAnimations().forEach((a) => {
              try {
                a.commitStyles();
              } catch {
                /* ignore */
              }
              a.cancel();
            });

            const nextFill = next === "heart" ? HEART_FILL : cell.bulbFill;
            const prevFill = next === "heart" ? cell.bulbFill : HEART_FILL;

            if (inNext && inPrev) {
              el.animate(
                [
                  {
                    fill: prevFill,
                    transform: "scale(1)",
                    opacity: "1",
                    offset: 0,
                  },
                  {
                    fill: prevFill,
                    transform: "scale(0.68)",
                    opacity: "0.4",
                    offset: 0.3,
                  },
                  {
                    fill: nextFill,
                    transform: "scale(0.68)",
                    opacity: "0.4",
                    offset: 0.33,
                  },
                  {
                    fill: nextFill,
                    transform: "scale(1)",
                    opacity: "1",
                    offset: 1,
                  },
                ],
                {
                  duration: CELL_ANIM_MS,
                  easing: "ease-in-out",
                  fill: "forwards",
                },
              );
            } else if (inNext) {
              el.animate(
                [
                  { fill: nextFill, transform: "scale(0.35)", opacity: "0" },
                  { fill: nextFill, transform: "scale(1)", opacity: "1" },
                ],
                {
                  duration: CELL_ANIM_MS,
                  easing: "cubic-bezier(0.2, 0, 0.2, 1)",
                  fill: "forwards",
                },
              );
            } else {
              el.animate(
                [
                  { fill: prevFill, transform: "scale(1)", opacity: "1" },
                  { fill: prevFill, transform: "scale(0.35)", opacity: "0" },
                ],
                {
                  duration: CELL_ANIM_MS,
                  easing: "cubic-bezier(0.55, 0, 1, 0.45)",
                  fill: "forwards",
                },
              );
            }
          });
        }, i * WAVE_STEP_MS);
      });

      // Gentle breathing pulse mid-hold
      schedule(
        () => {
          if (!mounted.current) return;
          beatRef.current?.animate(
            [
              { transform: "scale(1)", offset: 0 },
              { transform: "scale(1.025)", offset: 0.5 },
              { transform: "scale(1)", offset: 1 },
            ],
            {
              duration: Math.round(HOLD_MS * 0.8),
              easing: "ease-in-out",
              fill: "none",
            },
          );
        },
        waveDuration + Math.round(CELL_ANIM_MS * 0.55),
      );

      schedule(() => {
        if (!mounted.current) return;
        onDone?.();
      }, waveDuration + HOLD_MS);
    },
    [schedule],
  );

  React.useEffect(() => {
    mounted.current = true;
    show("heart", () => {
      if (!mounted.current) return;
      function cycle() {
        show("bulb", () => {
          if (!mounted.current) return;
          show("heart", () => {
            if (!mounted.current) return;
            cycle();
          });
        });
      }
      cycle();
    });

    return () => {
      mounted.current = false;
      clearAllTimers();
    };
  }, [show, clearAllTimers]);

  const sizeClasses = {
    sm: "w-10",
    md: "w-16",
    lg: "w-24",
    xl: "w-32",
  }[size];

  return (
    <div
      data-slot="loading-animation-svg"
      className={cn("flex flex-col items-center justify-center gap-3.5", className)}
    >
      <svg
        viewBox={`0 0 ${COLS} ${ROWS}`}
        className={cn(sizeClasses, "transition-all duration-300 drop-shadow-sm")}
        style={{ aspectRatio: `${COLS}/${ROWS}` }}
        role="img"
        aria-label="Lumen is illuminating"
      >
        <g
          ref={beatRef}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {Array.from({ length: ROWS * COLS }, (_, idx) => {
            const cell = CELL_BY_IDX[idx];
            return (
              <path
                key={idx}
                ref={(el) => {
                  rectRefs.current[idx] = el;
                }}
                d={cell.d}
                fill="transparent"
                opacity={0}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            );
          })}
        </g>
      </svg>

      {showText && (
        <p className="flex items-center text-center text-[11px] font-semibold tracking-[0.2em] text-[#66756E] dark:text-[#929C97] uppercase select-none">
          <span>{text}</span>
          <span className="inline-block animate-[blink_1.4s_infinite] opacity-0 ml-0.5">.</span>
          <span className="inline-block animate-[blink_1.4s_0.2s_infinite] opacity-0">.</span>
          <span className="inline-block animate-[blink_1.4s_0.4s_infinite] opacity-0">.</span>
        </p>
      )}
    </div>
  );
}
