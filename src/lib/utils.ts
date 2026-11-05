import { ACCENTS, type CurrencySettings, type Settings, type ThemeMode } from "./constants";

/* ───────────── IDs ───────────── */
export function uid(prefix = ""): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return prefix + c.randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/* ───────────── Dates ───────────── */
const pad = (n: number) => String(n).padStart(2, "0");
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}
export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
export function startOfWeekISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function formatDate(s: string, style: "long" | "medium" | "short" = "medium"): string {
  const d = parseISODate(s);
  if (isNaN(d.getTime())) return s;
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : style === "medium"
        ? { day: "numeric", month: "short", year: "numeric" }
        : { day: "numeric", month: "short" };
  return d.toLocaleDateString(undefined, opts);
}

export function formatTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function relativeDay(s: string): string | null {
  const today = todayISO();
  if (s === today) return "Today";
  if (s === addDays(today, -1)) return "Yesterday";
  return null;
}

export function formatDateTime(ts: number | string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ───────────── Numbers & money ───────────── */
export function formatNumber(n: number, decimals: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function formatCompact(n: number): string {
  if (Math.abs(n) < 1000) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export interface MoneyOptions {
  sign?: boolean;
  compact?: boolean;
  abs?: boolean;
}

export function formatMoney(n: number, c: CurrencySettings, opts: MoneyOptions = {}): string {
  const neg = n < 0;
  const v = Math.abs(n);
  const body = opts.compact ? formatCompact(v) : formatNumber(v, c.decimals);
  const sp = c.space ? "\u00A0" : "";
  const withSym = c.position === "before" ? `${c.symbol}${sp}${body}` : `${body}${sp}${c.symbol}`;
  let signStr = "";
  if (neg && !opts.abs) signStr = "−";
  else if (opts.sign && !neg && n !== 0) signStr = "+";
  return signStr + withSym;
}

export const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

/* ───────────── Colour helpers ───────────── */
export const isHex = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function readableOn(bg: string): string {
  const L = luminance(bg);
  const whiteContrast = 1.05 / (L + 0.05);
  const darkContrast = (L + 0.05) / 0.057;
  return whiteContrast >= darkContrast ? "#FFFFFF" : "#141414";
}

/* ───────────── Appearance (theme + accent) ───────────── */
export interface Appearance {
  theme: ThemeMode;
  vars: { light: Record<string, string>; dark: Record<string, string> };
}

export function resolveAccent(settings: Pick<Settings, "accent" | "customAccent">): { light: string; dark: string } {
  if (settings.accent === "custom" && isHex(settings.customAccent)) {
    const base = settings.customAccent;
    const L = luminance(base);
    return {
      light: L > 0.45 ? mix(base, "#000000", 0.4) : base,
      dark: L < 0.2 ? mix(base, "#FFFFFF", 0.45) : base,
    };
  }
  const p = ACCENTS.find((a) => a.id === settings.accent) ?? ACCENTS[0];
  return { light: p.light, dark: p.dark };
}

function accentVars(accent: string, dark: boolean): Record<string, string> {
  return {
    "--c-accent": accent,
    "--c-on-accent": readableOn(accent),
    "--c-accent-soft": alpha(accent, dark ? 0.16 : 0.09),
    "--c-accent-ring": alpha(accent, dark ? 0.32 : 0.24),
    "--c-accent-ink": accent,
  };
}

export function buildAppearance(settings: Pick<Settings, "theme" | "accent" | "customAccent">): Appearance {
  const a = resolveAccent(settings);
  return { theme: settings.theme, vars: { light: accentVars(a.light, false), dark: accentVars(a.dark, true) } };
}

export function prefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyAppearance(app: Appearance): void {
  const root = document.documentElement;
  const dark = app.theme === "dark" || (app.theme === "system" && prefersDark());
  root.classList.toggle("dark", dark);
  const vars = app.vars[dark ? "dark" : "light"];
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0E0F11" : "#F6F3EC");
  try {
    localStorage.setItem("myaccounter:appearance", JSON.stringify(app));
  } catch {
    /* storage unavailable */
  }
}

/* ───────────── Secret hashing (app password) ───────────── */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export type HashAlgo = "sha256" | "cyrb";

export async function hashSecret(secret: string, salt: string, algo?: HashAlgo): Promise<{ hash: string; algo: HashAlgo }> {
  const input = `${salt}::${secret}::my-accounter`;
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if ((algo === undefined || algo === "sha256") && subtle) {
    try {
      let buf: ArrayBuffer = new TextEncoder().encode(input).buffer as ArrayBuffer;
      for (let i = 0; i < 1000; i++) buf = await subtle.digest("SHA-256", buf);
      const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return { hash, algo: "sha256" };
    } catch {
      /* fall through */
    }
  }
  let acc = input;
  for (let i = 0; i < 2000; i++) acc = [1, 2, 3, 4].map((s) => cyrb53(acc, s * 7919 + i).toString(16)).join("");
  return { hash: acc, algo: "cyrb" };
}

export async function verifySecret(secret: string, salt: string, hash: string, algo: HashAlgo): Promise<boolean> {
  const res = await hashSecret(secret, salt, algo);
  return res.hash === hash;
}

export const randomSalt = () => uid("s") + uid();

/* ───────────── Files ───────────── */
export function downloadFile(filename: string, content: string | Blob, mime = "text/plain"): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsText(file);
  });
}

/** Opens a native file picker and resolves with the chosen file (or null). */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    input.click();
  });
}

/* ───────────── CSV ───────────── */
export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell == null ? "" : String(cell);
          return /[",\n\r;]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

export function parseCSV(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delim = count(";") > count(",") ? ";" : count("\t") > count(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function initials(name: string | null | undefined, email?: string | null): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
