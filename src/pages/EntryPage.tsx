import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, Lightbulb, PenLine } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { type Entry, type EntryType, MODE_META, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { balanceOf, computeTotals } from "@/lib/calc";
import { Button, Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { type DraftPreview, EntryEditModal, EntryForm } from "@/components/EntryForm";
import { EntryRow } from "@/components/EntryList";

export function EntryPage({ query, navigate }: { query: URLSearchParams; navigate: (to: string) => void }) {
  const { addEntry, settings, modeEntries, money } = useData();
  const { toast } = useToast();
  const types = MODE_TYPES[settings.mode];
  const qType = query.get("type") as EntryType | null;
  const initialType = qType && types.includes(qType) ? qType : undefined;
  const [preview, setPreview] = useState<DraftPreview>({ type: initialType ?? (types.includes("expenses") ? "expenses" : types[0]), amount: 0 });
  const [editing, setEditing] = useState<Entry | null>(null);
  const [saved, setSaved] = useState(0);

  const totals = useMemo(() => computeTotals(modeEntries), [modeEntries]);
  const balance = balanceOf(totals, settings.mode);
  const meta = TYPE_META[preview.type];
  const delta = meta.sign * preview.amount;
  const after = balance + delta;
  const onDraftChange = useCallback((d: DraftPreview) => setPreview(d), []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTitle eyebrow={MODE_META[settings.mode].label} title="New Entry" subtitle="Record a transaction in your ledger — it takes only a moment." />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-5 sm:p-7 xl:col-span-3">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-line bg-subtle">
              <PenLine className="size-[18px] text-ink" strokeWidth={1.7} />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">Entry details</h2>
              <p className="text-sm text-muted">{saved > 0 ? `${saved} saved this session — keep going!` : "Fill in the details below and save."}</p>
            </div>
          </div>
          <EntryForm
            key={initialType ?? "default"}
            initial={initialType ? { type: initialType } : undefined}
            resetOnSubmit
            autoFocusAmount
            onDraftChange={onDraftChange}
            onSubmit={(v) => {
              addEntry(v);
              setSaved((s) => s + 1);
              toast(`${TYPE_META[v.type].singular} of ${money(v.amount)} saved`);
            }}
          />
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card className="relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-[3px] transition-colors" style={{ background: meta.color }} />
            <div className="p-5 sm:p-6">
              <p className="eyebrow">Balance preview</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted">Current balance</span>
                  <span className="num font-serif text-xl font-semibold text-ink">{money(balance)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors" style={{ background: meta.soft, color: meta.ink }}>
                    <ArrowDown className="size-3.5" />
                    <span className="num">{money(delta, { sign: true })}</span>
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted">After this entry</span>
                  <span className="num font-serif text-2xl font-semibold" style={{ color: after < 0 ? "var(--t-expenses-ink)" : "var(--c-ink)" }}>
                    {money(after)}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex gap-3 rounded-xl bg-subtle p-3.5 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted" />
                <p className="text-muted">
                  <span className="font-semibold" style={{ color: meta.ink }}>
                    {meta.label}
                  </span>{" "}
                  — {meta.hint.charAt(0).toLowerCase() + meta.hint.slice(1)}. {meta.sign > 0 ? "Increases" : "Decreases"} your total balance.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recently added"
              icon={BookOpen}
              action={
                modeEntries.length > 0 && (
                  <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate("history")}>
                    History
                  </Button>
                )
              }
            />
            <div className="px-2.5 pb-3 pt-2 sm:px-3">
              {modeEntries.length === 0 ? (
                <EmptyState icon={BookOpen} title="No entries yet" text="Your saved entries will appear here." className="py-8" />
              ) : (
                <div className="divide-y divide-line/70">
                  {[...modeEntries]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 5)
                    .map((e) => (
                      <EntryRow key={e.id} entry={e} showDate onClick={() => setEditing(e)} />
                    ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <EntryEditModal entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
