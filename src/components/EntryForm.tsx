import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Plus, Save, Tag, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { CATEGORY_COLORS, type Category, type Entry, type EntryInput, type EntryType, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { parseAmount } from "@/lib/io";
import { nowTime, todayISO } from "@/lib/utils";
import { cn } from "@/utils/cn";
import { Button, ConfirmDialog, Field, Input, Modal, Select } from "./ui";

export interface DraftPreview {
  type: EntryType;
  amount: number;
}

interface EntryFormProps {
  initial?: Partial<Entry>;
  submitLabel?: string;
  onSubmit: (values: EntryInput) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onDraftChange?: (d: DraftPreview) => void;
  resetOnSubmit?: boolean;
  autoFocusAmount?: boolean;
}

export function EntryForm({ initial, submitLabel = "Save Entry", onSubmit, onCancel, onDelete, onDraftChange, resetOnSubmit, autoFocusAmount }: EntryFormProps) {
  const { settings, categories } = useData();
  const modeTypes = MODE_TYPES[settings.mode];
  const firstCatFor = (t: EntryType) => categories.find((c) => c.type === t || c.type === "any")?.id ?? "";

  const [type, setType] = useState<EntryType>(() => {
    if (initial?.type) return initial.type;
    return modeTypes.includes("expenses") ? "expenses" : modeTypes[0];
  });
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(() => initial?.categoryId ?? (initial?.id ? "" : firstCatFor(initial?.type ?? (modeTypes.includes("expenses") ? "expenses" : modeTypes[0]))));
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [error, setError] = useState<string | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const typeOptions = modeTypes.includes(type) ? modeTypes : [...modeTypes, type];
  const available = useMemo(() => categories.filter((c) => c.type === type || c.type === "any"), [categories, type]);
  const parsed = parseAmount(amount);

  useEffect(() => {
    onDraftChange?.({ type, amount: parsed && parsed > 0 ? parsed : 0 });
  }, [type, parsed, onDraftChange]);

  useEffect(() => {
    if (autoFocusAmount) amountRef.current?.focus({ preventScroll: true });
  }, [autoFocusAmount]);

  const changeType = (t: EntryType) => {
    setType(t);
    if (!categories.some((c) => c.id === categoryId && (c.type === t || c.type === "any"))) setCategoryId(firstCatFor(t));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (value == null || value <= 0) {
      setError("Please enter an amount greater than zero.");
      amountRef.current?.focus();
      return;
    }
    const cat = categories.find((c) => c.id === categoryId);
    onSubmit({
      type,
      amount: Math.round(Math.abs(value) * 1e6) / 1e6,
      description: description.trim() || cat?.name || TYPE_META[type].singular,
      categoryId: cat ? cat.id : "",
      date: date || todayISO(),
      time: time || nowTime(),
    });
    setError(null);
    if (resetOnSubmit) {
      setAmount("");
      setDescription("");
      setTime(nowTime());
      amountRef.current?.focus({ preventScroll: true });
    }
  };

  const sym = settings.currency.symbol;
  const meta = TYPE_META[type];

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {/* Type */}
      <Field label="Type">
        <div className={cn("grid gap-2", typeOptions.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")} role="radiogroup" aria-label="Entry type">
          {typeOptions.map((t) => {
            const m = TYPE_META[t];
            const Icon = m.icon;
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeType(t)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                  active ? "shadow-sm" : "border-line bg-card text-muted hover:border-line-strong hover:text-ink",
                )}
                style={active ? { borderColor: m.color, background: m.soft, color: m.ink } : undefined}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg transition-colors" style={{ background: active ? m.color : m.soft, color: active ? "#fff" : m.ink }}>
                  <Icon className="size-[15px]" strokeWidth={2} />
                </span>
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Amount */}
      <Field label="Amount" error={error ?? undefined} htmlFor="entry-amount">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-serif text-2xl font-semibold" style={{ color: meta.ink }}>
            {sym}
          </span>
          <input
            id="entry-amount"
            ref={amountRef}
            className="field num h-16 font-serif text-[1.85rem] font-semibold tracking-tight"
            style={{ paddingLeft: `${Math.max(2.4, 1.6 + sym.length * 0.85)}rem` }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.,\s]/g, ""));
              if (error) setError(null);
            }}
            aria-invalid={!!error}
          />
        </div>
      </Field>

      {/* Description */}
      <Field label="Description" htmlFor="entry-desc" hint="Optional — defaults to the category name.">
        <Input id="entry-desc" placeholder={type === "revenue" ? "e.g. Monthly salary" : type === "expenses" ? "e.g. Groceries at the market" : `e.g. ${meta.singular} details`} value={description} maxLength={140} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      {/* Category */}
      <Field label="Category" htmlFor="entry-cat">
        <div className="flex gap-2">
          <Select id="entry-cat" wrapperClassName="flex-1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" icon={Plus} onClick={() => setNewCatOpen(true)} className="shrink-0 px-3.5" aria-label="Create category">
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </Field>

      {/* Date & time */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="entry-date">
          <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Time" htmlFor="entry-time">
          <Input id="entry-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center">
        {onDelete && (
          <Button variant="ghost" icon={Trash2} onClick={onDelete} className="sm:mr-auto" style={{ color: "var(--t-expenses-ink)" }}>
            Delete entry
          </Button>
        )}
        <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" icon={Save} size="lg" className="sm:min-w-[11rem]">
            {submitLabel}
          </Button>
        </div>
      </div>

      <NewCategoryModal
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        defaultType={type}
        onCreated={(c) => {
          setCategoryId(c.id);
          setNewCatOpen(false);
        }}
      />
    </form>
  );
}

