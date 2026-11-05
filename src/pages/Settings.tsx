import { useEffect, useMemo, useState } from "react";
import { Check, Coins, Database, FileText, Monitor, Moon, Palette, Plus, Scale, ShieldCheck, Sun, Tags, UserRound, type LucideIcon } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { ACCENTS, ALL_TYPES, CURRENCIES, type Mode, MODE_META, MODE_TYPES, type ThemeMode, TYPE_META } from "@/lib/constants";
import { formatNumber, isHex, resolveAccent } from "@/lib/utils";
import { Button, ConfirmDialog, Field, Input, PageTitle, Segmented, Select, Switch } from "@/components/ui";
import { useIsDark } from "@/components/Layout";
import { cn } from "@/utils/cn";
import { RadioCard, Section } from "./settings/Section";
import { HistorySection, ReportsSection } from "./settings/DataSection";
import { CategoriesSection } from "./settings/CategoriesSection";
import { SecuritySection } from "./settings/SecuritySection";
import { AccountSection } from "./settings/AccountSection";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "system", label: "Tracking System", icon: Scale },
  { id: "history", label: "History Data", icon: Database },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "reports", label: "PDF Reports", icon: FileText },
  { id: "currency", label: "Currency", icon: Coins },
  { id: "security", label: "App Password", icon: ShieldCheck },
  { id: "appearance", label: "Theme & Colors", icon: Palette },
  { id: "account", label: "My Account Data", icon: UserRound },
];

