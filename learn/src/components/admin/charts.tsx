"use client";
import { formatDayShort as shortDate } from "@/lib/dates";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


export function ActivityChart({ data }: { data: { day: string; n: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label="So‘nggi 14 kundagi faollik">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="day" tickFormatter={shortDate} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] shadow-pop">
                  <div className="font-bold">{shortDate(String(label))}</div>
                  <div className="text-text-2">Faollik: <b className="tabular">{payload[0].value}</b></div>
                </div>
              ) : null
            }
          />
          <Area dataKey="n" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g1)" type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
