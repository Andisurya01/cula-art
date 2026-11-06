"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatWib } from "@/lib/date";
import { axisTickFormatter, formatCount } from "@/features/metrics/format";
import { AXIS_FONT_SIZE, CHART_TOKENS, LABEL_FONT_SIZE } from "./chart-theme";
import { ChartDataTable } from "./chart-data-table";
import { ChartTooltipCard } from "./chart-tooltip";

export type TimePoint = {
  /** Waktu dalam milidetik (tanggal WIB 00.00). */
  t: number;
  value: number;
};

/** Sumbu waktu: titik tidak harus berjarak sama, jadi tick dibagi rata di dalam rentang. */
function timeTicks(from: number, to: number, count: number): number[] {
  if (from === to) return [from];
  return Array.from({ length: count }, (_, i) => Math.round(from + ((to - from) * i) / (count - 1)));
}

/**
 * Grafik garis satu seri terhadap waktu. Selalu satu platform per grafik.
 * `domain` = rentang filter; tanpa itu mengikuti data. `compact` = grafik mini tanpa sumbu Y, label akhir, dan tabel terlihat.
 */
export function TimeLineChart({
  data,
  color,
  valueLabel,
  ariaLabel,
  domain,
  height = 220,
  compact = false,
  formatValue = formatCount,
  showTable = true,
}: {
  data: readonly TimePoint[];
  color: string;
  valueLabel: string;
  ariaLabel: string;
  domain?: readonly [number, number];
  height?: number;
  compact?: boolean;
  formatValue?: (value: number) => string;
  /** False jika halaman sudah punya daftar sendiri untuk angka yang sama. */
  showTable?: boolean;
}) {
  const from = domain?.[0] ?? data[0]?.t ?? 0;
  const to = domain?.[1] ?? data[data.length - 1]?.t ?? 0;
  const lastIndex = data.length - 1;
  const formatTick = axisTickFormatter(data.map((point) => point.value));

  return (
    <figure className="min-w-0">
      {/* Tinggi tetap sudah termasuk pita sumbu X, supaya kartu tidak menggulir sendiri. */}
      <div style={{ height }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={[...data]}
            margin={compact ? { top: 8, right: 8, bottom: 0, left: 8 } : { top: 20, right: 12, bottom: 0, left: 0 }}
          >
            {!compact && <CartesianGrid vertical={false} stroke={CHART_TOKENS.grid} />}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[from, to]}
              ticks={timeTicks(from, to, compact ? 2 : 4)}
              tickFormatter={(t: number) => formatWib(new Date(t), "d MMM")}
              tick={{ fontSize: AXIS_FONT_SIZE, fill: CHART_TOKENS.axisText }}
              stroke={CHART_TOKENS.grid}
              tickLine={false}
              interval={0}
              height={24}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              hide={compact}
              width={52}
              domain={["auto", "auto"]}
              allowDecimals={false}
              tickFormatter={(value: number) => formatTick(value)}
              tick={{ fontSize: AXIS_FONT_SIZE, fill: CHART_TOKENS.axisText }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: CHART_TOKENS.grid, strokeWidth: 1 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as TimePoint | undefined;
                if (!active || !point) return null;
                return (
                  <ChartTooltipCard
                    title={formatWib(new Date(point.t), "d MMMM yyyy")}
                    value={formatValue(point.value)}
                    caption={valueLabel}
                    color={color}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              isAnimationActive={false}
              activeDot={{ r: 4, fill: color, stroke: CHART_TOKENS.surface, strokeWidth: 2 }}
              // Titik akhir saja (r 4 + cincin 2 px); nilai di ujung garis, bukan di setiap titik.
              dot={(props) => {
                const { cx, cy, index, payload } = props as {
                  cx?: number;
                  cy?: number;
                  index: number;
                  payload: TimePoint;
                };
                if (index !== lastIndex || cx === undefined || cy === undefined) {
                  return <g key={`dot-${index}`} />;
                }
                return (
                  <g key={`dot-${index}`}>
                    <circle cx={cx} cy={cy} r={4} fill={color} stroke={CHART_TOKENS.surface} strokeWidth={2} />
                    {!compact && (
                      <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="end"
                        fontSize={LABEL_FONT_SIZE}
                        fontWeight={600}
                        fill={CHART_TOKENS.text}
                      >
                        {formatTick(payload.value)}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {(showTable || compact) && (
        <ChartDataTable
          caption={ariaLabel}
          columns={["Tanggal", valueLabel]}
          rows={data.map((point) => [formatWib(new Date(point.t), "d MMM yyyy"), formatValue(point.value)])}
          visuallyHidden={compact}
        />
      )}
    </figure>
  );
}