export function SettingsPage({ query }: { query: URLSearchParams }) {
  const target = query.get("section");
  const [active, setActive] = useState(target ?? "system");

  useEffect(() => {
    if (!target) return;
    const t = window.setTimeout(() => document.getElementById(`settings-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(t);
  }, [target]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      (items) => {
        const visible = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive((visible.target as HTMLElement).dataset.section ?? "system");
      },
      { rootMargin: "-90px 0px -60% 0px", threshold: 0 },
    );
    document.querySelectorAll("[data-section]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTitle eyebrow="Preferences" title="Settings" subtitle="Configure your tracking system, data, reports, security and appearance." />

      <div className="no-scrollbar sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", active === s.id ? "border-accent bg-accent text-on-accent" : "border-line bg-card text-muted")}
          >
            <s.icon className="size-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[14.5rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="Settings sections">
          <div className="sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(s.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                  active === s.id ? "bg-card text-ink shadow-[var(--shadow-card)]" : "text-muted hover:text-ink",
                )}
              >
                {active === s.id && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />}
                <s.icon className="size-4" strokeWidth={1.8} />
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          <SystemSection />
          <HistorySection />
          <CategoriesSection />
          <ReportsSection />
          <CurrencySection />
          <SecuritySection />
          <AppearanceSection />
          <AccountSection />
          <p className="pb-4 text-center font-serif text-sm italic text-faint">My Accounter · crafted for timeless clarity</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Tracking system ───────────── */
function SystemSection() {
  const { settings, updateSettings, entries } = useData();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const manualOnly = entries.filter((e) => !MODE_TYPES.general.includes(e.type)).length;

  const apply = (m: Mode) => {
    updateSettings({ mode: m });
    toast(`${MODE_META[m].label} activated`);
  };
  const choose = (m: Mode) => {
    if (m === settings.mode) return;
    if (m === "general" && manualOnly > 0) return setConfirm(true);
    apply(m);
  };

  return (
    <Section id="system" icon={Scale} title="Finance Tracking System" description="Choose how your balance is calculated.">
      <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Tracking system">
        {(["general", "manual"] as Mode[]).map((m) => (
          <RadioCard key={m} checked={settings.mode === m} onClick={() => choose(m)}>
            <p className="eyebrow pr-8">{MODE_META[m].label}</p>
            <p className="mt-2 pr-6 font-serif text-lg font-semibold leading-snug text-ink">{m === "general" ? "Revenue − Expenses" : "Assets = Liabilities + Owner's Equity"}</p>
            {m === "manual" && <p className="mt-1 font-serif text-sm italic text-muted">Owner&apos;s Equity = Capital + Revenue − Expenses − Drawings</p>}
            <p className="mt-3 text-sm leading-relaxed text-muted">{MODE_META[m].description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {MODE_TYPES[m].map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium" style={{ background: TYPE_META[t].soft, color: TYPE_META[t].ink }}>
                  <span className="size-1.5 rounded-full" style={{ background: TYPE_META[t].color }} />
                  {TYPE_META[t].label}
                </span>
              ))}
            </div>
          </RadioCard>
        ))}
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="primary"
        icon={Scale}
        title="Switch to General Mode?"
        message={`You have ${manualOnly} ${manualOnly === 1 ? "entry" : "entries"} recorded as Liabilities, Capital or Drawings. They won't be deleted — just hidden from the dashboard, charts and history until you switch back to Manual Mode.`}
        confirmLabel="Switch mode"
        onConfirm={() => {
          apply("general");
          setConfirm(false);
        }}
      />
    </Section>
  );
}

/* ───────────── Currency ───────────── */
function CurrencySection() {
  const { settings, updateSettings, money } = useData();
  const { toast } = useToast();
  const c = settings.currency;
  const [customSymbol, setCustomSymbol] = useState("");
  const [customCode, setCustomCode] = useState("");
  const isPreset = CURRENCIES.some((x) => x.code === c.code && x.symbol === c.symbol);

  const choose = (code: string) => {
    const opt = CURRENCIES.find((x) => x.code === code);
    if (!opt) return;
    updateSettings({ currency: { ...c, code: opt.code, symbol: opt.symbol, decimals: opt.decimals ?? 2, space: opt.symbol.length > 1 } });
    toast(`Currency set to ${opt.name} (${opt.symbol})`);
  };

  const applyCustom = () => {
    const sym = customSymbol.trim();
    if (!sym) return;
    updateSettings({ currency: { ...c, symbol: sym.slice(0, 6), code: (customCode.trim() || sym).toUpperCase().slice(0, 6), space: sym.length > 1 } });
    toast(`Custom currency “${sym}” applied`);
    setCustomSymbol("");
    setCustomCode("");
  };

  return (
    <Section id="currency" icon={Coins} title="Currency Symbols" description="Choose how amounts are displayed throughout the app.">
      <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7">
        {CURRENCIES.map((x) => {
          const on = c.code === x.code && c.symbol === x.symbol;
          return (
            <button
              key={x.code}
              type="button"
              onClick={() => choose(x.code)}
              title={x.name}
              aria-pressed={on}
              className={cn("relative flex flex-col items-center rounded-xl border px-2 py-3 transition-all", on ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line hover:border-line-strong")}
            >
              {on && <Check className="absolute right-1.5 top-1.5 size-3.5 text-accent-ink" strokeWidth={3} />}
              <span className="font-serif text-xl font-semibold leading-none text-ink">{x.symbol}</span>
              <span className="mt-1.5 text-[0.68rem] font-semibold tracking-wider text-muted">{x.code}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-sm font-semibold text-ink">Custom symbol</p>
          <p className="text-xs text-muted">{isPreset ? "Use any symbol not listed above." : `Currently using a custom symbol: ${c.symbol}`}</p>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value)} placeholder="Symbol" maxLength={6} aria-label="Custom symbol" />
            <Input value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="Code" maxLength={6} aria-label="Currency code" />
            <Button variant="secondary" icon={Plus} onClick={applyCustom} disabled={!customSymbol.trim()}>
              Apply
            </Button>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Symbol position</span>
            <Segmented
              size="sm"
              value={c.position}
              onChange={(v) => updateSettings({ currency: { ...c, position: v } })}
              options={[
                { value: "before", label: `${c.symbol}100` },
                { value: "after", label: `100${c.symbol}` },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Decimal places</span>
            <Select value={String(c.decimals)} onChange={(e) => updateSettings({ currency: { ...c, decimals: Number(e.target.value) } })} wrapperClassName="w-36" className="min-h-0 py-1.5 text-sm" aria-label="Decimal places">
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d} · {formatNumber(0, d)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Space after symbol</span>
            <Switch checked={c.space} onChange={(v) => updateSettings({ currency: { ...c, space: v } })} label="Space after symbol" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-subtle px-4 py-3">
        <span className="eyebrow">Preview</span>
        <span className="num font-serif text-lg font-semibold" style={{ color: "var(--t-revenue-ink)" }}>
          {money(1234567.891, { sign: true })}
        </span>
        <span className="num font-serif text-lg font-semibold" style={{ color: "var(--t-expenses-ink)" }}>
          {money(-42.5)}
        </span>
      </div>
    </Section>
  );
}

/* ───────────── Theme & colours ───────────── */
function AppearanceSection() {
  const { settings, updateSettings } = useData();
  const dark = useIsDark();
  const [custom, setCustom] = useState(settings.customAccent);
  const customResolved = useMemo(() => resolveAccent({ accent: "custom", customAccent: isHex(custom) ? custom : "#2F6FDB" }), [custom]);

  const themes: { value: ThemeMode; label: string; icon: LucideIcon; bg: string; card: string; ink: string }[] = [
    { value: "light", label: "Light", icon: Sun, bg: "#f6f3ec", card: "#ffffff", ink: "#1b1915" },
    { value: "dark", label: "Dark", icon: Moon, bg: "#0e0f11", card: "#1e2024", ink: "#f1eee6" },
    { value: "system", label: "System", icon: Monitor, bg: "linear-gradient(135deg,#f6f3ec 50%,#0e0f11 50%)", card: "#8a857c", ink: "#8a857c" },
  ];

  return (
    <Section id="appearance" icon={Palette} title="Theme and Colors" description="Personalise the look of your ledger.">
      <p className="mb-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Theme</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Theme">
        {themes.map((t) => {
          const on = settings.theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => updateSettings({ theme: t.value })}
              className={cn("overflow-hidden rounded-2xl border text-left transition-all", on ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong")}
            >
              <div className="h-16 p-2.5 sm:h-20" style={{ background: t.bg }}>
                <div className="flex h-full gap-1.5">
                  <div className="w-1/4 rounded-md opacity-80" style={{ background: t.card }} />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-1/2 rounded-md opacity-90" style={{ background: t.card }} />
                    <div className="h-1.5 w-2/3 rounded-full opacity-60" style={{ background: t.ink }} />
                  </div>
                </div>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-2.5 text-sm font-medium", on ? "bg-accent-soft text-ink" : "text-muted")}>
                <t.icon className="size-4" />
                {t.label}
                {on && <Check className="ml-auto size-4 text-accent-ink" strokeWidth={2.5} />}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mb-2.5 mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Accent colour</p>
      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {ACCENTS.map((a) => {
          const on = settings.accent === a.id;
          const col = dark ? a.dark : a.light;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => updateSettings({ accent: a.id })}
              aria-pressed={on}
              className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all", on ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line hover:border-line-strong")}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full shadow-inner" style={{ background: col }}>
                {on && <Check className="size-3.5" style={{ color: dark ? "#141414" : "#fff" }} strokeWidth={3} />}
              </span>
              <span className="truncate font-medium text-ink">{a.name}</span>
            </button>
          );
        })}
        <label
          className={cn(
            "relative flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all",
            settings.accent === "custom" ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-dashed border-line-strong hover:border-ink",
          )}
        >
          <span className="size-6 shrink-0 rounded-full" style={{ background: dark ? customResolved.dark : customResolved.light }} />
          <span className="font-medium text-ink">Custom…</span>
          <input
            type="color"
            value={isHex(custom) ? custom : "#2F6FDB"}
            onChange={(e) => {
              setCustom(e.target.value);
              updateSettings({ accent: "custom", customAccent: e.target.value });
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom accent colour"
          />
        </label>
      </div>

      <p className="mb-2.5 mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">Entry type colours</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {ALL_TYPES.map((t) => {
          const m = TYPE_META[t];
          return (
            <div key={t} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className="size-5 shrink-0 rounded-md" style={{ background: m.color }} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{m.label}</span>
                <span className="block text-[0.7rem] text-faint">{["Orange", "Blue", "Green", "Red", "Yellow"][ALL_TYPES.indexOf(t)]}</span>
              </span>
            </div>
          );
        })}
      </div>
      <Field hint="Type colours are fixed so your charts always read the same way — at a glance, on any device." className="mt-2">
        <span />
      </Field>
    </Section>
  );
}
