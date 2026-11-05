import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { type Entry, TYPE_META } from "@/lib/constants";
import { signedAmount } from "@/lib/calc";
import { formatDate, formatTime, relativeDay } from "@/lib/utils";
import { TypeIcon } from "./ui";

export function EntryRow({ entry, onClick, showDate }: { entry: Entry; onClick?: () => void; showDate?: boolean }) {
  const { categoryMap, money } = useData();
  const m = TYPE_META[entry.type];
  const cat = categoryMap.get(entry.categoryId);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-subtle focus-visible:bg-subtle sm:gap-4 sm:px-3"
    >
      <TypeIcon type={entry.type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{entry.description}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: cat?.color ?? "var(--c-faint)" }} />
          <span className="truncate">{cat?.name ?? "Uncategorized"}</span>
          <span className="text-faint">·</span>
          <span className="shrink-0">
            {showDate ? `${formatDate(entry.date, "short")}, ` : ""}
            {formatTime(entry.time)}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="num block font-semibold" style={{ color: m.ink }}>
          {m.sign > 0 ? "+" : "−"}
          {money(entry.amount, { abs: true })}
        </span>
        <span className="text-[0.66rem] font-medium uppercase tracking-[0.1em] text-faint">{m.label}</span>
      </span>
    </button>
  );
}

export function GroupedEntries({ entries, onSelect }: { entries: Entry[]; onSelect: (e: Entry) => void }) {
  const { money } = useData();
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="space-y-6">
      {groups.map(([date, list]) => {
        const net = list.reduce((s, e) => s + signedAmount(e), 0);
        return (
          <section key={date}>
            <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line px-2.5 pb-2 sm:px-3">
              <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted">
                {relativeDay(date) ? (
                  <>
                    <span className="text-ink">{relativeDay(date)}</span> · {formatDate(date, "medium")}
                  </>
                ) : (
                  formatDate(date, "long")
                )}
              </h4>
              <span className="num shrink-0 text-xs text-faint">
                {list.length} · net <span className="font-semibold text-muted">{money(net, { sign: true })}</span>
              </span>
            </div>
            <div className="divide-y divide-line/70">
              {list.map((e) => (
                <EntryRow key={e.id} entry={e} onClick={() => onSelect(e)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
