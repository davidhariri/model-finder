"use client";

import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import { LinearGradient } from "@visx/gradient";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { Model } from "@/data/models";

interface RankingBarProps {
  models: Model[];
}

interface ChartProps extends RankingBarProps {
  width: number;
  height: number;
}

function Chart({ models, width, height }: ChartProps) {
  const sorted = [...models].sort((a, b) => b.score - a.score);

  const margin = { top: 8, right: 48, bottom: 8, left: 160 };
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

  const yScale = scaleBand({
    domain: sorted.map((m) => m.id),
    range: [0, innerHeight],
    padding: 0.35,
  });

  const xScale = scaleLinear({
    domain: [0, 100],
    range: [0, innerWidth],
  });

  const barHeight = yScale.bandwidth();

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient
          id="bar-gradient"
          from="var(--bar-fill-start)"
          to="var(--bar-fill-end)"
          x1={0}
          x2={1}
          y1={0}
          y2={0}
        />
        <Group left={margin.left} top={margin.top}>
          {sorted.map((model) => {
            const y = yScale(model.id) ?? 0;
            const barWidth = xScale(model.score);
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
                  width={barWidth}
                  height={barHeight}
                  rx={barHeight / 2}
                  fill="url(#bar-gradient)"
                  opacity={tooltipOpen && tooltipData?.id !== model.id ? 0.4 : 1}
                  style={{
                    transition: "opacity 0.2s ease",
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
                <Text
                  x={barWidth + 8}
                  y={y + barHeight / 2}
                  verticalAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={13}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
                  fontWeight={600}
                >
                  {model.score}
                </Text>
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
          <div className="opacity-70">{tooltipData.provider}</div>
          <div className="mt-1">Score: {tooltipData.score}</div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default function RankingBar({ models }: RankingBarProps) {
  const barCount = models.length;
  const estimatedHeight = barCount * 44 + 16;

  return (
    <ParentSize>
      {({ width }) =>
        width > 0 ? (
          <Chart models={models} width={width} height={estimatedHeight} />
        ) : null
      }
    </ParentSize>
  );
}
