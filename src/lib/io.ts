import { CATEGORY_COLORS, type Category, type CurrencySettings, type Entry, type EntryType, type Mode, TYPE_META } from "./constants";
import { isHex, parseCSV, toCSV, todayISO, toISODate, uid } from "./utils";

/* ───────────── Normalisers ───────────── */
const TYPE_ALIASES: Record<string, EntryType> = {
  liabilities: "liabilities", liability: "liabilities", debt: "liabilities", debts: "liabilities", loan: "liabilities", payable: "liabilities",
  capital: "capital", equity: "capital", "owner equity": "capital", investment: "capital",
  revenue: "revenue", revenues: "revenue", income: "revenue", earning: "revenue", earnings: "revenue", sales: "revenue", credit: "revenue",
  expenses: "expenses", expense: "expenses", spending: "expenses", cost: "expenses", costs: "expenses", debit: "expenses",
  drawings: "drawings", drawing: "drawings", withdrawal: "drawings", withdrawals: "drawings", draw: "drawings",
};

export function normalizeType(v: unknown): EntryType | null {
  if (typeof v !== "string") return null;
  return TYPE_ALIASES[v.trim().toLowerCase()] ?? null;
}

export function normalizeDate(v: unknown, order?: "dmy" | "mdy"): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : toISODate(d);
  }
  const s = String(v).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let dmy: boolean;
    if (a > 12) dmy = true;
    else if (b > 12) dmy = false;
    else if (order) dmy = order === "dmy";
    else dmy = !(typeof navigator !== "undefined" && /^en-US/i.test(navigator.language));
    const day = dmy ? a : b;
    const month = dmy ? b : a;
    return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (/^\d{10,13}$/.test(s)) return normalizeDate(Number(s.length === 10 ? Number(s) * 1000 : s));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : toISODate(d);
}

