"use client";

import {
  Bar,
  BarChart,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { formatScore } from "@/features/metrics/format";
import {
  AXIS_FONT_SIZE,
  BAR_ROW_HEIGHT,
  BAR_THICKNESS,
  CHART_TOKENS,
  DIMMED_OPACITY,
  LABEL_FONT_SIZE,
} from "./chart-theme";
import { ChartDataTable } from "./chart-data-table";
import { ChartTooltipCard } from "./chart-tooltip";

export type GroupBarRow = {
  key: string;
  label: string;
  value: number;
  postCount: number;
  /** False → batang redup + label "data belum cukup". */
  enoughData: boolean;
};

const NOT_ENOUGH = "data belum cukup";
const TICK_WIDTH = 136;
const MAX_LABEL_CHARS = 21;
const TIP_LABEL_WIDTH = 48;

function truncate(text: string): string {
  return text.length > MAX_LABEL_CHARS ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…` : text;
}

function subLabel(row: GroupBarRow): string {
  return row.enoughData ? `${row.postCount} post` : `${row.postCount} post · ${NOT_ENOUGH}`;
}

/**
 * Batang mendatar median per grup, satu warna seri (warna platform). Label nama di kiri supaya muat
 * di 375 px, nilai di ujung batang. Grup < 3 post redup dan berlabel "data belum cukup".
 */
export function GroupBarChart({
  rows,
  color,
  valueLabel = "Median skor",
  ariaLabel,
  formatValue = formatScore,
}: {
  rows: readonly GroupBarRow[];
  color: string;
  valueLabel?: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
}) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return (
    <figure className="min-w-0">
      <div style={{ height: rows.length * BAR_ROW_HEIGHT + 8 }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={[...rows]}
            margin={{ top: 4, right: TIP_LABEL_WIDTH, bottom: 4, left: 0 }}
            barCategoryGap={0}
          >
            <XAxis type="number" hide domain={[0, (max: number) => (max > 0 ? max : 1)]} />
            <YAxis
              type="category"
              dataKey="key"
              width={TICK_WIDTH}
              interval={0}
              tickLine={false}
              stroke={CHART_TOKENS.grid}
              tick={(props) => {
                const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
                const row = byKey.get(payload.value);
                if (!row) return <g />;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <title>{row.label}</title>
                    <text
                      x={-8}
                      y={-2}
                      textAnchor="end"
                      fontSize={LABEL_FONT_SIZE}
                      fill={row.enoughData ? CHART_TOKENS.text : CHART_TOKENS.axisText}
                    >
                      {truncate(row.label)}
                    </text>
                    <text x={-8} y={12} textAnchor="end" fontSize={AXIS_FONT_SIZE - 1} fill={CHART_TOKENS.axisText}>
                      {subLabel(row)}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: CHART_TOKENS.hover, fillOpacity: 0.6 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as GroupBarRow | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltipCard
                    title={row.label}
                    value={formatValue(row.value)}
                    caption={valueLabel}
                    color={color}
                    note={subLabel(row)}
                  />
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={color}
              barSize={BAR_THICKNESS}
              isAnimationActive={false}
              // Ujung data membulat 4 px, sisi baseline persegi.
              shape={(props: BarShapeProps) => (
                <Rectangle
                  {...props}
                  radius={[0, 4, 4, 0]}
                  fillOpacity={(props.payload as GroupBarRow).enoughData ? 1 : DIMMED_OPACITY}
                />
              )}
            >
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) => formatValue(Number(value))}
                fontSize={LABEL_FONT_SIZE}
                fill={CHART_TOKENS.text}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption={ariaLabel}
        columns={["Grup", valueLabel, "Post"]}
        rows={rows.map((row) => [
          row.enoughData ? row.label : `${row.label} (${NOT_ENOUGH})`,
          formatValue(row.value),
          String(row.postCount),
        ])}
      />
    </figure>
  );
}
