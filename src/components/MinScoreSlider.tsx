"use client";

import { useState, useRef, useCallback } from "react";

const TRACK_WIDTH = 300;
const TRACK_HEIGHT = 40;
const THUMB_SIZE = 32;
const PAD = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const THUMB_RANGE = TRACK_WIDTH - THUMB_SIZE - PAD * 2;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

interface MinScoreSliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  empty?: boolean;
  label?: string;
  unit?: string;
  prefix?: string;
  /** Power curve exponent for non-linear mapping (1 = linear, 2 = quadratic, etc.) */
  curve?: number;
}

/** Format a number: drop trailing .0 but keep .5, .25, etc. */
function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  // Show up to 2 decimal places, strip trailing zeros
  return v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Snap value to the nearest "nice" step based on magnitude, scaled to range */
function niceSnap(raw: number, max: number): number {
  if (raw <= 0) return 0;
  if (raw >= max) return max;
  // Scale thresholds relative to max
  const pct = raw / max;
  let s: number;
  if (max <= 100) {
    // Cost-like range (0-50): very fine steps near zero
    if (raw < 0.5) s = 0.05;
    else if (raw < 2) s = 0.25;
    else if (raw < 5) s = 0.5;
    else if (raw < 20) s = 1;
    else s = 2;
  } else {
    // Speed-like range (0-3000): scale steps with magnitude
    if (pct < 0.01) s = 5;
    else if (pct < 0.05) s = 10;
    else if (pct < 0.15) s = 25;
    else if (pct < 0.4) s = 50;
    else s = 100;
  }
  return Math.round(raw / s) * s;
}

/** Generate logarithmic-style tick values for a given max */
function curveTicks(max: number, min: number): number[] {
  if (max <= 100) {
    return [0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 40].filter((v) => v > min && v < max);
  }
  // Speed-like range
  return [10, 25, 50, 100, 200, 500, 1000, 2000].filter((v) => v > min && v < max);
}

export default function MinScoreSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  empty = false,
  label = "Minimum Intelligence",
  unit,
  prefix,
  curve = 1,
}: MinScoreSliderProps) {
  const [held, setHeld] = useState(false);
  const [moved, setMoved] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const getVal = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return value;
      const x = clientX - rect.left - PAD - THUMB_SIZE / 2;
      const r = Math.max(0, Math.min(1, x / THUMB_RANGE));
      const curved = Math.pow(r, curve);
      const raw = min + curved * (max - min);
      if (curve > 1) return niceSnap(raw, max);
      return Math.round(raw / step) * step;
    },
    [min, max, step, curve, value]
  );

  const ratio = Math.pow(Math.max(0, (value - min) / (max - min)), 1 / curve);
  const thumbLeft = PAD + ratio * THUMB_RANGE;

  const displayVal = curve > 1 ? fmt(value) : (step < 1 ? value.toFixed(1) : String(value));

  return (
    <div className="flex flex-col items-center">
      <div
        ref={trackRef}
        className="relative select-none touch-none cursor-pointer"
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setHeld(true);
          setMoved(false);
          onChange(getVal(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!held) return;
          if (!moved) setMoved(true);
          onChange(getVal(e.clientX));
        }}
        onPointerUp={() => {
          setHeld(false);
          setMoved(false);
        }}
      >
        {/* Tick marks — visible when active */}
        {(() => {
          if (curve > 1) {
            return curveTicks(max, min);
          }
          const range = max - min;
          const tickStep = range <= 20 ? 2 : range <= 50 ? 5 : range <= 100 ? 10 : range <= 200 ? 25 : 50;
          const ticks: number[] = [];
          for (let v = min + tickStep; v < max; v += tickStep) ticks.push(v);
          return ticks;
        })().map((v, i) => {
          const r = Math.pow((v - min) / (max - min), 1 / curve);
          const x = PAD + r * THUMB_RANGE + THUMB_SIZE / 2;
          return (
            <div
              key={v}
              className="absolute pointer-events-none"
              style={{
                left: x,
                top: (TRACK_HEIGHT - 8) / 2,
                width: 1,
                height: 8,
                borderRadius: 0.5,
                background: "color-mix(in srgb, var(--foreground) 15%, transparent)",
                opacity: held ? 1 : 0,
                transition: `opacity 0.25s ease ${i * 0.02}s`,
              }}
            />
          );
        })}

        {/* Thumb + label container — moves together */}
        <div
          className="absolute"
          style={{
            left: thumbLeft,
            top: 0,
            transition: moved ? "none" : `left 0.4s ${EASING}`,
          }}
        >
          {/* Circle thumb */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: PAD,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              background: "var(--card-bg)",
              transform: held ? "scale(1.15)" : "scale(1)",
              transition: `transform 0.4s ${SPRING}, background 0.15s ease`,
            }}
          >
            {/* Value inside circle */}
            <span
              className="text-[12px] font-semibold tabular-nums select-none"
              style={{
                color: "#555",
                opacity: held ? 0 : 1,
                transform: held ? "scale(0.5)" : "scale(1)",
                transition: held
                  ? "opacity 0.1s ease, transform 0.1s ease"
                  : `opacity 0.25s ease 0.15s, transform 0.3s ${EASING} 0.15s`,
              }}
            >
              {displayVal}
            </span>
          </div>

          {/* Label below thumb (visible when dragging) */}
          <div
            className="absolute pointer-events-none whitespace-nowrap"
            style={{
              left: THUMB_SIZE / 2,
              top: TRACK_HEIGHT + 6,
              transform: `translateX(-50%) translateY(${held ? "0" : "-4px"})`,
              opacity: held ? 1 : 0,
              transition: held
                ? "opacity 0.15s ease, transform 0.15s ease"
                : "opacity 0.2s ease, transform 0.2s ease",
            }}
          >
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {prefix ?? ""}{displayVal}{unit ? ` ${unit}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Static label below */}
      <span
        className="mt-5 text-xs font-medium"
        style={{
          transform: held ? "translateY(12px)" : "translateY(0)",
          color: empty ? "#f59e0b" : "var(--foreground-secondary)",
          transition: `transform 0.4s ${SPRING}, color 0.3s ease`,
        }}
      >
        {empty ? "No Possible Models" : label}
      </span>
    </div>
  );
}
