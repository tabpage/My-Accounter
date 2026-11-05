import { useMemo, useState } from "react";
import { Check, Database, Download, FileDown, FileJson, FileSpreadsheet, FileText, ListChecks, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { ALL_TYPES, type Entry, type EntryType, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { inRange, PERIOD_OPTIONS, type PeriodKey, periodLabel, periodRange } from "@/lib/calc";
import { HISTORY_CSV_TEMPLATE, type HistoryImport, historyToCSV, historyToJSON, parseHistory } from "@/lib/io";
import { generatePdfReport } from "@/lib/pdf";
import { downloadFile, formatDate, pickFile, readFileAsText, todayISO } from "@/lib/utils";
import { Button, Field, Input, Modal, Select, Switch, TypeBadge } from "@/components/ui";
import { cn } from "@/utils/cn";
import { RadioCard, Section, Tile } from "./Section";

/* ───────────── History import / export ───────────── */
export function HistorySection() {
  const { entries, categories, settings, importEntries, money } = useData();
  const { toast } = useToast();
  const [pending, setPending] = useState<{ file: string; result: HistoryImport } | null>(null);
  const [replace, setReplace] = useState(false);

  const startImport = async (accept: string) => {
    const file = await pickFile(accept);
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const result = parseHistory(text, file.name, categories);
      if (!result.entries.length) {
        toast("No valid entries were found in this file.", "error");
        return;
      }
      setReplace(false);
      setPending({ file: file.name, result });
    } catch (e) {
      toast((e as Error).message || "Could not read this file.", "error");
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const n = importEntries(pending.result.entries, pending.result.newCategories, replace);
    toast(replace ? `History replaced with ${n} entries` : n ? `Imported ${n} new ${n === 1 ? "entry" : "entries"}` : "Nothing new to import — all entries already exist", n || replace ? "success" : "info");
    setPending(null);
  };

  const exportJSON = () => {
    downloadFile(`my-accounter-history-${todayISO()}.json`, historyToJSON(entries, categories, settings), "application/json");
    toast(`Exported ${entries.length} entries to JSON`);
  };
  const exportCSV = () => {
    downloadFile(`my-accounter-history-${todayISO()}.csv`, historyToCSV(entries, categories), "text/csv");
    toast(`Exported ${entries.length} entries to CSV`);
  };

  return (
    <Section id="history" icon={Database} title="History Data" description="Import or export your complete entry history as JSON or CSV.">
      <div className="grid gap-4 md:grid-cols-2">
        <Tile icon={Upload} title="Import History" text="Bring in entries from a .json or .csv file. Duplicates are detected and skipped.">
          <Button variant="secondary" size="sm" icon={FileJson} onClick={() => startImport(".json,application/json")}>
            Import .json
          </Button>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={() => startImport(".csv,text/csv,text/plain")}>
            Import .csv
          </Button>
          <button
            type="button"
            onClick={() => downloadFile("my-accounter-template.csv", HISTORY_CSV_TEMPLATE, "text/csv")}
            className="w-full pt-1 text-left text-xs font-medium text-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            Download a CSV template
          </button>
        </Tile>
        <Tile icon={Download} title="Export History" text={`${entries.length} ${entries.length === 1 ? "entry" : "entries"} across all types — perfect for backups.`}>
          <Button variant="secondary" size="sm" icon={FileJson} onClick={exportJSON} disabled={!entries.length}>
            Export .json
          </Button>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={exportCSV} disabled={!entries.length}>
            Export .csv
          </Button>
        </Tile>
      </div>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Import history"
        description={pending?.file}
        icon={Upload}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={replace ? "danger" : "primary"} icon={Check} onClick={confirmImport}>
              {replace ? "Replace history" : "Import entries"}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Entries found", pending.result.entries.length],
                ["New categories", pending.result.newCategories.length],
                ["Rows skipped", pending.result.invalid],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-subtle p-3 text-center">
                  <p className="num font-serif text-2xl font-semibold text-ink">{v}</p>
                  <p className="mt-0.5 text-[0.68rem] uppercase tracking-wider text-muted">{k}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              <RadioCard checked={!replace} onClick={() => setReplace(false)} className="p-4 sm:p-4">
                <p className="pr-7 font-semibold text-ink">Merge</p>
                <p className="mt-1 text-xs text-muted">Add new entries and keep your existing history.</p>
              </RadioCard>
              <RadioCard checked={replace} onClick={() => setReplace(true)} className="p-4 sm:p-4">
                <p className="pr-7 font-semibold text-ink">Replace</p>
                <p className="mt-1 text-xs text-muted">Remove current entries and use only this file.</p>
              </RadioCard>
            </div>
            <div>
              <p className="eyebrow mb-2">Preview</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {pending.result.entries.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <TypeBadge type={e.type} />
                    <span className="min-w-0 flex-1 truncate text-ink">{e.description}</span>
                    <span className="hidden text-xs text-faint sm:block">{formatDate(e.date, "short")}</span>
                    <span className="num font-semibold" style={{ color: TYPE_META[e.type].ink }}>
                      {money(e.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {pending.result.entries.length > 5 && <p className="mt-2 text-xs text-faint">…and {pending.result.entries.length - 5} more</p>}
            </div>
          </div>
        )}
      </Modal>
    </Section>
  );
}

/* ───────────── PDF reports ───────────── */
export function ReportsSection() {
  const { user } = useAuth();
  const { modeEntries, categories, categoryMap, settings } = useData();
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [includeEntries, setIncludeEntries] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const range = periodRange(period, custom);
  const label = periodLabel(period, range);
  const inPeriod = useMemo(() => modeEntries.filter((e) => inRange(e.date, range.from, range.to)), [modeEntries, range.from, range.to]);
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of inPeriod) {
      const k = categoryMap.has(e.categoryId) ? e.categoryId : "__none";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [inPeriod, categoryMap]);

  const modeTypes = MODE_TYPES[settings.mode];
  const groups = useMemo(() => {
    const order: (EntryType | "any")[] = [...ALL_TYPES.filter((t) => modeTypes.includes(t)), "any"];
    return order
      .map((t) => ({ type: t, items: categories.filter((c) => c.type === t) }))
      .filter((g) => g.items.length);
  }, [categories, modeTypes]);

  const make = (list: Entry[], filterNames?: string[], title?: string) => {
    setBusy(true);
    window.setTimeout(() => {
      try {
        generatePdfReport({ entries: list, categories, settings, account: user?.email ?? "Guest (this device)", periodLabel: label, categoryFilter: filterNames, includeEntries, title });
        toast("PDF report downloaded");
      } catch (e) {
        console.error(e);
        toast("Sorry — the PDF could not be generated.", "error");
      } finally {
        setBusy(false);
      }
    }, 40);
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setGroup = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });

  const exportSelected = () => {
    const list = inPeriod.filter((e) => selected.has(categoryMap.has(e.categoryId) ? e.categoryId : "__none"));
    const names = [...selected].map((id) => (id === "__none" ? "Uncategorized" : categoryMap.get(id)?.name ?? "")).filter(Boolean);
    make(list, names, "Category Report");
    setPickerOpen(false);
  };

  const selectedCount = [...selected].reduce((s, id) => s + (usage.get(id) ?? 0), 0);

  return (
    <Section id="reports" icon={FileText} title="PDF Reports" description="Generate an elegant, print-ready financial report.">
      <div className="mb-5 grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <Field label="Report period">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        {period === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </Field>
            <Field label="To">
              <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </Field>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
        <label className="flex h-[2.875rem] cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm text-ink">Include ledger entries</span>
          <Switch checked={includeEntries} onChange={setIncludeEntries} label="Include ledger entries" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Tile icon={FileDown} title="Export PDF" text={`Full report — ${inPeriod.length} ${inPeriod.length === 1 ? "entry" : "entries"} · ${label}.`}>
          <Button icon={Download} size="sm" loading={busy && !pickerOpen} onClick={() => make(inPeriod)}>
            Download PDF
          </Button>
        </Tile>
        <Tile icon={ListChecks} title="Export PDF with custom selected Categories" text="Pick exactly which categories appear in the report.">
          <Button variant="secondary" size="sm" icon={ListChecks} onClick={() => setPickerOpen(true)}>
            Choose categories{selected.size ? ` (${selected.size})` : ""}
          </Button>
        </Tile>
      </div>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select categories"
        description={`Period: ${label}. Counts show matching entries.`}
        icon={ListChecks}
        size="lg"
        footer={
          <>
            <span className="mr-auto text-sm text-muted">
              {selected.size} selected · <span className="num font-semibold text-ink">{selectedCount}</span> entries
            </span>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button icon={Download} disabled={!selected.size} loading={busy} onClick={exportSelected}>
              Download PDF
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => setSelected(new Set([...categories.map((c) => c.id), "__none"]))}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set([...usage.keys()]))}>
            Only categories with entries
          </Button>
        </div>
        <div className="space-y-5">
          {groups.map((g) => {
            const ids = g.items.map((c) => c.id);
            const all = ids.every((id) => selected.has(id));
            return (
              <div key={g.type}>
                <div className="mb-2 flex items-center justify-between">
                  {g.type === "any" ? <span className="eyebrow">Any type</span> : <TypeBadge type={g.type} />}
                  <button type="button" onClick={() => setGroup(ids, !all)} className="text-xs font-semibold text-muted hover:text-ink">
                    {all ? "Deselect group" : "Select group"}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((c) => (
                    <CheckRow key={c.id} checked={selected.has(c.id)} onClick={() => toggle(c.id)} color={c.color} label={c.name} count={usage.get(c.id) ?? 0} />
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <p className="eyebrow mb-2">Other</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckRow checked={selected.has("__none")} onClick={() => toggle("__none")} color="var(--c-faint)" label="Uncategorized" count={usage.get("__none") ?? 0} />
            </div>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

function CheckRow({ checked, onClick, color, label, count }: { checked: boolean; onClick: () => void; color: string; label: string; count: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all", checked ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}
    >
      <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors", checked ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>
        {checked && <Check className="size-3" strokeWidth={3.5} />}
      </span>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{label}</span>
      <span className="num text-xs text-faint">{count}</span>
    </button>
  );
}
