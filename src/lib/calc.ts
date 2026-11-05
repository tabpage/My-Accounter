import { type Category, type Entry, type EntryType, type Mode, TYPE_META } from "./constants";
import { addDays, parseISODate, startOfWeekISO, toISODate, todayISO } from "./utils";

export type Totals = Record<EntryType, number>;
export const emptyTotals = (): Totals => ({ liabilities: 0, capital: 0, revenue: 0, expenses: 0, drawings: 0 });

export function computeTotals(entries: Entry[]): Totals {
  const t = emptyTotals();
  for (const e of entries) t[e.type] += e.amount;
  return t;
}

export function countByType(entries: Entry[]): Totals {
  const t = emptyTotals();
  for (const e of entries) t[e.type] += 1;
  return t;
}

/** General: Revenue − Expenses. Manual: Liabilities + Capital + Revenue − Expenses − Drawings (= Assets). */
export function balanceOf(t: Totals, mode: Mode): number {
  return mode === "general" ? t.revenue - t.expenses : t.liabilities + t.capital + t.revenue - t.expenses - t.drawings;
}

/** Owner's equity = Capital + Revenue − Expenses − Drawings */
export const equityOf = (t: Totals) => t.capital + t.revenue - t.expenses - t.drawings;

export const signedAmount = (e: Entry) => TYPE_META[e.type].sign * e.amount;

export function sortEntries(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => {
    const ka = a.date + " " + a.time;
    const kb = b.date + " " + b.time;
    if (ka !== kb) return ka < kb ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

/* ───────────── Periods ───────────── */
export type PeriodKey = "this-month" | "last-month" | "last-3-months" | "this-year" | "last-12-months" | "all" | "custom";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "this-year", label: "This year" },
  { value: "last-12-months", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range…" },
];

export interface Range {
  from: string | null;
  to: string | null;
}

export function periodRange(key: PeriodKey, custom?: { from: string; to: string }): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this-month":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case "last-month":
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case "last-3-months":
      return { from: toISODate(new Date(y, m - 2, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case "this-year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last-12-months":
      return { from: toISODate(new Date(y, m - 11, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case "custom":
      return { from: custom?.from || null, to: custom?.to || null };
    default:
      return { from: null, to: null };
  }
}

export function periodLabel(key: PeriodKey, range: Range): string {
  if (key === "all") return "All time";
  if (key === "custom") {
    if (range.from && range.to) return `${range.from} → ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Until ${range.to}`;
    return "All time";
  }
  return PERIOD_OPTIONS.find((p) => p.value === key)?.label ?? "";
}

export const inRange = (d: string, from: string | null, to: string | null) => (!from || d >= from) && (!to || d <= to);

/* History date presets */
export type DatePreset = "all" | "today" | "yesterday" | "this-week" | "this-month" | "last-month" | "this-year" | "date" | "range";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "date", label: "Specific date…" },
  { value: "range", label: "Date range…" },
];

export function presetRange(p: DatePreset, specific: string, range: { from: string; to: string }): Range {
  const today = todayISO();
  switch (p) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "this-week":
      return { from: startOfWeekISO(), to: addDays(startOfWeekISO(), 6) };
    case "this-month":
      return periodRange("this-month");
    case "last-month":
      return periodRange("last-month");
    case "this-year":
      return periodRange("this-year");
    case "date":
      return { from: specific || null, to: specific || null };
    case "range":
      return { from: range.from || null, to: range.to || null };
    default:
      return { from: null, to: null };
  }
}

/* ───────────── Grouping ───────────── */
export interface Slice {
  key: string;
  label: string;
  value: number;
  count: number;
  color: string;
  type?: EntryType;
}

export function sliceByType(entries: Entry[], types: EntryType[]): Slice[] {
  return types.map((t) => {
    let value = 0;
    let count = 0;
    for (const e of entries) if (e.type === t) {
      value += e.amount;
      count++;
    }
    return { key: t, label: TYPE_META[t].label, value, count, color: TYPE_META[t].color, type: t };
  });
}

export function sliceByCategory(entries: Entry[], catMap: Map<string, Category>): Slice[] {
  const map = new Map<string, Slice>();
  for (const e of entries) {
    const cat = catMap.get(e.categoryId);
    const key = cat ? cat.id : "uncategorized";
    let s = map.get(key);
    if (!s) {
      s = { key, label: cat?.name ?? "Uncategorized", value: 0, count: 0, color: cat?.color ?? "#9E978A" };
      map.set(key, s);
    }
    s.value += e.amount;
    s.count++;
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/* ───────────── Trend buckets ───────────── */
export interface TrendBucket {
  key: string;
  label: string;
  sublabel?: string;
  full: string;
  values: Totals;
}

export function buildTrend(entries: Entry[], range: Range): { unit: "day" | "month"; buckets: TrendBucket[] } {
  const dates = entries.map((e) => e.date).sort();
  const today = todayISO();
  const lastEntry = dates[dates.length - 1];
  let start = range.from ?? dates[0] ?? today;
  let end = range.to ?? (lastEntry && lastEntry > today ? lastEntry : today);
  const maxEnd = lastEntry && lastEntry > today ? lastEntry : today;
  if (end > maxEnd && start <= maxEnd) end = maxEnd;
  if (start > end) start = end;

  const days = Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / 86400000) + 1;

  if (days <= 45) {
    const buckets: TrendBucket[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      const dt = parseISODate(d);
      buckets.push({
        key: d,
        label: String(dt.getDate()),
        sublabel: dt.getDate() === 1 || i === 0 ? dt.toLocaleDateString(undefined, { month: "short" }) : undefined,
        full: dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
        values: emptyTotals(),
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const e of entries) {
      const i = idx.get(e.date);
      if (i !== undefined) buckets[i].values[e.type] += e.amount;
    }
    return { unit: "day", buckets };
  }

  const s = parseISODate(start);
  const en = parseISODate(end);
  const buckets: TrendBucket[] = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  let guard = 0;
  while (cur <= en && guard++ < 600) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: cur.toLocaleDateString(undefined, { month: "short" }),
      sublabel: cur.getMonth() === 0 || buckets.length === 0 ? String(cur.getFullYear()) : undefined,
      full: cur.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      values: emptyTotals(),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const e of entries) {
    const i = idx.get(e.date.slice(0, 7));
    if (i !== undefined) buckets[i].values[e.type] += e.amount;
  }
  return { unit: "month", buckets };
}

/** Rounded axis ticks from 0 → max */
export function niceScale(max: number, ticks = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  const step = (r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1) * mag;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}
