import type { LucideIcon } from "lucide-react";
import { Building2, HandCoins, Landmark, TrendingDown, TrendingUp } from "lucide-react";

/* ───────────── Types ───────────── */
export type EntryType = "liabilities" | "capital" | "revenue" | "expenses" | "drawings";
export type Mode = "general" | "manual";
export type ThemeMode = "light" | "dark" | "system";

export interface Entry {
  id: string;
  description: string;
  categoryId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: EntryType;
  createdAt: number;
  updatedAt: number;
}

export type EntryInput = Omit<Entry, "id" | "createdAt" | "updatedAt">;

export interface Category {
  id: string;
  name: string;
  type: EntryType | "any";
  color: string;
}

export interface CurrencySettings {
  symbol: string;
  code: string;
  position: "before" | "after";
  decimals: number;
  space: boolean;
}

export interface Settings {
  mode: Mode;
  currency: CurrencySettings;
  theme: ThemeMode;
  accent: string;
  customAccent: string;
  cloudSync: boolean;
}

export interface AppData {
  version: 1;
  entries: Entry[];
  categories: Category[];
  settings: Settings;
  updatedAt: number;
}

/* ───────────── Entry types ───────────── */
export const ALL_TYPES: EntryType[] = ["liabilities", "capital", "revenue", "expenses", "drawings"];

export const MODE_TYPES: Record<Mode, EntryType[]> = {
  general: ["revenue", "expenses"],
  manual: ["liabilities", "capital", "revenue", "expenses", "drawings"],
};

export interface TypeMeta {
  key: EntryType;
  label: string;
  singular: string;
  color: string;
  ink: string;
  soft: string;
  hex: string;
  sign: 1 | -1;
  icon: LucideIcon;
  hint: string;
}

export const TYPE_META: Record<EntryType, TypeMeta> = {
  liabilities: {
    key: "liabilities",
    label: "Liabilities",
    singular: "Liability",
    color: "var(--t-liabilities)",
    ink: "var(--t-liabilities-ink)",
    soft: "var(--t-liabilities-soft)",
    hex: "#E07B24",
    sign: 1,
    icon: Landmark,
    hint: "Debts & obligations you owe",
  },
  capital: {
    key: "capital",
    label: "Capital",
    singular: "Capital",
    color: "var(--t-capital)",
    ink: "var(--t-capital-ink)",
    soft: "var(--t-capital-soft)",
    hex: "#2F6FDB",
    sign: 1,
    icon: Building2,
    hint: "Owner's investment into the books",
  },
  revenue: {
    key: "revenue",
    label: "Revenue",
    singular: "Revenue",
    color: "var(--t-revenue)",
    ink: "var(--t-revenue-ink)",
    soft: "var(--t-revenue-soft)",
    hex: "#1F9D5B",
    sign: 1,
    icon: TrendingUp,
    hint: "Income you have earned",
  },
  expenses: {
    key: "expenses",
    label: "Expenses",
    singular: "Expense",
    color: "var(--t-expenses)",
    ink: "var(--t-expenses-ink)",
    soft: "var(--t-expenses-soft)",
    hex: "#D9443F",
    sign: -1,
    icon: TrendingDown,
    hint: "Costs & everyday spending",
  },
  drawings: {
    key: "drawings",
    label: "Drawings",
    singular: "Drawing",
    color: "var(--t-drawings)",
    ink: "var(--t-drawings-ink)",
    soft: "var(--t-drawings-soft)",
    hex: "#D9A514",
    sign: -1,
    icon: HandCoins,
    hint: "Owner withdrawals for personal use",
  },
};

export const MODE_META: Record<Mode, { label: string; short: string; formula: string; description: string }> = {
  general: {
    label: "General Mode",
    short: "General",
    formula: "Balance = Revenue − Expenses",
    description: "Simple income & spending tracking — ideal for everyday personal budgets.",
  },
  manual: {
    label: "Manual Mode",
    short: "Manual",
    formula: "Assets = Liabilities + (Capital + Revenue − Expenses − Drawings)",
    description: "The full accounting equation with owner's equity — ideal for freelancers & small businesses.",
  },
};

/* ───────────── Categories ───────────── */
export const CATEGORY_COLORS = [
  "#1F9D5B", "#0E7C66", "#5B8C3A", "#0D5C70",
  "#2F6FDB", "#1E3A6B", "#4A3699", "#7C3AED",
  "#BE185D", "#9F1239", "#D9443F", "#C2410C",
  "#E07B24", "#D9A514", "#78716C", "#44403C",
];

const def = (name: string, type: EntryType | "any", color: string): Category => ({
  id: "def-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name,
  type,
  color,
});

export const DEFAULT_CATEGORIES: Category[] = [
  def("Salary", "revenue", "#1F9D5B"),
  def("Business", "revenue", "#0E7C66"),
  def("Freelance", "revenue", "#5B8C3A"),
  def("Investments", "revenue", "#0D5C70"),
  def("Gifts", "revenue", "#7C3AED"),
  def("Other Income", "revenue", "#78716C"),
  def("Food & Dining", "expenses", "#D9443F"),
  def("Transport", "expenses", "#C2410C"),
  def("Housing & Rent", "expenses", "#9F1239"),
  def("Utilities", "expenses", "#E07B24"),
  def("Shopping", "expenses", "#BE185D"),
  def("Health", "expenses", "#1F9D5B"),
  def("Entertainment", "expenses", "#4A3699"),
  def("Education", "expenses", "#2F6FDB"),
  def("Bills & Fees", "expenses", "#44403C"),
  def("Other Expenses", "expenses", "#78716C"),
  def("Bank Loan", "liabilities", "#E07B24"),
  def("Credit Card", "liabilities", "#C2410C"),
  def("Accounts Payable", "liabilities", "#D9A514"),
  def("Initial Capital", "capital", "#2F6FDB"),
  def("Additional Investment", "capital", "#1E3A6B"),
  def("Personal Withdrawal", "drawings", "#D9A514"),
  def("Owner Draw", "drawings", "#C2410C"),
];

/* ───────────── Currency ───────────── */
export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", decimals: 0 },
  { code: "MMK", symbol: "Ks", name: "Myanmar Kyat", decimals: 0 },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", decimals: 0 },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", decimals: 0 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
];

/* ───────────── Accent colours ───────────── */
export interface AccentPreset {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const ACCENTS: AccentPreset[] = [
  { id: "ink", name: "Classic Ink", light: "#1B1915", dark: "#EDE8DD" },
  { id: "gold", name: "Gilded Gold", light: "#94702A", dark: "#D8B56A" },
  { id: "navy", name: "Midnight Navy", light: "#1E3A6B", dark: "#8EB0EC" },
  { id: "emerald", name: "Emerald", light: "#0F6B50", dark: "#5BCBA2" },
  { id: "burgundy", name: "Burgundy", light: "#7B1E36", dark: "#E78DA2" },
  { id: "violet", name: "Royal Violet", light: "#4A3699", dark: "#AD9DF2" },
  { id: "ocean", name: "Ocean Teal", light: "#0D5C70", dark: "#62C6DC" },
  { id: "terracotta", name: "Terracotta", light: "#A0482A", dark: "#EC9A7C" },
];

export const DEFAULT_SETTINGS: Settings = {
  mode: "general",
  currency: { symbol: "$", code: "USD", position: "before", decimals: 2, space: false },
  theme: "system",
  accent: "ink",
  customAccent: "#2F6FDB",
  cloudSync: true,
};

export const APP_NAME = "My Accounter";
