import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { ALL_TYPES, type Category, type Entry, type EntryType, MODE_META, MODE_TYPES, type Settings, TYPE_META } from "./constants";
import { balanceOf, computeTotals, equityOf, sortEntries } from "./calc";
import { formatDate, hexToRgb } from "./utils";

export interface PdfReportOptions {
  entries: Entry[];
  categories: Category[];
  settings: Settings;
  account: string;
  periodLabel: string;
  categoryFilter?: string[];
  includeEntries: boolean;
  title?: string;
}

/** jsPDF core fonts only support Latin-1 — map/strip anything else. */
function safe(text: string): string {
  const cleaned = text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F\u2009]/g, " ")
    .replace(/\u2192/g, "->");
  let out = "";
  let lastWasUnknown = false;
  for (const ch of cleaned) {
    const code = ch.codePointAt(0) ?? 63;
    if ((code >= 32 && code < 127) || (code >= 160 && code <= 255)) {
      out += ch;
      lastWasUnknown = false;
      continue;
    }
    const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const bc = base.codePointAt(0) ?? 0;
    if (base && ((bc >= 32 && bc < 127) || (bc >= 160 && bc <= 255))) {
      out += base;
      lastWasUnknown = false;
    } else if (!lastWasUnknown) {
      out += "?";
      lastWasUnknown = true;
    }
  }
  return out;
}

const INK: [number, number, number] = [27, 25, 21];
const MUTED: [number, number, number] = [106, 100, 88];
const LINE: [number, number, number] = [226, 219, 205];
const GOLD: [number, number, number] = [176, 138, 58];
const IVORY: [number, number, number] = [250, 248, 243];

