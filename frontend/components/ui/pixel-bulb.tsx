"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ROWS = 8;
const COLS = 10;
const R = 0.3;

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

type CornerSpec = { tl?: number; tr?: number; bl?: number; br?: number };

const CORNER_MAP: Record<string, CornerSpec> = {
  "0,3": { tl: R },
  "0,6": { tr: R },
  "1,2": { tl: R },
  "1,7": { tr: R },
  "2,1": { tl: R },
  "2,8": { tr: R },
  "3,1": { bl: R },
  "3,8": { br: R },
  "4,2": { bl: R },
  "4,7": { br: R },
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

type Cell = {
  row: number;
  col: number;
  fill: string;
  d: string;
};

const BULB_CELLS: Cell[] = (() => {
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (BULB_PATTERN[row][col] === 1) {
        const key = `${row},${col}`;
        cells.push({
          row,
          col,
          fill: getBulbFill(row, col),
          d: cellPath(col, row, CORNER_MAP[key]),
        });
      }
    }
  }
  return cells;
})();

export interface PixelBulbProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

export function PixelBulb({
  className,
  size = "md",
  glow = false,
}: PixelBulbProps) {
  const sizeClasses = {
    xs: "w-3.5 h-[11px]",
    sm: "w-5 h-4",
    md: "w-6 h-5",
    lg: "w-8 h-[26px]",
    xl: "w-12 h-[38px]",
  }[size];

  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      className={cn(
        sizeClasses,
        "inline-block shrink-0 transition-transform select-none",
        glow && "drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]",
        className,
      )}
      style={{ aspectRatio: `${COLS}/${ROWS}` }}
      role="img"
      aria-label="Lumen Light Bulb"
    >
      <g style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {BULB_CELLS.map((cell, idx) => (
          <path
            key={idx}
            d={cell.d}
            fill={cell.fill}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </g>
    </svg>
  );
}

export default PixelBulb;
