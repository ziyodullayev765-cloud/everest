"use client";
import { formatDayShort as shortDate, formatWeekday as weekday } from "@/lib/dates";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

type Day = { day: string; tasks: number; quizzes: number; words?: number; avg: number | null };


function TooltipBox({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number | null; color: string }[]; label?: string; fmt: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] shadow-pop">
      <div className="mb-1 font-bold text-text">{fmt(label ?? "")}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-text-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="font-bold text-text tabular">{p.value == null ? "—" : p.name.includes("%") ? `${Math.round(p.value)}%` : p.value}</b>
        </div>
      ))}
    </div>
  );
}

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

export function WeeklyActivityChart({ data: raw }: { data: Day[] }) {
  const data = raw.map((d) => ({ ...d, vocab: Math.floor((d.words ?? 0) / 10) }));
  const today = data[data.length - 1]?.day;
  return (
    <div className="h-56 w-full" role="img" aria-label="So‘nggi 7 kunlik faollik: bajarilgan vazifalar, quizlar va o‘rtacha ball">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="day" tickFormatter={weekday} {...axis} />
          <YAxis yAxisId="n" allowDecimals={false} {...axis} width={40} />
          <YAxis yAxisId="p" orientation="right" domain={[0, 100]} hide />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<TooltipBox fmt={(l) => `${weekday(l)}, ${shortDate(l)}`} />} />
          <Bar yAxisId="n" dataKey="tasks" name="Vazifalar" stackId="a" fill="var(--chart-1)" maxBarSize={28} radius={[0, 0, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.day} fillOpacity={d.day === today ? 1 : 0.8} />
            ))}
          </Bar>
          <Bar yAxisId="n" dataKey="quizzes" name="Quizlar" stackId="a" fill="var(--chart-2)" maxBarSize={28} />
          <Bar yAxisId="n" dataKey="vocab" name="Lug‘at" stackId="a" fill="var(--violet)" maxBarSize={28} radius={[6, 6, 0, 0]} />
          <Line yAxisId="p" dataKey="avg" name="O‘rtacha %" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }} connectNulls type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLine({ data }: { data: { week: string; average: number }[] }) {
  return (
    <div className="h-52 w-full" role="img" aria-label="Haftalar bo‘yicha o‘rtacha baho">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="week" tickFormatter={shortDate} {...axis} />
          <YAxis domain={[0, 100]} {...axis} width={40} />
          <Tooltip content={<TooltipBox fmt={(l) => `${shortDate(l)} haftasi`} />} />
          <Line dataKey="average" name="O‘rtacha %" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3.5, fill: "var(--chart-1)", strokeWidth: 0 }} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyBars({ data: raw }: { data: Day[] }) {
  const data = raw.map((d) => ({ ...d, vocab: Math.floor((d.words ?? 0) / 10) }));
  return (
    <div className="h-44 w-full" role="img" aria-label="Kunlik faollik">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="day" tickFormatter={shortDate} {...axis} minTickGap={18} />
          <YAxis allowDecimals={false} {...axis} width={40} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<TooltipBox fmt={shortDate} />} />
          <Bar dataKey="tasks" name="Vazifalar" stackId="a" fill="var(--chart-1)" maxBarSize={18} />
          <Bar dataKey="quizzes" name="Quizlar" stackId="a" fill="var(--chart-2)" maxBarSize={18} />
          <Bar dataKey="vocab" name="Lug‘at (10 takrorlash)" stackId="a" fill="var(--violet)" maxBarSize={18} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
