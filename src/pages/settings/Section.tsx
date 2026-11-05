import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { cn } from "@/utils/cn";

export function Section({ id, icon, title, description, action, children }: { id: string; icon: LucideIcon; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} data-section={id} className="scroll-mt-24">
      <Card>
        <CardHeader title={title} subtitle={description} icon={icon} action={action} />
        <div className="p-5 sm:p-6">{children}</div>
      </Card>
    </section>
  );
}

export function Tile({ icon: Icon, title, text, children, className }: { icon: LucideIcon; title: string; text?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-line bg-subtle/40 p-4 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-ink shadow-sm">
          <Icon className="size-[17px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-ink">{title}</h4>
          {text && <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>}
        </div>
      </div>
      {children && <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function RadioCard({ checked, onClick, children, className }: { checked: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5",
        checked
          ? "border-accent bg-card bg-[linear-gradient(180deg,var(--c-accent-soft),transparent_75%)] shadow-[var(--shadow-card)] ring-1 ring-accent"
          : "border-line bg-card hover:border-line-strong",
        className,
      )}
    >
      <span className={cn("absolute right-4 top-4 grid size-5 place-items-center rounded-full border-2 transition-colors", checked ? "border-accent bg-accent" : "border-line-strong")}>
        {checked && <span className="size-2 rounded-full bg-on-accent" />}
      </span>
      {children}
    </button>
  );
}