export function normalizeTime(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const m = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) {
    const pm = m[3].toLowerCase() === "pm";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseAmount(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim().replace(/[\s\u00A0\u202F']/g, "");
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || /^[-−]/.test(s) || /[-−]$/.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    const commas = s.split(",").length - 1;
    s = commas === 1 && decimals > 0 && decimals <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (s.split(".").length - 1 > 1) {
    s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

/* ───────────── Record helpers ───────────── */
type Rec = Record<string, unknown>;

function pick(rec: Rec, keys: string[]): unknown {
  for (const k of Object.keys(rec)) {
    if (keys.includes(k.trim().toLowerCase())) {
      const v = rec[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

const isJSON = (text: string, filename: string) => /\.json$/i.test(filename) || /^\s*[[{]/.test(text);

function recordsFromText(text: string, filename: string, arrayKeys: string[]): { records: Rec[]; categories?: Rec[]; semicolon?: boolean } {
  if (isJSON(text, filename)) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("This file is not valid JSON.");
    }
    if (Array.isArray(json)) return { records: json as Rec[] };
    if (json && typeof json === "object") {
      const obj = json as Rec;
      for (const k of arrayKeys) {
        if (Array.isArray(obj[k])) {
          return { records: obj[k] as Rec[], categories: Array.isArray(obj.categories) ? (obj.categories as Rec[]) : undefined };
        }
      }
    }
    throw new Error("No records were found in this JSON file.");
  }
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("The CSV file needs a header row and at least one data row.");
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  return {
    records: rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))),
    semicolon: first.split(";").length > first.split(",").length,
  };
}

const DATE_KEYS = ["date", "day", "entry date", "datetime", "timestamp", "created", "createdat"];

/** Looks at every date in the file to decide between dd/mm and mm/dd consistently. */
function detectDateOrder(records: Rec[], semicolon?: boolean): "dmy" | "mdy" | undefined {
  let dmy = false;
  let mdy = false;
  for (const r of records) {
    const v = r && typeof r === "object" ? pick(r, DATE_KEYS) : undefined;
    const m = typeof v === "string" ? /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(v.trim()) : null;
    if (!m) continue;
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (dmy !== mdy) return dmy ? "dmy" : "mdy";
  return semicolon ? "dmy" : undefined; // ;-separated CSVs come from day-first locales
}

/* ───────────── History export ───────────── */
export function historyToJSON(entries: Entry[], categories: Category[], meta: { mode: Mode; currency: CurrencySettings }): string {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  return JSON.stringify(
    {
      app: "My Accounter",
      kind: "history",
      version: 1,
      exportedAt: new Date().toISOString(),
      mode: meta.mode,
      currency: meta.currency,
      categories: categories.map(({ id, name, type, color }) => ({ id, name, type, color })),
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date,
        time: e.time,
        type: e.type,
        category: catMap.get(e.categoryId)?.name ?? "",
        categoryId: e.categoryId,
        description: e.description,
        amount: e.amount,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    },
    null,
    2,
  );
}

export function historyToCSV(entries: Entry[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const rows: (string | number)[][] = [["Date", "Time", "Type", "Category", "Description", "Amount", "ID"]];
  for (const e of entries) rows.push([e.date, e.time, TYPE_META[e.type].label, catMap.get(e.categoryId)?.name ?? "", e.description, e.amount, e.id]);
  return "\uFEFF" + toCSV(rows);
}

export const HISTORY_CSV_TEMPLATE =
  "\uFEFF" +
  toCSV([
    ["Date", "Time", "Type", "Category", "Description", "Amount"],
    [todayISO(), "09:00", "Revenue", "Salary", "Monthly salary", 3200],
    [todayISO(), "12:30", "Expenses", "Food & Dining", "Lunch with team", 18.5],
    [todayISO(), "18:10", "Expenses", "Transport", "Taxi home", 12],
  ]);

/* ───────────── History import ───────────── */
export interface HistoryImport {
  entries: Entry[];
  newCategories: Category[];
  invalid: number;
}

export function parseHistory(text: string, filename: string, existing: Category[]): HistoryImport {
  const { records, categories: embedded, semicolon } = recordsFromText(text, filename, ["entries", "history", "transactions", "records", "data", "items"]);
  const dateOrder = detectDateOrder(records, semicolon);

  const byId = new Map(existing.map((c) => [c.id, c]));
  const byNameType = new Map(existing.map((c) => [`${c.name.toLowerCase()}|${c.type}`, c]));
  const byName = new Map<string, Category>();
  existing.forEach((c) => {
    if (!byName.has(c.name.toLowerCase())) byName.set(c.name.toLowerCase(), c);
  });
  const embeddedById = new Map<string, Rec>();
  embedded?.forEach((c) => {
    if (c && typeof c.id === "string") embeddedById.set(c.id, c);
  });

  const newCategories: Category[] = [];
  let colorIdx = existing.length;

  const resolveCategory = (name: string, type: EntryType, rawId?: string): string => {
    if (rawId && byId.has(rawId)) return rawId;
    const embeddedCat = rawId ? embeddedById.get(rawId) : undefined;
    const finalName = (name || (typeof embeddedCat?.name === "string" ? embeddedCat.name : "")).trim();
    if (!finalName) return "";
    const lower = finalName.toLowerCase();
    const found = byNameType.get(`${lower}|${type}`) ?? byNameType.get(`${lower}|any`) ?? byName.get(lower);
    if (found) return found.id;
    const color = typeof embeddedCat?.color === "string" && isHex(embeddedCat.color) ? embeddedCat.color : CATEGORY_COLORS[colorIdx++ % CATEGORY_COLORS.length];
    const cat: Category = { id: rawId && !byId.has(rawId) ? rawId : uid("c_"), name: finalName, type, color };
    newCategories.push(cat);
    byId.set(cat.id, cat);
    byNameType.set(`${lower}|${type}`, cat);
    byName.set(lower, cat);
    return cat.id;
  };

  const entries: Entry[] = [];
  let invalid = 0;
  const now = Date.now();
  for (const rec of records) {
    if (!rec || typeof rec !== "object") {
      invalid++;
      continue;
    }
    const amountRaw = parseAmount(pick(rec, ["amount", "value", "sum", "total", "price"]));
    if (amountRaw == null || amountRaw === 0) {
      invalid++;
      continue;
    }
    const type = normalizeType(pick(rec, ["type", "kind", "entry type", "transaction type"])) ?? (amountRaw < 0 ? "expenses" : "revenue");
    const dateRaw = pick(rec, DATE_KEYS);
    const date = normalizeDate(dateRaw, dateOrder) ?? todayISO();
    const time = normalizeTime(pick(rec, ["time", "hour"])) ?? (typeof dateRaw === "string" ? normalizeTime(dateRaw.replace(/^[^T\s]*[T\s]?/, "")) : null) ?? "12:00";
    const catName = String(pick(rec, ["category", "category name", "categoryname", "cat"]) ?? "");
    const catId = pick(rec, ["categoryid", "category id"]);
    const description = String(pick(rec, ["description", "desc", "note", "notes", "memo", "details", "title", "name"]) ?? "").trim();
    const id = String(pick(rec, ["id", "entry id"]) ?? "") || uid("e_");
    const createdAt = Number(pick(rec, ["createdat"])) || now;
    entries.push({
      id,
      type,
      amount: Math.abs(amountRaw),
      date,
      time,
      description: description || catName || TYPE_META[type].singular,
      categoryId: resolveCategory(catName, type, typeof catId === "string" ? catId : undefined),
      createdAt: typeof createdAt === "number" && createdAt > 0 ? createdAt : now,
      updatedAt: now,
    });
  }
  return { entries, newCategories, invalid };
}

/* ───────────── Categories export / import ───────────── */
export function categoriesToJSON(categories: Category[]): string {
  return JSON.stringify(
    {
      app: "My Accounter",
      kind: "categories",
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map(({ id, name, type, color }) => ({ id, name, type, color })),
    },
    null,
    2,
  );
}

export function categoriesToCSV(categories: Category[]): string {
  const rows: string[][] = [["Name", "Type", "Color", "ID"]];
  for (const c of categories) rows.push([c.name, c.type === "any" ? "Any" : TYPE_META[c.type].label, c.color, c.id]);
  return "\uFEFF" + toCSV(rows);
}

export function parseCategories(text: string, filename: string): { categories: Category[]; invalid: number } {
  const { records } = recordsFromText(text, filename, ["categories", "items", "data", "records"]);
  const categories: Category[] = [];
  let invalid = 0;
  records.forEach((rec, i) => {
    if (!rec || typeof rec !== "object") {
      invalid++;
      return;
    }
    const name = String(pick(rec, ["name", "category", "title", "label"]) ?? "").trim();
    if (!name) {
      invalid++;
      return;
    }
    const rawType = pick(rec, ["type", "kind"]);
    const type = normalizeType(rawType) ?? "any";
    const color = String(pick(rec, ["color", "colour", "hex"]) ?? "");
    const id = String(pick(rec, ["id"]) ?? "") || uid("c_");
    categories.push({ id, name: name.slice(0, 60), type, color: isHex(color) ? color : CATEGORY_COLORS[i % CATEGORY_COLORS.length] });
  });
  return { categories, invalid };
}
