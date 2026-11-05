import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, Download, Info, Plus, Search, SearchX, Tag, X } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { type Entry, type EntryType, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { computeTotals, DATE_PRESETS, type DatePreset, inRange, presetRange, signedAmount } from "@/lib/calc";
import { historyToCSV } from "@/lib/io";
import { downloadFile, formatDate, todayISO } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, PageTitle, Select } from "@/components/ui";
import { EntryRow, GroupedEntries } from "@/components/EntryList";
import { EntryEditModal } from "@/components/EntryForm";
import { cn } from "@/utils/cn";

type SortKey = "newest" | "oldest" | "highest" | "lowest";
const PAGE = 50;

export function History({ query, navigate }: { query: URLSearchParams; navigate: (to: string) => void }) {
  const { settings, entries, modeEntries, categories, categoryMap, money } = useData();
  const { toast } = useToast();
  const types = MODE_TYPES[settings.mode];
  const qType = query.get("type") as EntryType | null;

  const [search, setSearch] = useState("");
  const [type, setType] = useState<EntryType | "all">(qType && types.includes(qType) ? qType : "all");
  const [categoryId, setCategoryId] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [specific, setSpecific] = useState(todayISO());
  const [range, setRange] = useState({ from: "", to: "" });
  const [sort, setSort] = useState<SortKey>("newest");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Entry | null>(null);

  useEffect(() => {
    if (qType && types.includes(qType)) setType(qType);
  }, [qType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setLimit(PAGE), [search, type, categoryId, datePreset, specific, range, sort]);

  const dr = presetRange(datePreset, specific, range);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = modeEntries.filter((e) => {
      if (type !== "all" && e.type !== type) return false;
      if (categoryId === "none") {
        if (categoryMap.has(e.categoryId)) return false;
      } else if (categoryId !== "all" && e.categoryId !== categoryId) return false;
      if (!inRange(e.date, dr.from, dr.to)) return false;
      if (q) {
        const cat = categoryMap.get(e.categoryId)?.name.toLowerCase() ?? "";
        if (!e.description.toLowerCase().includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
    if (sort === "oldest") list = [...list].reverse();
    else if (sort === "highest") list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sort === "lowest") list = [...list].sort((a, b) => a.amount - b.amount);
    return list;
  }, [modeEntries, type, categoryId, dr.from, dr.to, search, sort, categoryMap]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const net = useMemo(() => filtered.reduce((s, e) => s + signedAmount(e), 0), [filtered]);
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: modeEntries.length };
    for (const e of modeEntries) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [modeEntries]);
  const catOptions = categories.filter((c) => type === "all" || c.type === type || c.type === "any");
  const hidden = entries.length - modeEntries.length;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) chips.push({ key: "q", label: `“${search.trim()}”`, clear: () => setSearch("") });
  if (type !== "all") chips.push({ key: "t", label: TYPE_META[type].label, clear: () => setType("all") });
  if (categoryId !== "all") chips.push({ key: "c", label: categoryId === "none" ? "Uncategorized" : categoryMap.get(categoryId)?.name ?? "Category", clear: () => setCategoryId("all") });
  if (datePreset !== "all") {
    const lbl =
      datePreset === "date" ? formatDate(specific, "medium") : datePreset === "range" ? `${range.from || "…"} → ${range.to || "…"}` : DATE_PRESETS.find((d) => d.value === datePreset)?.label ?? "";
    chips.push({ key: "d", label: lbl, clear: () => setDatePreset("all") });
  }
  const clearAll = () => {
    setSearch("");
    setType("all");
    setCategoryId("all");
    setDatePreset("all");
    setSort("newest");
  };

  const exportResults = () => {
    downloadFile(`my-accounter-history-filtered-${todayISO()}.csv`, historyToCSV(filtered, categories), "text/csv");
    toast(`Exported ${filtered.length} entries to CSV`);
  };

  const shown = filtered.slice(0, limit);
  const grouped = sort === "newest" || sort === "oldest";

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTitle
        eyebrow="Ledger"
        title="History"
        subtitle="Search your entries by description, category, date or type."
        actions={
          <Button variant="secondary" icon={Plus} onClick={() => navigate("entry")}>
            New entry
          </Button>
        }
      />

      {/* Filters */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by description or category…" className="h-12 pl-11 pr-11" aria-label="Search by description" type="search" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-ink" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filter by type">
          {(["all", ...types] as (EntryType | "all")[]).map((t) => {
            const on = type === t;
            const m = t === "all" ? null : TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (t !== "all" && categoryId !== "all" && categoryId !== "none") {
                    const c = categoryMap.get(categoryId);
                    if (c && c.type !== t && c.type !== "any") setCategoryId("all");
                  }
                }}
                aria-pressed={on}
                className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all", on ? "shadow-sm" : "border-line text-muted hover:border-line-strong hover:text-ink")}
                style={on ? (m ? { borderColor: m.color, background: m.soft, color: m.ink } : { borderColor: "var(--c-accent)", background: "var(--c-accent)", color: "var(--c-on-accent)" }) : undefined}
              >
                {m && <span className="size-2 rounded-full" style={{ background: m.color }} />}
                {m ? m.label : "All types"}
                <span className="num text-xs opacity-70">{typeCounts[t] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={<span className="inline-flex items-center gap-1.5"><Tag className="size-3" /> Category</span>}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              <option value="none">Uncategorized</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {type === "all" && c.type !== "any" ? ` · ${TYPE_META[c.type].label}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3" /> Date</span>}>
            <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} aria-label="Filter by date">
              {DATE_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><ArrowUpDown className="size-3" /> Sort</span>} className="sm:col-span-2 lg:col-span-1">
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort entries">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </Select>
          </Field>
        </div>

        {datePreset === "date" && (
          <Field label="Specific date" className="sm:max-w-xs">
            <Input type="date" value={specific} onChange={(e) => setSpecific(e.target.value)} />
          </Field>
        )}
        {datePreset === "range" && (
          <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
            <Field label="From">
              <Input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            </Field>
            <Field label="To">
              <Input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </Field>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="text-xs font-medium text-faint">Active filters:</span>
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-subtle py-1 pl-3 pr-1 text-xs font-medium text-ink">
                {c.label}
                <button type="button" onClick={c.clear} className="grid size-5 place-items-center rounded-full text-faint hover:bg-card hover:text-ink" aria-label={`Remove filter ${c.label}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className="ml-1 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
              Clear all
            </button>
          </div>
        )}
      </Card>

      {hidden > 0 && settings.mode === "general" && (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            {hidden} {hidden === 1 ? "entry" : "entries"} recorded in Manual Mode (Liabilities, Capital or Drawings) {hidden === 1 ? "is" : "are"} hidden while General Mode is active.{" "}
            <button type="button" onClick={() => navigate("settings?section=system")} className="font-semibold text-ink underline underline-offset-4">
              Switch mode
            </button>
          </p>
        </div>
      )}

      {/* Results */}
      <Card>
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-serif text-lg font-semibold text-ink">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
              <span className="ml-2 font-sans text-sm font-normal text-muted">
                · net <span className="num font-semibold" style={{ color: net >= 0 ? "var(--t-revenue-ink)" : "var(--t-expenses-ink)" }}>{money(net, { sign: true })}</span>
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {types
                .filter((t) => totals[t] > 0)
                .map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-1.5 rounded-full" style={{ background: TYPE_META[t].color }} />
                    {TYPE_META[t].label} <span className="num font-semibold text-ink">{money(totals[t])}</span>
                  </span>
                ))}
            </div>
          </div>
          {filtered.length > 0 && (
            <Button variant="secondary" size="sm" icon={Download} onClick={exportResults}>
              Export results
            </Button>
          )}
        </div>

        <div className="px-2.5 py-4 sm:px-3">
          {filtered.length === 0 ? (
            modeEntries.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No history yet"
                text="Once you record entries, you can search them here by description, category, date and type."
                action={
                  <Button icon={Plus} onClick={() => navigate("entry")}>
                    Add an entry
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={SearchX} title="No matching entries" text="Try adjusting your search or filters." action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>} />
            )
          ) : grouped ? (
            <GroupedEntries entries={shown} onSelect={setEditing} />
          ) : (
            <div className="divide-y divide-line/70">
              {shown.map((e) => (
                <EntryRow key={e.id} entry={e} showDate onClick={() => setEditing(e)} />
              ))}
            </div>
          )}

          {filtered.length > limit && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Load more
              </Button>
              <p className="text-xs text-faint">
                Showing {shown.length} of {filtered.length}
              </p>
            </div>
          )}
        </div>
      </Card>

      <EntryEditModal entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
