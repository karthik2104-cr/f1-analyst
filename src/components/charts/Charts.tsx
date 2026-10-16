"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatAvg, formatPoints, formatSeconds } from "@/lib/f1/format";
import type { ChartSeries } from "@/lib/f1/models";

const GRID = "#293241";
const TICK = "#96A0AF";
const AXIS = { fill: TICK, fontSize: 12 };
const LEGEND = { color: TICK, fontSize: 12 };

type TipPayload = { name?: string; value?: number | string | null; color?: string; payload?: { label?: string } };

function Tip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string | number;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const race = payload[0]?.payload?.label;
  const format = formatValue ?? formatPoints;
  return (
    <div className="tip">
      <p className="tip-title">{race || label || "Round"}</p>
      {payload.map((item) => (
        <p key={`${item.name}-${String(item.value)}`}>
          <span className="tip-swatch" style={{ background: item.color || "#F4F6FA" }} />
          <span>{item.name}</span>
          <strong>
            {typeof item.value === "number" ? format(item.value) : item.value == null || item.value === "" ? "—" : item.value}
          </strong>
        </p>
      ))}
    </div>
  );
}

function alignSeries(series: ChartSeries[]): Record<string, string | number | null>[] {
  const byRound = new Map<number, Record<string, string | number | null>>();
  for (const item of series) {
    for (const point of item.points) {
      const row = byRound.get(point.round) ?? { round: point.round, label: point.label };
      row[item.id] = point.value;
      byRound.set(point.round, row);
    }
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

export function PointsChart({ series, ariaLabel, height }: { series: ChartSeries[]; ariaLabel: string; height?: "hero" | "standard" }) {
  if (!series.length || series.every((item) => item.points.length === 0)) {
    return <p className="empty note">No session points are available for this chart.</p>;
  }
  const data = alignSeries(series);
  return (
    <div className={height === "hero" ? "chart-frame chart-hero" : "chart-frame"} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="round" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis domain={[0, "auto"]} tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<Tip />} />
          <Legend wrapperStyle={LEGEND} />
          {series.map((item) => (
            <Line key={item.id} type="monotone" dataKey={item.id} name={item.name} stroke={item.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PositionChart({
  rows,
  series,
  ariaLabel,
}: {
  rows: Record<string, string | number | null>[];
  series: { key: string; name: string; color: string }[];
  ariaLabel: string;
}) {
  const hasValue = rows.some((row) => series.some((item) => typeof row[item.key] === "number"));
  if (!rows.length || !hasValue) return <p className="note">No positions are available for this chart.</p>;
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="x" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis reversed allowDecimals={false} domain={[1, "dataMax"]} tick={AXIS} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<Tip formatValue={(value) => (Number.isInteger(value) ? String(value) : value.toFixed(2))} />} />
          <Legend wrapperStyle={LEGEND} />
          {series.map((item) => (
            <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarSet({
  rows,
  label,
  ariaLabel,
  orientation = "vertical",
  color = "#E10600",
}: {
  rows: { label: string; value: number }[];
  label: string;
  ariaLabel: string;
  orientation?: "vertical" | "horizontal";
  color?: string;
}) {
  if (!rows.length) return <p className="note">No values are available for this chart.</p>;
  const horizontal = orientation === "horizontal";
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 8 : 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} /> : <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />}
          {horizontal ? <YAxis type="category" dataKey="label" width={108} tick={AXIS} axisLine={false} tickLine={false} /> : <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={32} />}
          <Tooltip content={<Tip />} />
          <Bar dataKey="value" name={label} fill={color} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({
  rows,
  series,
  ariaLabel,
}: {
  rows: Record<string, string | number | null>[];
  series: { key: string; name: string; color: string }[];
  ariaLabel: string;
}) {
  const hasValue = rows.some((row) => series.some((item) => typeof row[item.key] === "number"));
  if (!rows.length || !hasValue) return <p className="note">No comparison values are available for this chart.</p>;
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<Tip formatValue={(value) => formatAvg(value)} />} />
          <Legend wrapperStyle={LEGEND} />
          {series.map((item) => (
            <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricBars({
  label,
  definition,
  lowerBetter = false,
  rows,
}: {
  label: string;
  definition: string;
  lowerBetter?: boolean;
  rows: { name: string; color: string; value: number | null; text: string }[];
}) {
  const present = rows.flatMap((row) => (row.value == null ? [] : [row.value]));
  const best = present.length < 2 ? null : lowerBetter ? Math.min(...present) : Math.max(...present);
  const scale = present.length ? Math.max(...present.map((value) => Math.abs(value))) : 0;
  const uniqueBest = best != null && present.filter((value) => value === best).length === 1;
  return (
    <div className="metric-block">
      <div className="metric-label">
        <span>{label}</span>
        <span className="note" title={definition}>{lowerBetter ? "Lower is better" : "Higher is better"}</span>
      </div>
      {rows.map((row) => {
        const width = row.value == null || scale === 0 ? 0 : Math.max(4, (Math.abs(row.value) / scale) * 100);
        const marked = uniqueBest && row.value === best;
        return (
          <div key={row.name} className="metric-row">
            <span className="metric-name"><span className="tip-swatch" style={{ background: row.color }} />{row.name}</span>
            <span className="metric-track" aria-hidden="true">
              {row.value == null ? null : <span className="metric-fill" style={{ width: `${width}%`, background: row.color }} />}
            </span>
            <span className="metric-value">
              {row.text}
              {marked ? <span className="best-mark"> Best</span> : null}
              {row.value == null ? <span className="sr-only"> missing</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LapChart({ rows, series, ariaLabel }: { rows: Record<string, string | number | null>[]; series: { key: string; name: string; color: string }[]; ariaLabel: string }) {
  const hasValue = rows.some((row) => series.some((item) => typeof row[item.key] === "number"));
  if (!hasValue) return <p className="note">No lap times are available for this selection.</p>;
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="lap" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => formatSeconds(Number(value))} tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={64} domain={["auto", "auto"]} />
          <Tooltip formatter={(value) => formatSeconds(Number(value))} />
          <Legend wrapperStyle={LEGEND} />
          {series.map((item) => (
            <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={1.75} dot={false} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PitScatter({ rows, ariaLabel }: { rows: { driver: string; lap: number; duration: number; color: string }[]; ariaLabel: string }) {
  if (!rows.length) return <p className="note">No pit durations are available.</p>;
  const drivers = [...new Set(rows.map((row) => row.driver))];
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis dataKey="lap" name="Lap" type="number" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis dataKey="duration" name="Seconds" tick={AXIS} axisLine={false} tickLine={false} width={42} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend wrapperStyle={LEGEND} />
          {drivers.map((driver) => {
            const sample = rows.find((row) => row.driver === driver);
            return <Scatter key={driver} name={driver} data={rows.filter((row) => row.driver === driver)} fill={sample?.color ?? "#E10600"} isAnimationActive={false} />;
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GapChart({ rows, ariaLabel }: { rows: { season: number; gap: number; leader: string }[]; ariaLabel: string }) {
  if (!rows.length) return <p className="note">No completed seasons in this window have a points gap.</p>;
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="season" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<Tip />} />
          <Bar dataKey="gap" name="Points gap" fill="#F5B942" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
