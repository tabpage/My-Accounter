import { useMemo, useState } from "react";
import { type EntryType, TYPE_META } from "@/lib/constants";
import { niceScale, type Slice, type TrendBucket } from "@/lib/calc";
import { formatCompact, percent } from "@/lib/utils";
import { cn } from "@/utils/cn";

type Fmt = (n: number) => string;

/* ───────────── Donut / Pie ───────────── */
export function DonutChart({ data, format, title = "Total", active, onActive }: { data: Slice[]; format: Fmt; title?: string; active?: string | null; onActive?: (k: string | null) => void }) {
  const [localActive, setLocalActive] = useState<string | null>(null);
  const current = active !== undefined ? active : localActive;
  const setActive = onActive ?? setLocalActive;

  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  const R = 80;
  const SW = 26;
  const C = 2 * Math.PI * R;
  const gap = items.length > 1 ? 2.2 : 0;
  const sig = items.map((d) => d.key + ":" + d.value.toFixed(2)).join("|");
  const act = items.find((d) => d.key === current) ?? null;

  let acc = 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17.5rem]">
      <svg key={sig} viewBox="0 0 200 200" className="size-full -rotate-90 overflow-visible" role="img" aria-label={`${title} chart`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--c-subtle)" strokeWidth={SW} />
        {items.map((d, i) => {
          const len = (d.value / total) * C;
          const dash = Math.max(len - gap, 0.6);
          const isActive = current === d.key;
          const el = (
            <circle
              key={d.key}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-acc}
              className="donut-seg cursor-pointer outline-none"
              style={{ stroke: d.color, strokeWidth: isActive ? SW + 7 : SW, opacity: current && !isActive ? 0.28 : 1, animationDelay: `${i * 70}ms` }}
              onMouseEnter={() => setActive(d.key)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : d.key)}
              onFocus={() => setActive(d.key)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              aria-label={`${d.label}: ${format(d.value)}`}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
        <span className="eyebrow max-w-full truncate">{act ? act.label : title}</span>
        <span className="num mt-1.5 max-w-full truncate font-serif text-[1.35rem] font-semibold leading-tight text-ink sm:text-2xl">{format(act ? act.value : total)}</span>
        <span className="mt-1 text-xs text-faint">{act ? `${percent(act.value, total).toFixed(1)}% · ${act.count} ${act.count === 1 ? "entry" : "entries"}` : `${items.length} ${items.length === 1 ? "group" : "groups"}`}</span>
      </div>
    </div>
  );
}

export function Legend({ data, format, active, onActive }: { data: Slice[]; format: Fmt; active?: string | null; onActive?: (k: string | null) => void }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="divide-y divide-line">
      {data.map((d) => {
        const pct = percent(d.value, total);
        return (
          <li
            key={d.key}
            className={cn("flex items-center gap-3 rounded-lg px-1 py-2.5 transition-opacity", active && active !== d.key && "opacity-45")}
            onMouseEnter={() => onActive?.(d.key)}
            onMouseLeave={() => onActive?.(null)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{d.label}</span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-subtle">
                <span className="bar-grow-x block h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
              </span>
            </span>
            <span className="num w-12 text-right text-xs text-faint">{pct.toFixed(1)}%</span>
            <span className="num min-w-[5.5rem] text-right text-sm font-semibold text-ink">{format(d.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Histogram (vertical bars) ───────────── */
export function BarChart({ data, format, height = 15 }: { data: Slice[]; format: Fmt; height?: number }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceScale(max);
  const top = ticks[ticks.length - 1] || 1;
  const sig = data.map((d) => d.key + d.value).join("|");

  return (
    <div className="flex gap-2">
      <div className="num relative mt-7 w-11 shrink-0 text-right text-[0.68rem] text-faint" style={{ height: `${height}rem` }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
            {formatCompact(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto pb-1 pt-7">
        <div style={{ minWidth: `${Math.max(data.length * 3.4, 12)}rem` }}>
          <div className="relative" style={{ height: `${height}rem` }}>
            {ticks.map((t) => (
              <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <div key={sig} className="absolute inset-0 flex items-end gap-2 px-1 sm:gap-3">
              {data.map((d, i) => {
                const h = (d.value / top) * 100;
                return (
                  <div
                    key={d.key}
                    className="relative flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setActive(d.key)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => setActive((a) => (a === d.key ? null : d.key))}
                    title={`${d.label}: ${format(d.value)}`}
                  >
                    <div
                      className="bar-grow relative w-full max-w-[3.75rem] rounded-t-lg transition-opacity"
                      style={{
                        height: d.value > 0 ? `max(${h}%, 3px)` : "0%",
                        backgroundColor: d.color,
                        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 70%)",
                        animationDelay: `${i * 60}ms`,
                        opacity: active && active !== d.key ? 0.35 : 1,
                      }}
                    >
                      <span className={cn("num absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.68rem] font-semibold", active === d.key ? "text-ink" : "text-muted")}>
                        {active === d.key ? format(d.value) : formatCompact(d.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex gap-2 px-1 sm:gap-3">
            {data.map((d) => (
              <div key={d.key} className="min-w-0 flex-1 text-center" title={d.label}>
                <span className="mx-auto mb-1 block size-1.5 rounded-full" style={{ background: d.color }} />
                <span className="block truncate text-[0.72rem] font-medium text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Trend (grouped bars over time) ───────────── */
export function TrendChart({ buckets, types, format, unit }: { buckets: TrendBucket[]; types: EntryType[]; format: Fmt; unit: "day" | "month" }) {
  const [active, setActive] = useState<number | null>(null);
  const max = useMemo(() => Math.max(0, ...buckets.flatMap((b) => types.map((t) => b.values[t]))), [buckets, types]);
  const ticks = niceScale(max);
  const top = ticks[ticks.length - 1] || 1;
  const few = buckets.length <= 8;
  const dense = buckets.length > 16;
  const barW = types.length > 3 ? (few ? 0.9 : dense ? 0.42 : 0.6) : types.length > 1 ? (few ? 1.4 : dense ? 0.62 : 0.9) : few ? 2 : dense ? 0.9 : 1.2;
  const bucketW = types.length * barW + (types.length - 1) * 0.12 + 1;
  const sig = buckets.length + ":" + types.join(",") + ":" + max;

  const sum = useMemo(() => {
    const s: Record<string, number> = {};
    types.forEach((t) => (s[t] = buckets.reduce((acc, b) => acc + b.values[t], 0)));
    return s;
  }, [buckets, types]);
  const shown = active !== null ? buckets[active] : null;

  return (
    <div>
      <div className="mb-4 flex min-h-[3.25rem] flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-xl border border-line bg-subtle/60 px-4 py-2.5">
        <div className="min-w-0">
          <p className="eyebrow">{shown ? shown.full : `Total · ${buckets.length} ${unit === "day" ? "days" : "months"}`}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {types.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-sm">
              <span className="size-2 rounded-full" style={{ background: TYPE_META[t].color }} />
              <span className="text-muted">{TYPE_META[t].label}</span>
              <span className="num font-semibold text-ink">{format(shown ? shown.values[t] : sum[t])}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="num relative w-11 shrink-0 text-right text-[0.68rem] text-faint" style={{ height: "13rem" }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {formatCompact(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pb-2">
          <div style={{ minWidth: `${buckets.length * bucketW}rem` }}>
            <div className="relative" style={{ height: "13rem" }}>
              {ticks.map((t) => (
                <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ bottom: `${(t / top) * 100}%` }} />
              ))}
              <div key={sig} className="absolute inset-0 flex items-end">
                {buckets.map((b, i) => (
                  <div
                    key={b.key}
                    tabIndex={0}
                    role="button"
                    aria-label={b.full}
                    className={cn("relative flex h-full flex-1 cursor-pointer items-end justify-center gap-[0.12rem] rounded-md outline-none transition-colors", active === i && "bg-accent-soft")}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive((a) => (a === i ? null : i))}
                  >
                    {types.map((t) => {
                      const v = b.values[t];
                      return (
                        <div
                          key={t}
                          className="bar-grow rounded-t-[3px]"
                          style={{ width: `${barW}rem`, height: v > 0 ? `max(${(v / top) * 100}%, 2px)` : "0%", background: TYPE_META[t].color, animationDelay: `${Math.min(i * 18, 500)}ms` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex">
              {buckets.map((b, i) => (
                <div key={b.key} className={cn("flex-1 text-center leading-tight", active === i ? "text-ink" : "text-faint")}>
                  <span className="block text-[0.66rem] font-medium">{b.label}</span>
                  <span className="block h-3 text-[0.6rem] text-faint">{b.sublabel ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Composition bar ───────────── */
export function CompositionBar({ data, className }: { data: Slice[]; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-subtle", className)}>
      {total > 0 &&
        data
          .filter((d) => d.value > 0)
          .map((d, i) => (
            <div
              key={d.key}
              className="bar-grow-x h-full first:rounded-l-full last:rounded-r-full"
              title={`${d.label}: ${percent(d.value, total).toFixed(1)}%`}
              style={{ width: `${percent(d.value, total)}%`, background: d.color, animationDelay: `${i * 80}ms`, marginRight: 2 }}
            />
          ))}
    </div>
  );
}
