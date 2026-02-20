"use client";

import { scaleLinear, scaleLog } from "@visx/scale";
import { Group } from "@visx/group";
import { Circle } from "@visx/shape";
import { Text } from "@visx/text";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { Model, bestCost, getLab } from "@/data/models";

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

  const costs = models.map((m) => bestCost(m));
  const maxCost = Math.max(...costs);
  const minCost = Math.min(...costs);

  const xScale = scaleLog({
    domain: [Math.max(0.05, minCost * 0.7), maxCost * 1.3],
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
            const cost = bestCost(model);
            const cx = xScale(cost);
            const cy = yScale(model.scores.overall);
            const isHighlighted =
              !tooltipOpen || tooltipData?.id === model.id;
            return (
              <Group key={model.id}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={tooltipData?.id === model.id ? 8 : 6}
                  fill={categoryColors[model.category]}
                  opacity={isHighlighted ? 0.85 : 0.25}
                  style={{
                    transition: "opacity 0.2s ease, r 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseMove={(e) => {
                    showTooltip({
                      tooltipData: model,
                      tooltipLeft: e.clientX,
                      tooltipTop: e.clientY - 10,
                    });
                  }}
                  onMouseLeave={hideTooltip}
                />
                {(!tooltipOpen || tooltipData?.id === model.id) && (
                  <Text
                    x={cx}
                    y={cy - 12}
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
          className="bg-[var(--tooltip-bg)] text-[var(--tooltip-fg)] px-3 py-2 rounded-lg text-sm shadow-lg pointer-events-none z-50"
        >
          <div className="font-semibold">{tooltipData.name}</div>
          <div className="opacity-70">
            {getLab(tooltipData.labId)?.name}
          </div>
          <div className="mt-1">
            Score: {tooltipData.scores.overall} · $
            {bestCost(tooltipData).toFixed(2)}/1M tokens
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
