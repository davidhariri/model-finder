"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import { LinearGradient } from "@visx/gradient";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { Model, bestSpeed, bestCost, getLab, overallScore } from "@/data/models";
import BrandIcon from "@/components/BrandIcon";

type Tab = "intelligence" | "speed" | "cost";
const TABS: Tab[] = ["intelligence", "speed", "cost"];
const MODEL_COUNT = 8;

interface RankingTabsProps {
  models: Model[];
  minScore: number;
  onModelClick?: (model: Model) => void;
  onAboutClick?: () => void;
}

interface ChartProps {
  models: Model[];
  tab: Tab;
  width: number;
  height: number;
  animKey: number;
  onModelClick?: (model: Model) => void;
  onAboutClick?: () => void;
}

function getValue(model: Model, tab: Tab): number {
  if (tab === "intelligence") return overallScore(model);
  if (tab === "speed") return bestSpeed(model);
  return bestCost(model);
}

function Chart({ models, tab, width, height, animKey, onModelClick, onAboutClick }: ChartProps) {
  const sorted =
    tab === "cost"
      ? [...models].sort((a, b) => bestCost(a) - bestCost(b)) // cheapest first
      : [...models].sort((a, b) => getValue(b, tab) - getValue(a, tab));

  const topN = sorted.slice(0, MODEL_COUNT);

  const axisLabels: Record<Tab, string> = {
    intelligence: "Average of Benchmark Scores",
    speed: "Best provider tokens per second",
    cost: "Blended cost per 1M tokens (USD)",
  };
  const isCost = tab === "cost";
  const compact = width < 500;
  const margin = { top: 8, right: compact ? 48 : 80, bottom: 36, left: compact ? 8 : 160 };
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

  const maxVal = isCost
    ? Math.max(...topN.map((m) => bestCost(m))) * 1.15
    : tab === "intelligence"
      ? 100
      : Math.max(...topN.map((m) => getValue(m, tab))) * 1.15;

  const yDomain = topN.map((m) => m.id);

  const yScale = scaleBand({
    domain: yDomain,
    range: [0, innerHeight],
    padding: compact ? 0.45 : 0.35,
  });

  const xScale = scaleLinear({
    domain: [0, maxVal],
    range: [0, innerWidth],
  });

  const barHeight = yScale.bandwidth();
  const gradientIds: Record<Tab, string> = {
    intelligence: "rank-bar-grad",
    speed: "rank-speed-grad",
    cost: "rank-cost-input",
  };
  const gradientId = gradientIds[tab];

  // Animate bars on tab change (skip on first mount — fade-in handles it)
  const isFirstMount = useRef(true);
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setProgress(0);
    const raf = requestAnimationFrame(() => {
      setProgress(1);
    });
    return () => cancelAnimationFrame(raf);
  }, [animKey]);

  const handleMouseMove = (model: Model) => (e: React.MouseEvent) => {
    const svgRect = e.currentTarget.closest("svg")?.getBoundingClientRect();
    showTooltip({
      tooltipData: model,
      tooltipLeft: e.clientX - (svgRect?.left ?? 0),
      tooltipTop: e.clientY - (svgRect?.top ?? 0) + 16,
    });
  };

  const barTransition = progress === 1
    ? "width 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease"
    : "none";

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient
          id="rank-bar-grad"
          from="var(--bar-fill-start)"
          to="var(--bar-fill-end)"
          x1={0}
          x2={1}
          y1={0}
          y2={0}
        />
        <LinearGradient
          id="rank-speed-grad"
          from="var(--speed-bar-start)"
          to="var(--speed-bar-end)"
          x1={0}
          x2={1}
          y1={0}
          y2={0}
        />
        <LinearGradient
          id="rank-cost-input"
          from="var(--cost-bar-start)"
          to="var(--cost-bar-end)"
          x1={0}
          x2={1}
          y1={0}
          y2={0}
        />
        <LinearGradient
          id="rank-cost-output"
          from="var(--cost-bar-output-start)"
          to="var(--cost-bar-output-end)"
          x1={0}
          x2={1}
          y1={0}
          y2={0}
        />
        <Group left={margin.left} top={margin.top}>
          {topN.map((model) => {
            const y = yScale(model.id) ?? 0;
            const dimmed = tooltipOpen && tooltipData?.id !== model.id;

            const val = getValue(model, tab);
            const targetWidth = xScale(val);
            const barW = progress === 1 ? targetWidth : 0;
            return (
              <Group key={model.id}>
                {compact ? (
                  <foreignObject
                    x={0}
                    y={y + barHeight + 4}
                    width={innerWidth}
                    height={18}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--foreground-secondary)" }}>
                      <BrandIcon id={model.labId} size={12} className="shrink-0" />
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-secondary)", whiteSpace: "nowrap" }}>
                        {model.name}
                      </span>
                    </div>
                  </foreignObject>
                ) : (
                  <foreignObject
                    x={-margin.left}
                    y={y + barHeight / 2 - 10}
                    width={margin.left - 12}
                    height={20}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, height: "100%", color: "var(--foreground-secondary)" }}>
                      <BrandIcon id={model.labId} size={14} className="shrink-0" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground-secondary)", whiteSpace: "nowrap" }}>
                        {model.name}
                      </span>
                    </div>
                  </foreignObject>
                )}
                <Bar
                  x={0}
                  y={y}
                  width={barW}
                  height={barHeight}
                  rx={barHeight / 2}
                  fill={`url(#${gradientId})`}
                  opacity={dimmed ? 0.4 : 1}
                  style={{ transition: barTransition, cursor: "pointer" }}
                  onMouseMove={handleMouseMove(model)}
                  onMouseLeave={hideTooltip}
                  onClick={() => onModelClick?.(model)}
                />
                <Text
                  x={barW + 8}
                  y={y + barHeight / 2}
                  verticalAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={compact ? 11 : 13}
                  fontWeight={600}
                  style={{
                    transition: progress === 1 ? "x 0.6s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
                  }}
                >
                  {isCost
                    ? `$${val.toFixed(2)}`
                    : val.toString()}
                </Text>
              </Group>
            );
          })}
          {tab === "intelligence" ? (
            <text
              x={width / 2 - margin.left}
              y={innerHeight + 16}
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
          ) : (
            <Text
              x={width / 2 - margin.left}
              y={innerHeight + 16}
              textAnchor="middle"
              fill="var(--foreground-secondary)"
              fontSize={12}
              fontWeight={500}
            >
              {axisLabels[tab]}
            </Text>
          )}
        </Group>
      </svg>
      {!compact && tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          unstyled
          applyPositionStyle
          className="bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] px-4 py-3.5 rounded-2xl text-sm shadow-lg pointer-events-none z-50 min-w-[200px]"
        >
          <div className="font-semibold">{tooltipData.name}</div>
          <div className="flex items-center gap-1.5 opacity-70 text-xs mt-0.5">
            <BrandIcon id={tooltipData.labId} size={12} />
            {getLab(tooltipData.labId)?.name}
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Intelligence</span>
              <span className="font-medium tabular-nums">{overallScore(tooltipData)}</span>
            </div>
            <div className="border-t border-[var(--foreground)]/10" />
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Best Speed</span>
              <span className="font-medium tabular-nums">{bestSpeed(tooltipData)} <span className="opacity-50 font-normal">tok/s</span></span>
            </div>
            <div className="border-t border-[var(--foreground)]/10" />
            <div className="flex justify-between gap-6">
              <span className="opacity-60">Lowest Blended Cost</span>
              <span className="font-medium tabular-nums">${bestCost(tooltipData).toFixed(2)} <span className="opacity-50 font-normal">/1M</span></span>
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default function RankingTabs({ models, minScore, onModelClick, onAboutClick }: RankingTabsProps) {
  const [tab, setTab] = useState<Tab>("intelligence");
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [transitioning, setTransitioning] = useState(false);
  const [compact, setCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setCompact((entries[0]?.contentRect.width ?? 999) < 500);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const barCount = Math.min(MODEL_COUNT, models.length);
  const chartHeight = compact
    ? barCount * 60 + 16 + 36
    : barCount * 44 + 16 + 36;

  const switchTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      const dir = TABS.indexOf(next) > TABS.indexOf(tab) ? "right" : "left";
      setSlideDir(dir);
      setTransitioning(true);

      // Fade out, then swap, then fade in
      setTimeout(() => {
        setTab(next);
        setAnimKey((k) => k + 1);
        setSlideDir(dir === "right" ? "left" : "right"); // enter from opposite side
        requestAnimationFrame(() => {
          setTransitioning(false);
        });
      }, 200);
    },
    [tab]
  );

  const slideTransform = "translateX(0)";

  return (
    <div>
      <div className="flex gap-4 md:gap-6 mb-3 md:mb-6 justify-center">
        <button
          onClick={() => switchTab("intelligence")}
          className={`text-lg md:text-2xl font-semibold tracking-tight transition-colors duration-200 cursor-pointer ${
            tab === "intelligence"
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Intelligence
        </button>
        <button
          onClick={() => switchTab("speed")}
          className={`text-lg md:text-2xl font-semibold tracking-tight transition-colors duration-200 cursor-pointer ${
            tab === "speed"
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Speed
        </button>
        <button
          onClick={() => switchTab("cost")}
          className={`text-lg md:text-2xl font-semibold tracking-tight transition-colors duration-200 cursor-pointer ${
            tab === "cost"
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Cost
        </button>
      </div>
      <div
        ref={containerRef}
        style={{
          height: chartHeight,
          transform: slideTransform,
          opacity: transitioning ? 0 : 1,
          transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease, height 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <ParentSize style={{ minHeight: chartHeight }}>
          {({ width }) => (
            <div
              style={{
                opacity: width > 0 ? 1 : 0,
                transition: "opacity 300ms ease",
              }}
            >
              {width > 0 && (
                <Chart
                  models={models}
                  tab={tab}
                  width={width}
                  height={chartHeight}
                  animKey={animKey}
                  onModelClick={onModelClick}
                  onAboutClick={onAboutClick}
                />
              )}
            </div>
          )}
        </ParentSize>
      </div>
    </div>
  );
}
