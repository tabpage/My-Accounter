import { useEffect, useState, type ReactNode } from "react";
import { ChartPie, Cloud, CloudOff, History, LayoutDashboard, Lock, LogOut, Moon, Plus, Settings, Sun, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useSecurity } from "@/context/SecurityContext";
import { MODE_META } from "@/lib/constants";
import { formatDate, initials, todayISO } from "@/lib/utils";
import { cn } from "@/utils/cn";
import { IconButton, LogoMark, Wordmark } from "./ui";

export type Route = "dashboard" | "overview" | "entry" | "history" | "settings";

export const NAV: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { route: "overview", label: "Overview", icon: ChartPie },
  { route: "entry", label: "New Entry", icon: Plus },
  { route: "history", label: "History", icon: History },
  { route: "settings", label: "Settings", icon: Settings },
];

export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function Layout({ route, navigate, children }: { route: Route; navigate: (to: string) => void; children: ReactNode }) {
  const { user, logout } = useAuth();
  const { settings, updateSettings, cloud } = useData();
  const { hasPassword, lockNow } = useSecurity();
  const dark = useIsDark();
  const toggleTheme = () => updateSettings({ theme: dark ? "light" : "dark" });
  const name = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const cloudOn = cloud.status === "synced" || cloud.status === "syncing";

  return (
    <div className="min-h-app bg-canvas text-ink">
      {/* ── Sidebar (desktop, laptop, TV) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-line bg-card/70 backdrop-blur-xl lg:flex">
        <button type="button" onClick={() => navigate("dashboard")} className="flex items-center gap-3 px-6 pb-5 pt-7 text-left">
          <LogoMark className="size-10 shrink-0" />
          <span className="min-w-0">
            <Wordmark className="block text-[1.25rem]" />
            <span className="mt-1 block text-[0.68rem] uppercase tracking-[0.18em] text-faint">Personal Ledger</span>
          </span>
        </button>
        <div className="mx-6 hairline-gold opacity-60" />

        <div className="px-6 pt-5">
          <button
            type="button"
            onClick={() => navigate("settings?section=system")}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-subtle/70 px-3.5 py-2.5 text-left transition-colors hover:border-line-strong"
          >
            <span>
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-faint">Tracking system</span>
              <span className="mt-0.5 block text-sm font-semibold text-ink">{MODE_META[settings.mode].label}</span>
            </span>
            <span className="rounded-md bg-card px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted shadow-sm">{settings.currency.code}</span>
          </button>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {NAV.map((n) => {
            const active = route === n.route;
            const Icon = n.icon;
            return (
              <button
                key={n.route}
                type="button"
                onClick={() => navigate(n.route)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-medium transition-all duration-200",
                  active ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon className="size-[19px]" strokeWidth={active ? 2 : 1.7} />
                {n.label}
                {n.route === "entry" && !active && <span className="ml-auto rounded-md border border-line px-1.5 text-[0.65rem] text-faint">N</span>}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-serif text-sm font-semibold text-on-accent">{initials(user?.displayName, user?.email)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{name}</span>
              <span className="flex items-center gap-1 truncate text-xs text-faint">
                {user?.isGuest ? (
                  "Guest · this device only"
                ) : (
                  <>
                    {cloudOn ? <Cloud className="size-3" /> : <CloudOff className="size-3" />}
                    <span className="truncate">{user?.email}</span>
                  </>
                )}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon={dark ? Sun : Moon} label={dark ? "Light theme" : "Dark theme"} onClick={toggleTheme} />
            {hasPassword && <IconButton icon={Lock} label="Lock app" onClick={lockNow} />}
            <IconButton icon={Settings} label="Settings" onClick={() => navigate("settings")} />
            <IconButton icon={LogOut} label="Sign out" onClick={() => void logout()} className="ml-auto" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[17rem]">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button type="button" onClick={() => navigate("dashboard")} className="flex items-center gap-2.5 lg:hidden" aria-label="My Accounter home">
              <LogoMark className="size-9" />
              <Wordmark className="text-[1.1rem]" />
            </button>
            <p className="hidden text-sm text-muted lg:block">
              <span className="font-serif italic">{formatDate(todayISO(), "long")}</span>
            </p>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate("entry")}
                className="mr-1.5 hidden h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-on-accent shadow-sm transition-all hover:brightness-110 sm:inline-flex"
              >
                <Plus className="size-4" strokeWidth={2.2} /> New Entry
              </button>
              <IconButton icon={dark ? Sun : Moon} label={dark ? "Light theme" : "Dark theme"} onClick={toggleTheme} className="lg:hidden" />
              {hasPassword && <IconButton icon={Lock} label="Lock app" onClick={lockNow} className="lg:hidden" />}
              <IconButton icon={Settings} label="Settings" onClick={() => navigate("settings")} active={route === "settings"} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[90rem] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">
          <div key={route} className="anim-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* ── Bottom navigation (phones & tablets) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-xl grid-cols-5 px-1">
          {NAV.map((n) => {
            const active = route === n.route;
            const Icon = n.icon;
            if (n.route === "entry") {
              return (
                <div key={n.route} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("entry")}
                    aria-label="New entry"
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mt-5 grid size-14 place-items-center rounded-2xl bg-accent text-on-accent shadow-[var(--shadow-pop)] ring-4 ring-canvas transition-transform active:scale-95",
                      active && "scale-105",
                    )}
                  >
                    <Plus className="size-6" strokeWidth={2.2} />
                  </button>
                </div>
              );
            }
            return (
              <button
                key={n.route}
                type="button"
                onClick={() => navigate(n.route)}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium transition-colors", active ? "text-ink" : "text-faint hover:text-muted")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent-soft")}>
                  <Icon className="size-[19px]" strokeWidth={active ? 2.1 : 1.7} />
                </span>
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