export function generatePdfReport(opts: PdfReportOptions): void {
  const { settings, categories } = opts;
  const mode = settings.mode;
  const types = MODE_TYPES[mode];
  const c = settings.currency;
  const sym = /^[\x20-\x7E\xA0-\xFF]+$/.test(c.symbol) ? c.symbol : c.code;
  const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  const money = (n: number, signed = false) => {
    const body = nf.format(Math.abs(n));
    const sp = c.space || sym.length > 1 ? " " : "";
    const s = c.position === "before" ? `${sym}${sp}${body}` : `${body}${sp}${sym}`;
    return (n < 0 ? "-" : signed && n > 0 ? "+" : "") + s;
  };

  const entries = sortEntries(opts.entries).reverse(); // chronological ledger order
  const totals = computeTotals(entries);
  const balance = balanceOf(totals, mode);
  const catMap = new Map(categories.map((cat) => [cat.id, cat]));

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const contentW = W - M * 2;
  let y = 0;

  doc.setProperties({ title: `${opts.title ?? "Financial Report"} — My Accounter`, author: safe(opts.account), creator: "My Accounter" });

  /* Header */
  doc.setFillColor(...INK);
  doc.roundedRect(M, 40, 30, 30, 6, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(250, 248, 243);
  doc.text("A", M + 15, 60, { align: "center" });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(M + 9, 63.5, M + 21, 63.5);
  doc.line(M + 9, 66, M + 21, 66);

  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(21);
  doc.text("My Accounter", M + 42, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(safe((opts.title ?? "Financial Report").toUpperCase()), M + 42, 68, { charSpace: 1.4 });

  doc.setFontSize(8.5);
  const generated = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  doc.text(`Generated ${generated}`, W - M, 54, { align: "right" });
  doc.text(safe(opts.account), W - M, 66, { align: "right" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(M, 84, W - M, 84);
  doc.setLineWidth(0.35);
  doc.line(M, 87.5, W - M, 87.5);

  /* Meta */
  y = 110;
  const meta: [string, string][] = [
    ["Period", safe(opts.periodLabel)],
    ["Tracking system", MODE_META[mode].label],
    ["Currency", `${c.code} (${sym})`],
    ["Entries", String(entries.length)],
  ];
  if (opts.categoryFilter?.length) meta.push(["Categories", safe(opts.categoryFilter.join(", "))]);
  const colW = contentW / 2;
  meta.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * colW;
    const yy = y + row * 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), x, yy, { charSpace: 1 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(v, colW - 16) as string[];
    doc.text(lines.slice(0, 2), x, yy + 13);
  });
  y += Math.ceil(meta.length / 2) * 30 + 14;

  /* Summary cards */
  const gap = 8;
  const perRow = types.length > 3 ? 5 : types.length;
  const cardW = (contentW - gap * (perRow - 1)) / perRow;
  types.forEach((t, i) => {
    const x = M + i * (cardW + gap);
    const rgb = hexToRgb(TYPE_META[t].hex);
    doc.setFillColor(...IVORY);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, cardW, 56, 5, 5, "FD");
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(x + 0.5, y + 8, 2.5, 40, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(TYPE_META[t].label.toUpperCase(), x + 12, y + 20, { charSpace: 0.8 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(types.length > 3 ? 10 : 13);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(money(totals[t]), x + 12, y + 40, { maxWidth: cardW - 18 });
  });
  y += 56 + 12;

  /* Balance band */
  doc.setFillColor(...INK);
  doc.roundedRect(M, y, contentW, 58, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(214, 190, 130);
  doc.text(mode === "manual" ? "TOTAL BALANCE  (ASSETS)" : "TOTAL BALANCE", M + 16, y + 20, { charSpace: 1.2 });
  doc.setFontSize(8);
  doc.setTextColor(200, 195, 185);
  doc.text(mode === "manual" ? "Liabilities + Capital + Revenue - Expenses - Drawings" : "Revenue - Expenses", M + 16, y + 40);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(250, 248, 243);
  doc.text(money(balance), W - M - 16, y + 37, { align: "right" });
  y += 58 + 10;

  if (mode === "manual") {
    const equity = equityOf(totals);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Owner's Equity = Capital + Revenue - Expenses - Drawings = ${money(equity)}`, M, y + 10);
    doc.text(`Assets ${money(balance)}  =  Liabilities ${money(totals.liabilities)}  +  Owner's Equity ${money(equity)}`, M, y + 24);
    y += 34;
  }

  const sectionTitle = (title: string) => {
    if (y > H - 140) {
      doc.addPage();
      y = 56;
    }
    y += 18;
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(title, M, y);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(M, y + 6, W - M, y + 6);
    y += 14;
  };

  const tableBase = {
    margin: { left: M, right: M, bottom: 56, top: 50 },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: INK, lineColor: LINE, lineWidth: 0.4, overflow: "linebreak" as const },
    headStyles: { fillColor: INK, textColor: [250, 248, 243] as [number, number, number], fontStyle: "bold" as const, fontSize: 8 },
    alternateRowStyles: { fillColor: IVORY },
    theme: "grid" as const,
  };
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  /* Category breakdown */
  sectionTitle("Breakdown by Category");
  const groups = new Map<string, { name: string; type: EntryType; count: number; amount: number }>();
  for (const e of entries) {
    const key = `${e.categoryId}|${e.type}`;
    const g = groups.get(key) ?? { name: catMap.get(e.categoryId)?.name ?? "Uncategorized", type: e.type, count: 0, amount: 0 };
    g.count++;
    g.amount += e.amount;
    groups.set(key, g);
  }
  const breakdown = [...groups.values()].sort((a, b) => ALL_TYPES.indexOf(a.type) - ALL_TYPES.indexOf(b.type) || b.amount - a.amount);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Category", "Type", "Entries", "Amount", "Share of type"]],
    body: breakdown.length
      ? breakdown.map((g) => [safe(g.name), TYPE_META[g.type].label, String(g.count), money(g.amount), totals[g.type] > 0 ? `${((g.amount / totals[g.type]) * 100).toFixed(1)}%` : "-"])
      : [["No entries in this selection", "", "", "", ""]],
    columnStyles: { 2: { halign: "center", cellWidth: 52 }, 3: { halign: "right", cellWidth: 100 }, 4: { halign: "right", cellWidth: 80 } },
    didParseCell: (data) => {
      if (data.section === "head") {
        if (data.column.index === 2) data.cell.styles.halign = "center";
        if (data.column.index >= 3) data.cell.styles.halign = "right";
        return;
      }
      if (data.section !== "body" || !breakdown.length) return;
      const g = breakdown[data.row.index];
      if (g && (data.column.index === 1 || data.column.index === 3)) {
        const rgb = hexToRgb(TYPE_META[g.type].hex);
        data.cell.styles.textColor = rgb;
        if (data.column.index === 3) data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = lastY() + 8;

  /* Ledger */
  if (opts.includeEntries) {
    sectionTitle("Ledger Entries");
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Date", "Time", "Description", "Category", "Type", "Amount"]],
      body: entries.length
        ? entries.map((e) => [
            formatDate(e.date, "medium").replace(/[^\x20-\x7E]/g, " "),
            e.time,
            safe(e.description),
            safe(catMap.get(e.categoryId)?.name ?? "Uncategorized"),
            TYPE_META[e.type].label,
            money(TYPE_META[e.type].sign * e.amount, true),
          ])
        : [["", "", "No entries in this selection", "", "", ""]],
      columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 40 }, 4: { cellWidth: 62 }, 5: { halign: "right", cellWidth: 92 } },
      didParseCell: (data) => {
        if (data.section === "head") {
          if (data.column.index === 5) data.cell.styles.halign = "right";
          return;
        }
        if (data.section !== "body" || !entries.length) return;
        const e = entries[data.row.index];
        if (e && (data.column.index === 4 || data.column.index === 5)) {
          data.cell.styles.textColor = hexToRgb(TYPE_META[e.type].hex);
          if (data.column.index === 5) data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = lastY();
  }

  /* Footer on all pages */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - 38, W - M, H - 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("My Accounter  ·  Personal Finance Tracker  ·  Confidential", M, H - 24);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 24, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`my-accounter-report-${stamp}.pdf`);
}
