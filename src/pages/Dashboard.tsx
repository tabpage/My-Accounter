import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Plus, Scale, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { type Entry, type EntryType, MODE_META, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { balanceOf, computeTotals, countByType, equityOf, inRange, periodRange, signedAmount, sliceByType, type Totals } from "@/lib/calc";
import { formatDate, percent, todayISO } from "@/lib/utils";
import { Button, Card, CardHeader, EmptyState, Guilloche, PageTitle, TypeIcon } from "@/components/ui";
import { CompositionBar } from "@/components/Charts";
import { EntryRow } from "@/components/EntryList";
import { EntryEditModal } from "@/components/EntryForm";
import { cn } from "@/utils/cn";

export function Dashboard({ navigate }: { navigate: (to: string) => void }) {
  const { user } = useAuth();
  const { settings, modeEntries, money } = useData();
  const [editing, setEditing] = useState<Entry | null>(null);
  const mode = settings.mode;
  const types = MODE_TYPES[mode];

  const stats = useMemo(() => {
    const month = periodRange("this-month");
    const last = periodRange("last-month");
    const monthEntries = modeEntries.filter((e) => inRange(e.date, month.from, month.to));
    const lastEntries = modeEntries.filter((e) => inRange(e.date, last.from, last.to));
    return {
      totals: computeTotals(modeEntries),
      counts: countByType(modeEntries),
      month: computeTotals(monthEntries),
      lastMonth: computeTotals(lastEntries),
      monthCount: monthEntries.length,
      monthNet: monthEntries.reduce((s, e) => s + signedAmount(e), 0),
    };
  }, [modeEntries]);

  const balance = balanceOf(stats.totals, mode);
  const hour = new Date().getHours();
  const greeting = hour < 5 || hour >= 18 ? "Good evening" : hour < 12 ? "Good morning" : "Good afternoon";
  const firstName = (user?.displayName || user?.email?.split("@")[0] || "there").split(" ")[0];
  const slices = sliceByType(modeEntries, types);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTitle eyebrow={formatDate(todayISO(), "long")} title={`${greeting}, ${firstName}`} subtitle={`${MODE_META[mode].label} · ${MODE_META[mode].formula}`} />

      {/* ── Hero balance ── */}
      <Card className="relative overflow-hidden">
        <Guilloche className="pointer-events-none absolute -right-28 -top-28 size-[30rem] text-ink opacity-[0.07] sm:-right-16" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:p-10">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Wallet className="size-3.5" /> Total Balance {mode === "manual" && <span className="text-faint">· Assets</span>}
            </p>
            <p className="num mt-4 break-words font-serif text-[2.6rem] font-semibold leading-none tracking-tight sm:text-6xl xl:text-7xl" style={{ color: balance < 0 ? "var(--t-expenses-ink)" : "var(--c-ink)" }}>
              {money(balance)}
            </p>
            <p className="mt-4 font-serif text-[0.95rem] italic text-muted">{mode === "general" ? "Revenue − Expenses" : "Liabilities + Capital + Revenue − Expenses − Drawings"}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: stats.monthNet >= 0 ? "var(--t-revenue-soft)" : "var(--t-expenses-soft)", color: stats.monthNet >= 0 ? "var(--t-revenue-ink)" : "var(--t-expenses-ink)" }}
              >
                {stats.monthNet >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                <span className="num">{money(stats.monthNet, { sign: true })}</span> this month
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted">
                <BookOpen className="size-3.5" /> {modeEntries.length} {modeEntries.length === 1 ? "entry" : "entries"} recorded
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-4 lg:border-l lg:border-line lg:pl-8">
            <p className="eyebrow">Composition</p>
            <CompositionBar data={slices} />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {slices.map((s) => (
                <li key={s.key} className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-muted">{s.label}</span>
                  <span className="num ml-auto text-xs font-semibold text-ink">{percent(s.value, slices.reduce((a, b) => a + b.value, 0)).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => navigate(`entry?type=${t}`)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all hover:-translate-y-px"
                  style={{ borderColor: TYPE_META[t].soft, background: TYPE_META[t].soft, color: TYPE_META[t].ink }}
                >
                  <Plus className="size-3.5" strokeWidth={2.4} /> {TYPE_META[t].singular}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Type cards ── */}
      <div className={cn("stagger grid gap-4", mode === "general" ? "sm:grid-cols-2" : "grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5")}>
        {types.map((t) => (
          <StatCard key={t} type={t} amount={stats.totals[t]} count={stats.counts[t]} month={stats.month[t]} prev={stats.lastMonth[t]} money={money} onClick={() => navigate(`history?type=${t}`)} />
        ))}
      </div>

      {mode === "manual" && <EquationCard totals={stats.totals} money={money} />}

      {/* ── Recent + month ── */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Recent entries"
            subtitle="Your latest ledger activity"
            icon={BookOpen}
            action={
              modeEntries.length > 0 && (
                <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate("history")}>
                  View all
                </Button>
              )
            }
          />
          <div className="px-2.5 pb-3 pt-3 sm:px-3">
            {modeEntries.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Your ledger awaits"
                text="Record your first entry to see your balance, charts and insights come to life."
                action={
                  <Button icon={Plus} onClick={() => navigate("entry")}>
                    Add first entry
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-line/70">
                {modeEntries.slice(0, 7).map((e) => (
                  <EntryRow key={e.id} entry={e} showDate onClick={() => setEditing(e)} />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="This month" subtitle={new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })} icon={CalendarDays} />
          <div className="space-y-5 p-5 sm:p-6">
            {(() => {
              const max = Math.max(1, ...types.map((t) => stats.month[t]));
              return types.map((t) => (
                <div key={t}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="size-2 rounded-full" style={{ background: TYPE_META[t].color }} />
                      {TYPE_META[t].label}
                    </span>
                    <span className="num font-semibold text-ink">{money(stats.month[t])}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-subtle">
                    <div className="bar-grow-x h-full rounded-full" style={{ width: `${(stats.month[t] / max) * 100}%`, background: TYPE_META[t].color }} />
                  </div>
                </div>
              ));
            })()}
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-5">
              <div className="rounded-xl bg-subtle p-3.5">
                <p className="eyebrow">Net change</p>
                <p className="num mt-1.5 font-serif text-xl font-semibold" style={{ color: stats.monthNet >= 0 ? "var(--t-revenue-ink)" : "var(--t-expenses-ink)" }}>
                  {money(stats.monthNet, { sign: true })}
                </p>
              </div>
              <div className="rounded-xl bg-subtle p-3.5">
                <p className="eyebrow">{stats.month.revenue > 0 ? "Savings rate" : "Entries"}</p>
                <p className="num mt-1.5 font-serif text-xl font-semibold text-ink">
                  {stats.month.revenue > 0 ? `${(((stats.month.revenue - stats.month.expenses) / stats.month.revenue) * 100).toFixed(0)}%` : stats.monthCount}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <EntryEditModal entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function StatCard({ type, amount, count, month, prev, money, onClick }: { type: EntryType; amount: number; count: number; month: number; prev: number; money: (n: number) => string; onClick: () => void }) {
  const m = TYPE_META[type];
  const delta = prev > 0 ? ((month - prev) / prev) * 100 : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 text-left shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong sm:p-6"
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: m.color }} />
      <span className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100" style={{ background: m.soft }} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <TypeIcon type={type} size="sm" />
          <span className="eyebrow">{m.label}</span>
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[0.68rem] text-faint">{count}</span>
      </div>
      <p className="num relative mt-5 truncate font-serif text-[1.7rem] font-semibold leading-tight tracking-tight" style={{ color: m.ink }}>
        {money(amount)}
      </p>
      <div className="relative mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          This month · <span className="num font-semibold text-ink">{money(month)}</span>
        </span>
        {delta !== null && (
          <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold" title="Compared with last month">
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
    </button>
  );
}

function EquationCard({ totals, money }: { totals: Totals; money: (n: number, o?: { sign?: boolean }) => string }) {
  const equity = equityOf(totals);
  const assets = balanceOf(totals, "manual");
  const chip = (t: EntryType) => (
    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: TYPE_META[t].soft, color: TYPE_META[t].ink }}>
      <span className="text-xs font-medium opacity-80">{TYPE_META[t].label}</span>
      <span className="num text-sm font-semibold">{money(totals[t])}</span>
    </span>
  );
  const op = (s: string) => <span className="font-serif text-xl text-faint">{s}</span>;

  return (
    <Card>
      <CardHeader title="The Accounting Equation" subtitle="Assets = Liabilities + Owner's Equity" icon={Scale} />
      <div className="p-5 sm:p-6">
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <div className="rounded-2xl bg-accent p-5 text-on-accent">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] opacity-75">Assets</p>
            <p className="num mt-2 truncate font-serif text-2xl font-semibold">{money(assets)}</p>
          </div>
          <div className="text-center">{op("=")}</div>
          <div className="rounded-2xl border p-5" style={{ borderColor: TYPE_META.liabilities.soft, background: TYPE_META.liabilities.soft }}>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: TYPE_META.liabilities.ink }}>
              Liabilities
            </p>
            <p className="num mt-2 truncate font-serif text-2xl font-semibold" style={{ color: TYPE_META.liabilities.ink }}>
              {money(totals.liabilities)}
            </p>
          </div>
          <div className="text-center">{op("+")}</div>
          <div className="rounded-2xl border border-line bg-subtle p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Owner&apos;s Equity</p>
            <p className="num mt-2 truncate font-serif text-2xl font-semibold text-ink">{money(equity)}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="eyebrow">Owner&apos;s Equity = Capital + Revenue − Expenses − Drawings</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chip("capital")}
            {op("+")}
            {chip("revenue")}
            {op("−")}
            {chip("expenses")}
            {op("−")}
            {chip("drawings")}
            {op("=")}
            <span className="num font-serif text-lg font-semibold text-ink">{money(equity)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
