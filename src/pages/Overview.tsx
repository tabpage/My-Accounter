import { useMemo, useState } from "react";
import { ChartColumn, ChartPie, Layers, ListFilter, Plus, Tags, TrendingUp } from "lucide-react";
import { useData } from "@/context/DataContext";
import { type EntryType, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { buildTrend, inRange, PERIOD_OPTIONS, type PeriodKey, periodLabel, periodRange, signedAmount, sliceByCategory, sliceByType } from "@/lib/calc";
import { percent, todayISO } from "@/lib/utils";
import { Button, Card, CardHeader, EmptyState, Field, Input, PageTitle, Segmented, Select } from "@/components/ui";
import { BarChart, DonutChart, Legend, TrendChart } from "@/components/Charts";
import { cn } from "@/utils/cn";

type View = "type" | "category";

export function Overview({ navigate }: { navigate: (to: string) => void }) {
  const { settings, modeEntries, categoryMap, money } = useData();
  const types = MODE_TYPES[settings.mode];
  const [view, setView] = useState<View>("type");
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [custom, setCustom] = useState(() => ({ from: periodRange("this-month").from ?? todayISO(), to: todayISO() }));
  const [catType, setCatType] = useState<EntryType | "all">("expenses");
  const [active, setActive] = useState<string | null>(null);

  const range = periodRange(period, custom);
  const effectiveCatType: EntryType | "all" = catType !== "all" && !types.includes(catType) ? "all" : catType;

  const periodEntries = useMemo(() => modeEntries.filter((e) => inRange(e.date, range.from, range.to)), [modeEntries, range.from, range.to]);
  const scoped = useMemo(
    () => (view === "category" && effectiveCatType !== "all" ? periodEntries.filter((e) => e.type === effectiveCatType) : periodEntries),
    [periodEntries, view, effectiveCatType],
  );
  const slices = useMemo(() => (view === "type" ? sliceByType(scoped, types) : sliceByCategory(scoped, categoryMap)), [view, scoped, types, categoryMap]);
  const trend = useMemo(() => buildTrend(scoped, range), [scoped, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const trendTypes = view === "category" && effectiveCatType !== "all" ? [effectiveCatType] : types;

  const total = slices.reduce((s, d) => s + d.value, 0);
  const net = periodEntries.reduce((s, e) => s + signedAmount(e), 0);
  const top = [...slices].sort((a, b) => b.value - a.value)[0];
  const label = periodLabel(period, range);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTitle eyebrow="Analytics" title="Overview" subtitle="See where your money comes from — and where it goes." />

      {/* Controls */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <div className="space-y-1.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">View with</p>
              <Segmented
                label="View with"
                value={view}
                onChange={(v) => {
                  setView(v);
                  setActive(null);
                }}
                options={[
                  { value: "type", label: "Type", icon: Layers },
                  { value: "category", label: "Category", icon: Tags },
                ]}
              />
            </div>
            {view === "category" && (
              <div className="space-y-1.5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Category type</p>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                  {(["all", ...types] as (EntryType | "all")[]).map((t) => {
                    const on = effectiveCatType === t;
                    const m = t === "all" ? null : TYPE_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setCatType(t);
                          setActive(null);
                        }}
                        className={cn("inline-flex h-[2.6rem] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-all", on ? "shadow-sm" : "border-line text-muted hover:text-ink")}
                        style={on ? (m ? { borderColor: m.color, background: m.soft, color: m.ink } : { borderColor: "var(--c-ink)", color: "var(--c-ink)" }) : undefined}
                      >
                        {m && <span className="size-2 rounded-full" style={{ background: m.color }} />}
                        {m ? m.label : "All types"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className={cn("grid gap-3", period === "custom" ? "sm:grid-cols-3" : "sm:w-60")}>
            <Field label="Period">
              <Select value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}>
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            {period === "custom" && (
              <>
                <Field label="From">
                  <Input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                </Field>
                <Field label="To">
                  <Input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                </Field>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: "Net balance", v: money(net, { sign: true }), color: net >= 0 ? "var(--t-revenue-ink)" : "var(--t-expenses-ink)" },
          { k: view === "category" ? "Total shown" : "Total volume", v: money(total) },
          { k: "Entries", v: String(scoped.length) },
          { k: view === "type" ? "Largest type" : "Top category", v: top && top.value > 0 ? top.label : "—" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-line bg-card px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
            <p className="eyebrow">{s.k}</p>
            <p className="num mt-2 truncate font-serif text-xl font-semibold text-ink sm:text-[1.4rem]" style={s.color ? { color: s.color } : undefined}>
              {s.v}
            </p>
          </div>
        ))}
      </div>

      {scoped.length === 0 ? (
        <Card>
          <EmptyState
            icon={ChartPie}
            title="Nothing to chart yet"
            text={`No entries found for ${label.toLowerCase()}. Try another period or add a new entry.`}
            action={
              <Button icon={Plus} onClick={() => navigate("entry")}>
                Add entry
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pie Chart" subtitle={`Share by ${view} · ${label}`} icon={ChartPie} />
              <div className="grid items-center gap-6 p-5 sm:p-6 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                <DonutChart data={slices} format={money} active={active} onActive={setActive} title={view === "type" ? "All types" : effectiveCatType === "all" ? "All categories" : TYPE_META[effectiveCatType].label} />
                <Legend data={slices.filter((s) => s.value > 0)} format={money} active={active} onActive={setActive} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Histogram" subtitle={`Amount by ${view} · ${label}`} icon={ChartColumn} />
              <div className="p-5 sm:p-6">
                <BarChart data={view === "type" ? slices : slices.filter((s) => s.value > 0).slice(0, 16)} format={money} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Trend" subtitle={`${trend.unit === "day" ? "Daily" : "Monthly"} activity by type · ${label}`} icon={TrendingUp} />
            <div className="p-5 sm:p-6">
              <TrendChart buckets={trend.buckets} types={trendTypes} format={money} unit={trend.unit} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Breakdown" subtitle={`Detailed figures by ${view}`} icon={ListFilter} />
            <div className="overflow-x-auto px-2 pb-3 pt-3 sm:px-3">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[0.68rem] uppercase tracking-[0.14em] text-faint">
                    <th className="px-3 py-2.5 font-semibold">{view === "type" ? "Type" : "Category"}</th>
                    {view === "category" && <th className="px-3 py-2.5 font-semibold">Type</th>}
                    <th className="px-3 py-2.5 text-right font-semibold">Entries</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                    <th className="w-[28%] px-3 py-2.5 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {slices
                    .filter((s) => view === "type" || s.value > 0)
                    .map((s) => {
                      const cat = categoryMap.get(s.key);
                      const pct = percent(s.value, total);
                      return (
                        <tr key={s.key} className="border-b border-line/60 last:border-0">
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-2.5 font-medium text-ink">
                              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                              {s.label}
                            </span>
                          </td>
                          {view === "category" && <td className="px-3 py-3 text-muted">{cat ? (cat.type === "any" ? "Any" : TYPE_META[cat.type].label) : "—"}</td>}
                          <td className="num px-3 py-3 text-right text-muted">{s.count}</td>
                          <td className="num px-3 py-3 text-right font-semibold text-ink">{money(s.value)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                                <div className="bar-grow-x h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                              </div>
                              <span className="num w-12 text-right text-xs text-muted">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
