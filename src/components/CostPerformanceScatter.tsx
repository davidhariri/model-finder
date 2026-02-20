"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { scaleLinear, scaleLog } from "@visx/scale";
import { Group } from "@visx/group";
import { Text } from "@visx/text";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import {
  Model,
  costRange,
  speedRange,
  getLab,
  getProvider,
  overallScore,
} from "@/data/models";

interface ScatterProps {
  models: Model[];
  onModelClick?: (model: Model) => void;
}

interface ChartProps extends ScatterProps {
  width: number;
  height: number;
  mode: ScatterMode;
}

type ScatterMode = "cost" | "speed";

const DOT_COLOR = "var(--accent)";

const SAUSAGE_HEIGHT = 12;
const MIN_SAUSAGE_WIDTH = 12;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION = "0.6s";

function Chart({ models, width, height, mode, onModelClick }: ChartProps) {
  const margin = { top: 24, right: 32, bottom: 72, left: 64 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<Model>();

  // Hide tooltip when mode changes
  useEffect(() => {
    hideTooltip();
  }, [mode, hideTooltip]);

  const isCost = mode === "cost";

  // Always compute both scales so we can transition between them
  const allCosts = models.flatMap((m) => m.providers.map((p) => p.blendedCost));
  const costXScale = scaleLog({
    domain: [Math.max(0.05, Math.min(...allCosts) * 0.7), Math.max(...allCosts) * 1.3],
    range: [0, innerWidth],
  });

  const allSpeeds = models.flatMap((m) => m.providers.map((p) => p.tokensPerSecond));
  const speedXScale = scaleLinear({
    domain: [0, Math.max(...allSpeeds) * 1.15],
    range: [0, innerWidth],
  });

  const yScale = scaleLinear({
    domain: [65, 100],
    range: [innerHeight, 0],
  });

  const axisLabelProps = {
    fill: "var(--foreground-secondary)",
    fontSize: 12,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    textAnchor: "middle" as const,
    fontWeight: 500,
  };

  const tickLabelFn = () => ({
    fill: "var(--foreground-tertiary)",
    fontSize: 11,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    textAnchor: "middle" as const,
    dy: 4,
  });

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Cost axis — fades in/out */}
          <g style={{ opacity: isCost ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents: isCost ? "auto" : "none" }}>
            <AxisBottom
              top={innerHeight}
              scale={costXScale}
              tickValues={[0.1, 0.3, 1, 3, 10, 30]}
              tickFormat={(v) => {
                const n = Number(v);
                return `$${n.toFixed(2)}`;
              }}
              stroke="var(--border)"
              tickStroke="var(--border)"
              tickLabelProps={tickLabelFn}
              label="Blended Cost per 1M Tokens"
              labelOffset={28}
              labelProps={axisLabelProps}
            />
          </g>
          {/* Speed axis — fades in/out */}
          <g style={{ opacity: isCost ? 0 : 1, transition: "opacity 0.4s ease", pointerEvents: isCost ? "none" : "auto" }}>
            <AxisBottom
              top={innerHeight}
              scale={speedXScale}
              numTicks={6}
              tickFormat={(v) => `${Number(v)}`}
              stroke="var(--border)"
              tickStroke="var(--border)"
              tickLabelProps={tickLabelFn}
              label="Tokens per Second"
              labelOffset={28}
              labelProps={axisLabelProps}
            />
          </g>
          <AxisLeft
            scale={yScale}
            numTicks={5}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({
              fill: "var(--foreground-tertiary)",
              fontSize: 11,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              textAnchor: "end" as const,
              dx: -4,
              dy: 3,
            })}
            label="Intelligence Score"
            labelOffset={40}
            labelProps={axisLabelProps}
          />
          {models.map((model) => {
            const [minCost, maxCost] = costRange(model);
            const [minSpeed, maxSpeed] = speedRange(model);
            const cy = yScale(overallScore(model));

            // Compute sausage position based on mode
            const x1 = isCost ? costXScale(minCost) : speedXScale(minSpeed);
            const x2 = isCost ? costXScale(maxCost) : speedXScale(maxSpeed);
            const rawWidth = x2 - x1;
            const sausageWidth = Math.max(rawWidth, MIN_SAUSAGE_WIDTH);
            const sausageX =
              rawWidth < MIN_SAUSAGE_WIDTH
                ? x1 - (MIN_SAUSAGE_WIDTH - rawWidth) / 2
                : x1;

            const isHighlighted = !tooltipOpen || tooltipData?.id === model.id;
            const isHovered = tooltipData?.id === model.id;
            const labelX = sausageX + sausageWidth / 2;
            const labelY = cy - SAUSAGE_HEIGHT / 2 - 6;

            return (
              <g key={model.id}>
                {/* Sausage — animated via CSS geometric properties (SVG2) */}
                <rect
                  height={SAUSAGE_HEIGHT}
                  rx={SAUSAGE_HEIGHT / 2}
                  fill={DOT_COLOR}
                  onMouseMove={(e) => {
                    const svgRect = e.currentTarget
                      .closest("svg")
                      ?.getBoundingClientRect();
                    showTooltip({
                      tooltipData: model,
                      tooltipLeft: e.clientX - (svgRect?.left ?? 0),
                      tooltipTop: e.clientY - (svgRect?.top ?? 0) + 16,
                    });
                  }}
                  onMouseLeave={hideTooltip}
                  onClick={() => onModelClick?.(model)}
                  style={{
                    x: sausageX,
                    y: cy - SAUSAGE_HEIGHT / 2,
                    width: sausageWidth,
                    opacity: isHighlighted ? 0.85 : 0.25,
                    transition: `x ${DURATION} ${EASING}, width ${DURATION} ${EASING}, opacity 0.2s ease`,
                    cursor: "pointer",
                  } as React.CSSProperties}
                />
                {/* Label with halo — animated position */}
                {(!tooltipOpen || isHovered) && (
                  <g
                    style={{
                      transform: `translate(${labelX}px, ${labelY}px)`,
                      transition: `transform ${DURATION} ${EASING}`,
                    }}
                  >
                    <Text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      fill="var(--background)"
                      fontSize={10}
                      fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                      fontWeight={500}
                      opacity={tooltipOpen ? 1 : 0.85}
                      stroke="var(--background)"
                      strokeWidth={4}
                      paintOrder="stroke"
                      style={{ transition: "opacity 0.2s ease" }}
                    >
                      {model.name}
                    </Text>
                    <Text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      fill="var(--foreground-secondary)"
                      fontSize={10}
                      fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                      fontWeight={500}
                      opacity={tooltipOpen ? 1 : 0.7}
                      style={{ transition: "opacity 0.2s ease" }}
                    >
                      {model.name}
                    </Text>
                  </g>
                )}
              </g>
            );
          })}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          unstyled
          applyPositionStyle
          className="bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] px-3 py-2.5 rounded-2xl text-sm shadow-lg pointer-events-none z-50 min-w-[200px]"
        >
          <div className="font-semibold">{tooltipData.name}</div>
          <div className="opacity-70 text-xs">
            {getLab(tooltipData.labId)?.name} · Score: {overallScore(tooltipData)}
          </div>
          <div className="mt-2 space-y-1">
            {isCost
              ? [...tooltipData.providers]
                  .sort((a, b) => a.blendedCost - b.blendedCost)
                  .map((p) => (
                    <div
                      key={p.providerId}
                      className="flex justify-between gap-4 text-xs"
                    >
                      <span className="opacity-80">
                        {getProvider(p.providerId)?.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        ${p.blendedCost.toFixed(2)}
                      </span>
                    </div>
                  ))
              : [...tooltipData.providers]
                  .sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)
                  .map((p) => (
                    <div
                      key={p.providerId}
                      className="flex justify-between gap-4 text-xs"
                    >
                      <span className="opacity-80">
                        {getProvider(p.providerId)?.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {p.tokensPerSecond} tok/s
                      </span>
                    </div>
                  ))}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

const MODES: ScatterMode[] = ["cost", "speed"];
const MODE_LABELS: Record<ScatterMode, string> = { cost: "Cost", speed: "Speed" };
const ITEM_HEIGHT = 36; // px — matches text-2xl line height

export default function CostPerformanceScatter({ models, onModelClick }: ScatterProps) {
  const [mode, setMode] = useState<ScatterMode>("cost");
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const resetting = useRef(false);

  const advance = useCallback(() => {
    if (resetting.current) return;
    const nextIdx = carouselIdx + 1;
    const nextMode = MODES[nextIdx % MODES.length];
    setCarouselIdx(nextIdx);
    setMode(nextMode);

    // When we reach the duplicate at position 2, silently reset to 0
    if (nextIdx % MODES.length === 0) {
      resetting.current = true;
      setTimeout(() => {
        setSkipTransition(true);
        setCarouselIdx(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSkipTransition(false);
            resetting.current = false;
          });
        });
      }, 400); // match transition duration
    }
  }, [carouselIdx]);

  return (
    <div>
      <div className="flex items-baseline justify-center">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          Intelligence
        </span>
        <span className="text-2xl font-semibold tracking-tight text-foreground-tertiary mx-4">
          by
        </span>
        <button
          onClick={advance}
          className="relative cursor-pointer overflow-hidden text-left"
          style={{ height: ITEM_HEIGHT }}
        >
          <div
            style={{
              transform: `translateY(${-carouselIdx * ITEM_HEIGHT}px)`,
              transition: skipTransition ? "none" : `transform 0.4s ${EASING}`,
            }}
          >
            {/* Render enough items for seamless looping: current cycle + one extra */}
            {[...MODES, MODES[0]].map((m, i) => (
              <div
                key={i}
                className="text-2xl font-semibold tracking-tight text-foreground"
                style={{ height: ITEM_HEIGHT, lineHeight: `${ITEM_HEIGHT}px` }}
              >
                {MODE_LABELS[m]}
              </div>
            ))}
          </div>
        </button>
      </div>
      <ParentSize>
        {({ width }) =>
          width > 0 ? (
            <Chart models={models} width={width} height={420} mode={mode} onModelClick={onModelClick} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
