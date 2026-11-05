import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { type EntryType, TYPE_META } from "@/lib/constants";

/* ───────────── Button ───────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-sm hover:brightness-110 dark:hover:brightness-95",
  secondary: "border border-line bg-card text-ink hover:border-line-strong hover:bg-subtle",
  ghost: "text-muted hover:bg-subtle hover:text-ink",
  danger: "bg-[var(--t-expenses)] text-white shadow-sm hover:brightness-110",
  soft: "bg-accent-soft text-accent-ink hover:brightness-95 dark:hover:brightness-125",
};
const BTN_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-4 text-[0.94rem]",
  lg: "h-13 gap-2.5 rounded-xl px-6 text-base",
};

export function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading, block, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin" /> : Icon ? <Icon className="size-[1.1em] shrink-0" strokeWidth={1.9} /> : null}
      {children}
      {IconRight && <IconRight className="size-[1.1em] shrink-0" strokeWidth={1.9} />}
    </button>
  );
}

export function IconButton({ icon: Icon, label, active, className, ...rest }: ComponentProps<"button"> & { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-ink",
        active && "bg-subtle text-ink",
        className,
      )}
      {...rest}
    >
      <Icon className="size-[19px]" strokeWidth={1.8} />
    </button>
  );
}

/* ───────────── Card ───────────── */
export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, className }: { title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink">
            <Icon className="size-[17px]" strokeWidth={1.7} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-faint">{eyebrow}</p>}
        <h1 className="mt-1.5 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.5rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────── Form fields ───────────── */
export function Field({ label, hint, error, children, className, htmlFor }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-sm" style={{ color: "var(--t-expenses-ink)" }}>{error}</p> : hint ? <p className="text-xs leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn("field", className)} {...rest} />;
}

export function Select({ className, wrapperClassName, children, ...rest }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select className={cn("field cursor-pointer pr-10", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex rounded-xl border border-line bg-subtle p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all duration-200",
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
              active ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {Icon && <Icon className="size-4" strokeWidth={1.8} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-accent" : "bg-line-strong")}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-[22px]" : "translate-x-[2px]")} />
    </button>
  );
}

/* ───────────── Modal ───────────── */
// Shared across all dialogs so stacked modals lock/unlock scrolling and Escape correctly
const modalStack: number[] = [];
let modalSeq = 0;
let scrollLocks = 0;

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = ++modalSeq;
    modalStack.push(id);
    if (scrollLocks++ === 0) document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most dialog reacts to Escape
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === id) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus();
    }, 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = modalStack.indexOf(id);
      if (i > -1) modalStack.splice(i, 1);
      if (--scrollLocks <= 0) {
        scrollLocks = 0;
        document.body.style.overflow = "";
      }
      window.clearTimeout(t);
      if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  const width = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-[#0b0b0c]/45 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn("anim-sheet relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-card shadow-[var(--shadow-pop)] outline-none sm:rounded-2xl", width)}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-6">
          {Icon && (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink">
              <Icon className="size-[18px]" strokeWidth={1.7} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl font-semibold leading-snug tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1 size-9" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  requireText,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  requireText?: string;
  icon?: LucideIcon;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText("");
  }, [open]);
  const ok = !requireText || text.trim().toUpperCase() === requireText.toUpperCase();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} disabled={!ok} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[0.95rem] leading-relaxed text-muted">{message}</div>
      {requireText && (
        <Field label={`Type “${requireText}” to confirm`} className="mt-4">
          <Input value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" data-autofocus />
        </Field>
      )}
    </Modal>
  );
}

/* ───────────── Display helpers ───────────── */
export function TypeBadge({ type, className }: { type: EntryType; className?: string }) {
  const m = TYPE_META[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", className)} style={{ background: m.soft, color: m.ink }}>
      <span className="size-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function TypeIcon({ type, className, size = "md" }: { type: EntryType; className?: string; size?: "sm" | "md" | "lg" }) {
  const m = TYPE_META[type];
  const Icon = m.icon;
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-[22px]" : "size-[18px]";
  return (
    <span className={cn("grid shrink-0 place-items-center", box, className)} style={{ background: m.soft, color: m.ink }}>
      <Icon className={icon} strokeWidth={1.9} />
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, action, className }: { icon: LucideIcon; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl border border-line bg-subtle text-muted">
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <h4 className="mt-4 font-serif text-lg font-semibold text-ink">{title}</h4>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-muted", className)} />;
}

/* ───────────── Brand ───────────── */
export function LogoMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="var(--c-ink)" />
      <text x="24" y="29.5" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontWeight="700" fontSize="23" fill="var(--c-canvas)">
        A
      </text>
      <rect x="15" y="33.5" width="18" height="1.7" rx=".85" fill="var(--c-gold)" />
      <rect x="15" y="37" width="18" height="1.7" rx=".85" fill="var(--c-gold)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif text-[1.15rem] font-semibold leading-none tracking-tight text-ink", className)}>
      <span className="font-medium italic">My</span> Accounter
    </span>
  );
}

/* Guilloche rosette — the engraved pattern found on banknotes & certificates */
const GUILLOCHE_PATHS: string[] = (() => {
  const out: string[] = [];
  for (let k = 0; k < 7; k++) {
    let d = "";
    const R = 112 + k * 13;
    const steps = 540;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = R + 17 * Math.sin(t * 14 + k * 0.7) + 6 * Math.sin(t * 5 - k);
      d += (i ? "L" : "M") + (200 + r * Math.cos(t)).toFixed(1) + " " + (200 + r * Math.sin(t)).toFixed(1);
    }
    out.push(d + "Z");
  }
  return out;
})();

export function Guilloche({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 400 400" className={className} style={style} fill="none" stroke="currentColor" aria-hidden="true">
      {GUILLOCHE_PATHS.map((d, i) => (
        <path key={i} d={d} strokeWidth="0.7" />
      ))}
      <circle cx="200" cy="200" r="88" strokeWidth="0.6" />
      <circle cx="200" cy="200" r="84" strokeWidth="0.4" />
    </svg>
  );
}
