import { useState, type FormEvent } from "react";
import { BadgeCheck, Check, Cloud, CloudOff, Copy, KeyRound, LogIn, LogOut, Mail, Pencil, RefreshCw, RotateCcw, TriangleAlert, UserRound } from "lucide-react";
import { authMessage, useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useSecurity } from "@/context/SecurityContext";
import { useToast } from "@/context/ToastContext";
import { MODE_META } from "@/lib/constants";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { Button, ConfirmDialog, Field, Input, Switch } from "@/components/ui";
import { cn } from "@/utils/cn";
import { Section } from "./Section";

const RULES = `{
  "rules": {
    "myAccounter": {
      "users": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    }
  }
}`;

export function AccountSection() {
  const { user, logout, updateName, sendVerification, reload, changePassword, resetPassword } = useAuth();
  const { entries, categories, settings, updateSettings, cloud, syncNow, resetAll, storageBytes } = useData();
  const { removePassword } = useSecurity();
  const { toast } = useToast();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.displayName ?? "");
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const guest = !!user?.isGuest;
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = sorted[0]?.date;
  const last = sorted[sorted.length - 1]?.date;

  const run = async (key: string, fn: () => Promise<void>, success?: string) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast(success);
    } catch (e) {
      toast(authMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const submitPw = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    if (next.length < 6) return setPwErr("New password should be at least 6 characters.");
    if (next !== conf) return setPwErr("Passwords do not match.");
    setBusy("pw");
    try {
      await changePassword(cur, next);
      toast("Account password updated");
      setPwOpen(false);
      setCur("");
      setNext("");
      setConf("");
    } catch (err) {
      setPwErr(authMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const cloudLabel: Record<string, string> = {
    synced: `Synced ${cloud.lastSync ? formatDateTime(cloud.lastSync) : ""}`,
    syncing: "Syncing…",
    error: "Couldn't reach the cloud — data is safe on this device",
    denied: "Cloud access denied by database rules",
    off: "Cloud sync is turned off",
    guest: "Not available in guest mode",
  };

  return (
    <Section id="account" icon={UserRound} title="My Account Data" description="Your profile, data summary, cloud backup and account controls.">
      {/* Profile */}
      <div className="flex flex-col gap-5 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent font-serif text-xl font-semibold text-on-accent">{initials(user?.displayName, user?.email)}</span>
        <div className="min-w-0 flex-1">
          {editName ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run("name", () => updateName(name), "Name updated").then(() => setEditName(false));
              }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus maxLength={60} />
              <Button type="submit" icon={Check} loading={busy === "name"} aria-label="Save name" />
            </form>
          ) : (
            <p className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
              <span className="truncate">{user?.displayName || (guest ? "Guest" : "Unnamed")}</span>
              {!guest && (
                <button type="button" onClick={() => setEditName(true)} className="rounded-md p-1 text-faint hover:text-ink" aria-label="Edit name">
                  <Pencil className="size-4" />
                </button>
              )}
            </p>
          )}
          {guest ? (
            <p className="mt-1 text-sm text-muted">Guest mode — your data is stored only on this device.</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user?.email}
              </span>
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--t-revenue-ink)" }}>
                  <BadgeCheck className="size-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="font-semibold" style={{ color: "var(--t-drawings-ink)" }}>
                    Not verified
                  </span>
                  <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => void run("verify", sendVerification, "Verification email sent")}>
                    Send link
                  </button>
                  <button type="button" className="text-muted underline underline-offset-2" onClick={() => void run("reload", reload)}>
                    Refresh
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
        {guest ? (
          <Button icon={LogIn} onClick={() => void logout()}>
            Sign in / Create account
          </Button>
        ) : (
          <Button variant="secondary" icon={LogOut} onClick={() => void logout()}>
            Sign out
          </Button>
        )}
      </div>

      {/* Details grid */}
      <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["Entries", String(entries.length)],
          ["Categories", String(categories.length)],
          ["First entry", first ? formatDate(first) : "—"],
          ["Latest entry", last ? formatDate(last) : "—"],
          ["Tracking system", MODE_META[settings.mode].short],
          ["Currency", `${settings.currency.code} · ${settings.currency.symbol}`],
          ["Local storage", storageBytes > 1048576 ? `${(storageBytes / 1048576).toFixed(2)} MB` : `${(storageBytes / 1024).toFixed(1)} KB`],
          ["Member since", user?.createdAt ? formatDate(new Date(user.createdAt).toISOString().slice(0, 10)) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-subtle/70 px-3.5 py-3">
            <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-faint">{k}</dt>
            <dd className="num mt-1 truncate text-sm font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {!guest && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-faint">
          <span>Last sign-in: {formatDateTime(user?.lastSignIn)}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-ink"
            onClick={() => {
              void navigator.clipboard?.writeText(user?.uid ?? "").then(() => toast("User ID copied", "info"));
            }}
          >
            UID: <span className="font-mono">{user?.uid.slice(0, 10)}…</span> <Copy className="size-3" />
          </button>
        </div>
      )}

      {/* Cloud */}
      <div className="mt-5 rounded-2xl border border-line p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{ background: cloud.status === "synced" ? "var(--t-revenue-soft)" : "var(--c-subtle)", color: cloud.status === "synced" ? "var(--t-revenue-ink)" : "var(--c-muted)" }}
          >
            {cloud.status === "synced" || cloud.status === "syncing" ? <Cloud className="size-5" /> : <CloudOff className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Cloud sync</p>
            <p className={cn("text-sm", cloud.status === "denied" || cloud.status === "error" ? "text-[var(--t-drawings-ink)]" : "text-muted")}>{cloudLabel[cloud.status]}</p>
          </div>
          <Switch checked={!guest && settings.cloudSync} disabled={guest} onChange={(v) => updateSettings({ cloudSync: v })} label="Cloud sync" />
        </div>
        {!guest && settings.cloudSync && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} loading={cloud.status === "syncing"} onClick={() => void syncNow()}>
              Sync now
            </Button>
            <span className="text-xs text-faint">Backs up to Firebase Realtime Database so your ledger follows you across devices.</span>
          </div>
        )}
        {cloud.status === "denied" && (
          <details className="mt-4 rounded-xl bg-subtle p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">How to enable cloud sync</summary>
            <p className="mt-2 text-muted">In the Firebase console → Realtime Database → Rules, allow each signed-in user to access their own data:</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-card p-3 font-mono text-xs leading-relaxed text-ink">{RULES}</pre>
          </details>
        )}
      </div>

      {/* Password */}
      {!guest && (
        <div className="mt-4 rounded-2xl border border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-subtle text-muted">
                <KeyRound className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">Account password</p>
                <p className="text-sm text-muted">Change it here, or receive a secure reset link by email.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPwOpen((o) => !o)}>
                Change password
              </Button>
              <Button variant="ghost" size="sm" loading={busy === "reset"} onClick={() => void run("reset", () => resetPassword(user?.email ?? ""), `Reset link sent to ${user?.email}`)}>
                Email reset link
              </Button>
            </div>
          </div>
          {pwOpen && (
            <form onSubmit={submitPw} className="anim-fade-up mt-4 space-y-3 border-t border-line pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Current password">
                  <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
                </Field>
                <Field label="New password">
                  <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password">
                  <Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              {pwErr && (
                <p className="text-sm" style={{ color: "var(--t-expenses-ink)" }}>
                  {pwErr}
                </p>
              )}
              <Button type="submit" size="sm" loading={busy === "pw"}>
                Update password
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Danger */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5" style={{ borderColor: "var(--t-expenses-soft)" }}>
        <div className="flex flex-1 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--t-expenses-soft)", color: "var(--t-expenses-ink)" }}>
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Reset all data</p>
            <p className="text-sm text-muted">Erase every entry, category and preference{guest ? "" : " — on this device and in the cloud"}. This cannot be undone.</p>
          </div>
        </div>
        <Button variant="danger" size="sm" icon={RotateCcw} onClick={() => setResetOpen(true)}>
          Reset data
        </Button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        icon={TriangleAlert}
        title="Erase everything?"
        message="All entries, categories and preferences will be permanently deleted and the app password removed. Consider exporting a backup first."
        confirmLabel="Erase & reset"
        requireText="RESET"
        onConfirm={() => {
          resetAll();
          removePassword();
          setResetOpen(false);
          toast("All data has been reset", "info");
        }}
      />
    </Section>
  );
}