/* ───────────── New / edit category modal ───────────── */
export function NewCategoryModal({
  open,
  onClose,
  defaultType,
  onCreated,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  defaultType?: EntryType | "any";
  onCreated?: (c: Category) => void;
  editing?: Category | null;
}) {
  const { addCategory, updateCategory, categories, settings } = useData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<EntryType | "any">(defaultType ?? "expenses");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setType(editing?.type ?? defaultType ?? "expenses");
    setColor(editing?.color ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const n = name.trim();
    if (!n) return setError("Please enter a category name.");
    const dup = categories.find((c) => c.id !== editing?.id && c.name.toLowerCase() === n.toLowerCase() && c.type === type);
    if (dup) return setError("A category with this name and type already exists.");
    if (editing) {
      updateCategory(editing.id, { name: n, type, color });
      toast(`Category “${n}” updated`);
      onClose();
    } else {
      const c = addCategory({ name: n, type, color });
      toast(`Category “${n}” added`);
      onCreated?.(c);
      if (!onCreated) onClose();
    }
  };

  const typeChoices: (EntryType | "any")[] = [...MODE_TYPES[settings.mode], "any"];
  if (type !== "any" && !typeChoices.includes(type)) typeChoices.unshift(type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit category" : "New category"}
      description="Categories organise your entries and colour your charts."
      icon={Tag}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Check} onClick={() => save()}>
            {editing ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name" error={error ?? undefined}>
          <Input
            value={name}
            maxLength={60}
            placeholder="e.g. Coffee & Snacks"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") save(e as unknown as FormEvent);
            }}
            data-autofocus
          />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as EntryType | "any")}>
            {typeChoices.map((t) => (
              <option key={t} value={t}>
                {t === "any" ? "Any type" : TYPE_META[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                className={cn("grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110", color === c && "ring-2 ring-ink")}
                style={{ background: c }}
              >
                {color === c && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
            <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-muted" title="Custom colour">
              <Plus className="size-4" />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Edit existing entry ───────────── */
export function EntryEditModal({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { updateEntry, deleteEntry } = useData();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [current, setCurrent] = useState<Entry | null>(entry);

  useEffect(() => {
    if (entry) setCurrent(entry);
  }, [entry]);

  return (
    <>
      <Modal open={!!entry} onClose={onClose} title="Edit entry" description="Update the details of this ledger entry." size="md">
        {current && (
          <EntryForm
            key={current.id}
            initial={current}
            submitLabel="Save changes"
            onCancel={onClose}
            onDelete={() => setConfirm(true)}
            onSubmit={(v) => {
              updateEntry(current.id, v);
              toast("Entry updated");
              onClose();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        icon={Trash2}
        title="Delete this entry?"
        message="This entry will be permanently removed from your history. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (current) deleteEntry(current.id);
          setConfirm(false);
          onClose();
          toast("Entry deleted", "info");
        }}
      />
    </>
  );
}
