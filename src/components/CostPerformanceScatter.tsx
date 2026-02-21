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
  ModelProvider,
  blendedCost,
  getLab,
  getProvider,
  overallScore,
} from "@/data/models";
import BrandIcon from "@/components/BrandIcon";

interface ScatterProps {
  models: Model[];
  onModelClick?: (model: Model) => void;
  onAboutClick?: () => void;
}

interface ChartProps extends ScatterProps {
  width: number;
  height: number;
  mode: ScatterMode;
}

type ScatterMode = "cost" | "speed";

interface TooltipPoint {
  model: Model;
  provider: ModelProvider;
}

const POINT_RADIUS = 7;
const HIT_RADIUS = 14;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION = "0.6s";

function Chart({ models, width, height, mode, onModelClick, onAboutClick }: ChartProps) {
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
  } = useTooltip<TooltipPoint>();

  // Hide tooltip when mode changes
  useEffect(() => {
    hideTooltip();
  }, [mode, hideTooltip]);

  const isCost = mode === "cost";

  // Scales
  const costXScale = scaleLog({
    domain: [0.1, 50],
    range: [0, innerWidth],
  });

  const speedXScale = scaleLog({
    domain: [10, 5000],
    range: [0, innerWidth],
  });

  const minScore = Math.min(...models.map((m) => overallScore(m)));
  const yScale = scaleLinear({
    domain: [Math.max(0, minScore - 5), 100],
    range: [innerHeight, 0],
  });

  const axisLabelProps = {
    fill: "var(--foreground-secondary)",
    fontSize: 12,
    textAnchor: "middle" as const,
    fontWeight: 500,
  };

  const tickLabelFn = () => ({
    fill: "var(--foreground-tertiary)",
    fontSize: 11,
    textAnchor: "middle" as const,
    dy: 4,
  });

  // Spread overlapping models apart on Y axis
  const nudgeMap = new Map<string, number>();
  {
    const MIN_GAP = POINT_RADIUS * 2 + 4;
    const items = models
      .map((m) => ({ id: m.id, baseY: yScale(overallScore(m)) }))
      .sort((a, b) => a.baseY - b.baseY);

    const adjustedY = items.map((it) => it.baseY);
    for (let pass = 0; pass < 10; pass++) {
      let moved = false;
      for (let i = 1; i < adjustedY.length; i++) {
        const gap = adjustedY[i] - adjustedY[i - 1];
        if (gap < MIN_GAP) {
          const push = (MIN_GAP - gap) / 2;
          adjustedY[i - 1] -= push;
          adjustedY[i] += push;
          moved = true;
        }
      }
      if (!moved) break;
    }

    for (let i = 0; i < items.length; i++) {
      const offset = adjustedY[i] - items[i].baseY;
      if (offset !== 0) nudgeMap.set(items[i].id, offset);
    }
  }

  // Flatten models into individual model+provider points
  const points = models.flatMap((model) =>
    model.providers.map((provider) => ({ model, provider }))
  );

  // Unique key for a point
  const pointKey = (m: Model, p: ModelProvider) => `${m.id}::${p.providerId}`;
  const hoveredKey = tooltipData ? pointKey(tooltipData.model, tooltipData.provider) : null;

  // Layout all points
  const layoutItems = points.map(({ model, provider }) => {
    const cy = yScale(overallScore(model)) + (nudgeMap.get(model.id) ?? 0);
    const cx = isCost
      ? costXScale(blendedCost(provider))
      : speedXScale(provider.tokensPerSecond);
    const key = pointKey(model, provider);
    const isHovered = key === hoveredKey;
    const isHighlighted = !tooltipOpen || isHovered;
    return { model, provider, cx, cy, key, isHovered, isHighlighted };
  }).sort((a, b) => {
    // Hovered always on top
    if (a.isHovered !== b.isHovered) return a.isHovered ? 1 : -1;
    return 0;
  });


  return (
    <div className="relative">
      <svg width={width} height={height} onMouseLeave={hideTooltip}>
        <defs>
          <linearGradient id="scatter-cost-grad" gradientUnits="userSpaceOnUse" x1={margin.left} x2={margin.left + innerWidth} y1="0" y2="0">
            <stop offset="0%" stopColor="var(--bar-fill-end)" />
            <stop offset="100%" stopColor="var(--cost-bar-end)" />
          </linearGradient>
          <linearGradient id="scatter-speed-grad" gradientUnits="userSpaceOnUse" x1={margin.left} x2={margin.left + innerWidth} y1="0" y2="0">
            <stop offset="0%" stopColor="var(--bar-fill-end)" />
            <stop offset="100%" stopColor="var(--speed-bar-end)" />
          </linearGradient>
        </defs>
        <Group left={margin.left} top={margin.top}>
          {/* Cost axis — fades in/out */}
          <g style={{ opacity: isCost ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents: isCost ? "auto" : "none" }}>
            <AxisBottom
              top={innerHeight}
              scale={costXScale}
              tickValues={[0.1, 0.3, 1, 3, 10, 30, 50]}
              tickFormat={(v) => {
                const n = Number(v);
                return `$${n < 1 ? n.toFixed(2) : n.toFixed(1)}`;
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
              tickValues={[10, 30, 100, 300, 1000, 3000]}
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
              textAnchor: "end" as const,
              dx: -4,
              dy: 3,
            })}
          />
          {/* Y-axis label with clickable "Benchmark Scores" */}
          <text
            transform={`translate(${-52}, ${innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="var(--foreground-secondary)"
            fontSize={12}
            fontWeight={500}
          >
            <tspan>Average of </tspan>
            <tspan
              style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "color-mix(in srgb, var(--foreground-secondary) 25%, transparent)" }}
              onClick={onAboutClick}
            >
              Benchmark Scores
            </tspan>
          </text>

          {/* Pass 1: hit areas + points */}
          {layoutItems.map(({ model, provider, cx, cy, key, isHighlighted }) => (
            <g key={key}>
              {/* Invisible larger hit area */}
              <circle
                cx={cx}
                cy={cy}
                r={HIT_RADIUS}
                fill="transparent"
                onMouseMove={(e) => {
                  const svgRect = e.currentTarget.closest("svg")?.getBoundingClientRect();
                  showTooltip({
                    tooltipData: { model, provider },
                    tooltipLeft: e.clientX - (svgRect?.left ?? 0),
                    tooltipTop: e.clientY - (svgRect?.top ?? 0) + 16,
                  });
                }}
                onMouseLeave={hideTooltip}
                onClick={() => onModelClick?.(model)}
                style={{
                  cursor: "pointer",
                  transition: `cx ${DURATION} ${EASING}`,
                } as React.CSSProperties}
              />
              {/* Visible point */}
              <circle
                cx={cx}
                cy={cy}
                r={POINT_RADIUS}
                fill={isCost ? "url(#scatter-cost-grad)" : "url(#scatter-speed-grad)"}
                stroke="var(--border)"
                strokeWidth={1}
                pointerEvents="none"
                style={{
                  opacity: isHighlighted ? 1 : 0.3,
                  transition: `cx ${DURATION} ${EASING}, opacity 0.2s ease`,
                } as React.CSSProperties}
              />
            </g>
          ))}

          {/* Pass 2: labels on top of all points */}
          {layoutItems.map(({ model, cx, cy, key, isHighlighted }) => (
            <g
              key={`label-${key}`}
              style={{
                transform: `translate(${cx}px, ${cy - POINT_RADIUS - 6}px)`,
                transition: `transform ${DURATION} ${EASING}`,
              }}
            >
              <Text
                x={0}
                y={0}
                textAnchor="middle"
                fill="var(--background)"
                fontSize={11}
                fontWeight={500}
                stroke="var(--background)"
                strokeWidth={4}
                paintOrder="stroke"
                opacity={isHighlighted ? (tooltipOpen ? 1 : 0.8) : 0.3}
                style={{ transition: "opacity 0.2s ease" }}
              >
                {model.name}
              </Text>
              <Text
                x={0}
                y={0}
                textAnchor="middle"
                fill="var(--foreground-secondary)"
                fontSize={11}
                fontWeight={500}
                opacity={isHighlighted ? (tooltipOpen ? 1 : 0.8) : 0.3}
                style={{ transition: "opacity 0.2s ease" }}
              >
                {model.name}
              </Text>
            </g>
          ))}
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          unstyled
          applyPositionStyle
          className="bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] px-4 py-3.5 rounded-2xl text-sm shadow-lg pointer-events-none z-50 min-w-[200px]"
        >
          <div className="font-semibold">{tooltipData.model.name}</div>
          <div className="flex items-center gap-1.5 opacity-70 text-xs mt-0.5">
            <BrandIcon id={tooltipData.model.labId} size={12} />
            {getLab(tooltipData.model.labId)?.name}
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Provider</span>
              <span className="font-medium flex items-center gap-1.5">
                <BrandIcon id={tooltipData.provider.providerId} size={12} />
                {getProvider(tooltipData.provider.providerId)?.name}
              </span>
            </div>
            <div className="border-t border-[var(--foreground)]/10" />
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Intelligence</span>
              <span className="font-medium tabular-nums">{overallScore(tooltipData.model)}</span>
            </div>
            <div className="border-t border-[var(--foreground)]/10" />
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Speed</span>
              <span className="font-medium tabular-nums">{tooltipData.provider.tokensPerSecond} <span className="opacity-50 font-normal">tok/s</span></span>
            </div>
            <div className="border-t border-[var(--foreground)]/10" />
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Blended Cost</span>
              <span className="font-medium tabular-nums">${blendedCost(tooltipData.provider).toFixed(2)} <span className="opacity-50 font-normal">/1M</span></span>
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

const MODES: ScatterMode[] = ["cost", "speed"];
const MODE_LABELS: Record<ScatterMode, string> = { cost: "Cost", speed: "Speed" };
const ITEM_HEIGHT = 36;

export default function CostPerformanceScatter({ models, onModelClick, onAboutClick }: ScatterProps) {
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
      }, 400);
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
            <Chart models={models} width={width} height={520} mode={mode} onModelClick={onModelClick} onAboutClick={onAboutClick} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
