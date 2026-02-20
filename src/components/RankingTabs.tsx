"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import { LinearGradient } from "@visx/gradient";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { Model, bestSpeed, getLab, overallScore } from "@/data/models";

type Tab = "intelligence" | "speed";
const TABS: Tab[] = ["intelligence", "speed"];
const MODEL_COUNT = 8;

interface RankingTabsProps {
  models: Model[];
}

interface ChartProps {
  models: Model[];
  tab: Tab;
  width: number;
  height: number;
  animKey: number;
}

function getValue(model: Model, tab: Tab): number {
  return tab === "intelligence" ? overallScore(model) : bestSpeed(model);
}

function Chart({ models, tab, width, height, animKey }: ChartProps) {
  const topN = [...models]
    .sort((a, b) => getValue(b, tab) - getValue(a, tab))
    .slice(0, MODEL_COUNT);

  const axisLabel = tab === "intelligence" ? "Average score" : "Tokens per second";
  const margin = { top: 8, right: 56, bottom: 36, left: 160 };
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

  const maxVal =
    tab === "intelligence"
      ? 100
      : Math.max(...topN.map((m) => getValue(m, tab))) * 1.1;

  const yScale = scaleBand({
    domain: topN.map((m) => m.id),
    range: [0, innerHeight],
    padding: 0.35,
  });

  const xScale = scaleLinear({
    domain: [0, maxVal],
    range: [0, innerWidth],
  });

  const barHeight = yScale.bandwidth();
  const gradientId = tab === "intelligence" ? "rank-bar-grad" : "rank-speed-grad";

  // Animate bars on mount / tab change
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const raf = requestAnimationFrame(() => {
      setProgress(1);
    });
    return () => cancelAnimationFrame(raf);
  }, [animKey]);

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
        <Group left={margin.left} top={margin.top}>
          {topN.map((model) => {
            const y = yScale(model.id) ?? 0;
            const val = getValue(model, tab);
            const targetWidth = xScale(val);
            const barW = progress === 1 ? targetWidth : 0;
            return (
              <Group key={model.id}>
                <Text
                  x={-12}
                  y={y + barHeight / 2}
                  textAnchor="end"
                  verticalAnchor="middle"
                  fill="var(--foreground-secondary)"
                  fontSize={13}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  fontWeight={500}
                >
                  {model.name}
                </Text>
                <Bar
                  x={0}
                  y={y}
                  width={barW}
                  height={barHeight}
                  rx={barHeight / 2}
                  fill={`url(#${gradientId})`}
                  opacity={tooltipOpen && tooltipData?.id !== model.id ? 0.4 : 1}
                  style={{
                    transition:
                      progress === 1
                        ? "width 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease"
                        : "none",
                    cursor: "pointer",
                  }}
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
                />
                <Text
                  x={barW + 8}
                  y={y + barHeight / 2}
                  verticalAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={13}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  fontWeight={600}
                  style={{
                    transition:
                      progress === 1
                        ? "x 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
                        : "none",
                  }}
                >
                  {val.toString()}
                </Text>
              </Group>
            );
          })}
          <Text
            x={innerWidth / 2}
            y={innerHeight + 28}
            textAnchor="middle"
            fill="var(--foreground-secondary)"
            fontSize={12}
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
            fontWeight={500}
          >
            {axisLabel}
          </Text>
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          unstyled
          applyPositionStyle
          className="bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] px-3 py-2.5 rounded-2xl text-sm shadow-lg pointer-events-none z-50 min-w-[220px]"
        >
          <div className="font-semibold">{tooltipData.name}</div>
          <div className="opacity-70 text-xs">
            {getLab(tooltipData.labId)?.name}
          </div>
          {tab === "intelligence" ? (
            <div className="mt-2 space-y-1.5">
              {(
                [
                  ["Coding", tooltipData.scores.coding],
                  ["Reasoning", tooltipData.scores.reasoning],
                  ["Math", tooltipData.scores.math],
                  ["General", tooltipData.scores.general],
                ] as const
              ).map(([label, score]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[11px] w-16 text-right opacity-60 shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--foreground)]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${score}%`,
                        background: "linear-gradient(to right, var(--bar-fill-start), var(--bar-fill-end))",
                      }}
                    />
                  </div>
                  <span className="text-[11px] w-6 tabular-nums font-medium">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1">
              {bestSpeed(tooltipData)} tok/s
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default function RankingTabs({ models }: RankingTabsProps) {
  const [tab, setTab] = useState<Tab>("intelligence");
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartHeight = MODEL_COUNT * 44 + 16 + 36; // bars + bottom axis area

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

  const slideTransform = transitioning
    ? slideDir === "right"
      ? "translateX(24px)"
      : "translateX(-24px)"
    : "translateX(0)";

  return (
    <div>
      <div className="flex gap-6 mb-6">
        <button
          onClick={() => switchTab("intelligence")}
          className={`text-2xl font-semibold tracking-tight transition-colors duration-200 cursor-pointer ${
            tab === "intelligence"
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Intelligence
        </button>
        <button
          onClick={() => switchTab("speed")}
          className={`text-2xl font-semibold tracking-tight transition-colors duration-200 cursor-pointer ${
            tab === "speed"
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Speed
        </button>
      </div>
      <p className="text-sm text-foreground-tertiary mb-8">
        {tab === "intelligence"
          ? "Top models by composite score across reasoning, coding, math, and knowledge"
          : "Top models by output tokens per second (best provider)"}
      </p>
      <div
        ref={containerRef}
        style={{
          height: chartHeight,
          transform: slideTransform,
          opacity: transitioning ? 0 : 1,
          transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease",
        }}
      >
        <ParentSize>
          {({ width }) =>
            width > 0 ? (
              <Chart
                models={models}
                tab={tab}
                width={width}
                height={chartHeight}
                animKey={animKey}
              />
            ) : null
          }
        </ParentSize>
      </div>
    </div>
  );
}
