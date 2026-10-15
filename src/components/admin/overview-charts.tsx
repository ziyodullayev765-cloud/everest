"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Validated (scripts/validate_palette.js, dark surface): passes CVD + contrast checks. */
const PUBLISHED = "#0f9f74";
const DRAFT = "#b07a12";
const SURFACE = "#0b0c0e";
const AXIS = { fill: "#8b8b94", fontSize: 12 };

const tooltipStyle = {
  contentStyle: {
    background: "#111214",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    fontSize: 12,
    color: "#f5f5f4",
  },
  labelStyle: { color: "#f5f5f4", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#d4d4d8", padding: 0 },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

export interface ContentRow {
  type: string;
  published: number;
  draft: number;
}

export function ContentChart({ data }: { data: ContentRow[] }) {
  return (
    <figure>
      <div className="h-72" role="img" aria-label="Published and draft items per content type">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="type" tick={AXIS} axisLine={false} tickLine={false} width={96} />
            <Tooltip {...tooltipStyle} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#a1a1aa", paddingTop: 8 }} />
            <Bar
              dataKey="published"
              name="Published"
              stackId="s"
              fill={PUBLISHED}
              stroke={SURFACE}
              strokeWidth={2}
              radius={[0, 0, 0, 0]}
            />
            <Bar dataKey="draft" name="Draft" stackId="s" fill={DRAFT} stroke={SURFACE} strokeWidth={2} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="text-subtle hover:text-fg cursor-pointer text-xs">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-subtle">
            <tr>
              <th className="py-1 font-medium">Type</th>
              <th className="py-1 font-medium">Published</th>
              <th className="py-1 font-medium">Draft</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.type} className="border-line border-t">
                <td className="py-1">{r.type}</td>
                <td className="py-1 tabular-nums">{r.published}</td>
                <td className="py-1 tabular-nums">{r.draft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function MessagesChart({ data }: { data: { day: string; label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure>
      <div className="h-56" role="img" aria-label={`Contact messages per day over the last 30 days, ${total} in total`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={6} />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => [String(v), "Messages"]} />
            <Bar dataKey="count" name="Messages" fill={PUBLISHED} radius={[4, 4, 0, 0]} minPointSize={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
