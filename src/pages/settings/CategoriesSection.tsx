import { useMemo, useState, type FormEvent } from "react";
import { Check, Download, FileJson, FileSpreadsheet, Pencil, Plus, Tags, Trash2, Upload } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { ALL_TYPES, CATEGORY_COLORS, type Category, type EntryType, MODE_TYPES, TYPE_META } from "@/lib/constants";
import { categoriesToCSV, categoriesToJSON, parseCategories } from "@/lib/io";
import { downloadFile, pickFile, readFileAsText, todayISO } from "@/lib/utils";
import { Button, ConfirmDialog, IconButton, Input, Modal, Select, TypeBadge } from "@/components/ui";
import { NewCategoryModal } from "@/components/EntryForm";
import { cn } from "@/utils/cn";
import { RadioCard, Section } from "./Section";

export function CategoriesSection() {
  const { categories, entries, settings, addCategory, deleteCategory, importCategories } = useData();
  const { toast } = useToast();
  const modeTypes = MODE_TYPES[settings.mode];
  const [name, setName] = useState("");
  const [type, setType] = useState<EntryType | "any">("expenses");
  const [color, setColor] = useState(CATEGORY_COLORS[6]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [pending, setPending] = useState<{ file: string; cats: Category[]; invalid: number } | null>(null);
  const [replace, setReplace] = useState(false);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e) => m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1));
    return m;
  }, [entries]);

  const groups = useMemo(() => {
    const order: (EntryType | "any")[] = [...ALL_TYPES.filter((t) => modeTypes.includes(t)), "any", ...ALL_TYPES.filter((t) => !modeTypes.includes(t))];
    return order.map((t) => ({ type: t, items: categories.filter((c) => c.type === t) })).filter((g) => g.items.length);
  }, [categories, modeTypes]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Enter a category name.");
    if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase() && c.type === type)) return setError("This category already exists.");
    addCategory({ name: n, type, color });
    toast(`Category “${n}” added`);
    setName("");
    setError(null);
    setColor(CATEGORY_COLORS[(CATEGORY_COLORS.indexOf(color) + 1) % CATEGORY_COLORS.length]);
  };

  const startImport = async (accept: string) => {
    const file = await pickFile(accept);
    if (!file) return;
    try {
      const { categories: cats, invalid } = parseCategories(await readFileAsText(file), file.name);
      if (!cats.length) return toast("No valid categories found in this file.", "error");
      setReplace(false);
      setPending({ file: file.name, cats, invalid });
    } catch (e) {
      toast((e as Error).message || "Could not read this file.", "error");
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const n = importCategories(pending.cats, replace);
    toast(replace ? `Categories replaced (${n})` : n ? `Imported ${n} new ${n === 1 ? "category" : "categories"}` : "All categories already exist", n || replace ? "success" : "info");
    setPending(null);
  };

  return (
    <Section
      id="categories"
      icon={Tags}
      title="Categories"
      description={`${categories.length} categories organise your entries and colour your charts.`}
    >
      {/* Add */}
      <form onSubmit={add} className="rounded-2xl border border-line bg-subtle/40 p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Add Categories</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
          <Input
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Category name, e.g. Coffee & Snacks"
            aria-label="Category name"
          />
          <Select value={type} onChange={(e) => setType(e.target.value as EntryType | "any")} aria-label="Category type">
            {modeTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].label}
              </option>
            ))}
            <option value="any">Any type</option>
          </Select>
          <Button type="submit" icon={Plus}>
            Add
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Colour ${c}`}
              className={cn("grid size-6 place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110", color === c && "ring-2 ring-ink")}
              style={{ background: c }}
            >
              {color === c && <Check className="size-3 text-white" strokeWidth={3.5} />}
            </button>
          ))}
          <label className="relative ml-1 grid size-6 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-muted" title="Custom colour">
            <Plus className="size-3" />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--t-expenses-ink)" }}>
            {error}
          </p>
        )}
      </form>

      {/* List */}
      <div className="mt-6 space-y-5">
        {groups.map((g) => (
          <div key={g.type}>
            <div className="mb-2 flex items-center gap-2">
              {g.type === "any" ? <span className="eyebrow">Any type</span> : <TypeBadge type={g.type} />}
              {g.type !== "any" && !modeTypes.includes(g.type) && <span className="text-[0.68rem] text-faint">Manual Mode only</span>}
              <span className="text-xs text-faint">· {g.items.length}</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {g.items.map((c) => (
                <li key={c.id} className="group flex items-center gap-3 rounded-xl border border-line bg-card py-1.5 pl-3 pr-1.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="text-[0.7rem] text-faint">{usage.get(c.id) ?? 0} entries</span>
                  </span>
                  <IconButton icon={Pencil} label={`Edit ${c.name}`} className="size-8" onClick={() => setEditing(c)} />
                  <IconButton icon={Trash2} label={`Delete ${c.name}`} className="size-8 hover:text-[var(--t-expenses-ink)]" onClick={() => setDeleting(c)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Import / export */}
      <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Upload className="size-4" /> Import Categories
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={FileJson} onClick={() => startImport(".json,application/json")}>
              .json
            </Button>
            <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={() => startImport(".csv,text/csv,text/plain")}>
              .csv
            </Button>
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Download className="size-4" /> Export Categories
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={FileJson}
              onClick={() => {
                downloadFile(`my-accounter-categories-${todayISO()}.json`, categoriesToJSON(categories), "application/json");
                toast(`Exported ${categories.length} categories`);
              }}
            >
              .json
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={FileSpreadsheet}
              onClick={() => {
                downloadFile(`my-accounter-categories-${todayISO()}.csv`, categoriesToCSV(categories), "text/csv");
                toast(`Exported ${categories.length} categories`);
              }}
            >
              .csv
            </Button>
          </div>
        </div>
      </div>

      <NewCategoryModal open={!!editing} editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        icon={Trash2}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message={
          (usage.get(deleting?.id ?? "") ?? 0) > 0
            ? `${usage.get(deleting?.id ?? "")} entries use this category. They will be kept, but marked as Uncategorized.`
            : "This category is not used by any entries."
        }
        confirmLabel="Delete category"
        onConfirm={() => {
          if (deleting) {
            deleteCategory(deleting.id);
            toast(`Category “${deleting.name}” deleted`, "info");
          }
          setDeleting(null);
        }}
      />

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Import categories"
        description={pending?.file}
        icon={Upload}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={replace ? "danger" : "primary"} icon={Check} onClick={confirmImport}>
              {replace ? "Replace categories" : "Import"}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Found <span className="font-semibold text-ink">{pending.cats.length}</span> categories
              {pending.invalid ? ` (${pending.invalid} rows skipped)` : ""}.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pending.cats.slice(0, 24).map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink">
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
              ))}
              {pending.cats.length > 24 && <span className="text-xs text-faint">+{pending.cats.length - 24} more</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              <RadioCard checked={!replace} onClick={() => setReplace(false)} className="p-4 sm:p-4">
                <p className="pr-7 font-semibold text-ink">Merge</p>
                <p className="mt-1 text-xs text-muted">Add only categories that don&apos;t exist yet.</p>
              </RadioCard>
              <RadioCard checked={replace} onClick={() => setReplace(true)} className="p-4 sm:p-4">
                <p className="pr-7 font-semibold text-ink">Replace</p>
                <p className="mt-1 text-xs text-muted">Use only the imported categories.</p>
              </RadioCard>
            </div>
          </div>
        )}
      </Modal>
    </Section>
  );
}
