"use client";

import { scaleLinear, scaleLog } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { Model, costRange, getLab, getProvider, overallScore } from "@/data/models";

interface ScatterProps {
  models: Model[];
}

interface ChartProps extends ScatterProps {
  width: number;
  height: number;
}

const categoryColors: Record<Model["category"], string> = {
  frontier: "var(--accent)",
  mid: "#af52de",
  efficient: "var(--speed-bar-start)",
};

const SAUSAGE_HEIGHT = 12;
const MIN_SAUSAGE_WIDTH = 12; // minimum width so single-provider models still look like dots

function Chart({ models, width, height }: ChartProps) {
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

  const allCosts = models.flatMap((m) => m.providers.map((p) => p.blendedCost));
  const globalMinCost = Math.min(...allCosts);
  const globalMaxCost = Math.max(...allCosts);

  const xScale = scaleLog({
    domain: [Math.max(0.05, globalMinCost * 0.7), globalMaxCost * 1.3],
    range: [0, innerWidth],
  });

  const yScale = scaleLinear({
    domain: [65, 100],
    range: [innerHeight, 0],
  });

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={[0.1, 0.3, 1, 3, 10, 30]}
            tickFormat={(v) => {
              const n = Number(v);
              return `$${n < 1 ? n.toFixed(1) : n.toFixed(0)}`;
            }}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({
              fill: "var(--foreground-tertiary)",
              fontSize: 11,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              textAnchor: "middle" as const,
              dy: 4,
            })}
            label="Blended Cost per 1M Tokens"
            labelOffset={28}
            labelProps={{
              fill: "var(--foreground-secondary)",
              fontSize: 12,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              textAnchor: "middle",
              fontWeight: 500,
            }}
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({
              fill: "var(--foreground-tertiary)",
              fontSize: 11,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              textAnchor: "end" as const,
              dx: -4,
              dy: 3,
            })}
            label="Intelligence Score"
            labelOffset={40}
            labelProps={{
              fill: "var(--foreground-secondary)",
              fontSize: 12,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              textAnchor: "middle",
              fontWeight: 500,
            }}
          />
          {models.map((model) => {
            const [minCost, maxCost] = costRange(model);
            const cy = yScale(overallScore(model));
            const x1 = xScale(minCost);
            const x2 = xScale(maxCost);
            const rawWidth = x2 - x1;
            const sausageWidth = Math.max(rawWidth, MIN_SAUSAGE_WIDTH);
            // Center the sausage if we expanded it to minimum width
            const sausageX =
              rawWidth < MIN_SAUSAGE_WIDTH
                ? x1 - (MIN_SAUSAGE_WIDTH - rawWidth) / 2
                : x1;
            const isHighlighted =
              !tooltipOpen || tooltipData?.id === model.id;
            const isHovered = tooltipData?.id === model.id;

            // Label position: center of the sausage
            const labelX = sausageX + sausageWidth / 2;

            return (
              <Group key={model.id}>
                <Bar
                  x={sausageX}
                  y={cy - SAUSAGE_HEIGHT / 2}
                  width={sausageWidth}
                  height={SAUSAGE_HEIGHT}
                  rx={SAUSAGE_HEIGHT / 2}
                  fill={categoryColors[model.category]}
                  opacity={isHighlighted ? 0.85 : 0.25}
                  style={{
                    transition: "opacity 0.2s ease",
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
                {(!tooltipOpen || isHovered) && (
                  <>
                    <Text
                      x={labelX}
                      y={cy - SAUSAGE_HEIGHT / 2 - 6}
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
                      x={labelX}
                      y={cy - SAUSAGE_HEIGHT / 2 - 6}
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
                  </>
                )}
              </Group>
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
            {[...tooltipData.providers]
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
              ))}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default function CostPerformanceScatter({ models }: ScatterProps) {
  return (
    <ParentSize>
      {({ width }) =>
        width > 0 ? (
          <Chart models={models} width={width} height={420} />
        ) : null
      }
    </ParentSize>
  );
}
