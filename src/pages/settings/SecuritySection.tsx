import { useState, type FormEvent } from "react";
import { KeyRound, Lock, ShieldCheck, ShieldOff, Timer } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime } from "@/lib/utils";
import { Button, Field, Input, Select } from "@/components/ui";
import { Section } from "./Section";

type Mode = "idle" | "set" | "change" | "remove";

export function SecuritySection() {
  const { hasPassword, autoLock, setAt, setPassword, verify, removePassword, lockNow, setAutoLock } = useSecurity();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("idle");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (m: Mode) => {
    setMode(m);
    setCurrent("");
    setPw("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "change" || mode === "remove") {
      if (!current) return setError("Enter your current app password.");
      setBusy(true);
      const ok = await verify(current);
      setBusy(false);
      if (!ok) return setError("Current password is incorrect.");
      if (mode === "remove") {
        removePassword();
        toast("App password removed", "info");
        return open("idle");
      }
    }
    if (pw.length < 4) return setError("Use at least 4 characters.");
    if (pw !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    await setPassword(pw);
    setBusy(false);
    toast(mode === "change" ? "App password changed" : "App password enabled — your ledger is now protected");
    open("idle");
  };

  return (
    <Section id="security" icon={ShieldCheck} title="App Password" description="Add a lock screen on this device for extra privacy and safety.">
      <div className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: hasPassword ? "var(--t-revenue-soft)" : "var(--c-subtle)", color: hasPassword ? "var(--t-revenue-ink)" : "var(--c-muted)" }}>
          {hasPassword ? <ShieldCheck className="size-6" strokeWidth={1.7} /> : <ShieldOff className="size-6" strokeWidth={1.7} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{hasPassword ? "App password is on" : "App password is off"}</p>
          <p className="text-sm text-muted">{hasPassword ? `Set ${formatDateTime(setAt)}. The app locks on reload and after inactivity.` : "Anyone with access to this device can open your ledger."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPassword ? (
            <>
              <Button variant="secondary" size="sm" icon={Lock} onClick={lockNow}>
                Lock now
              </Button>
              <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => open("change")}>
                Change
              </Button>
              <Button variant="ghost" size="sm" onClick={() => open("remove")} style={{ color: "var(--t-expenses-ink)" }}>
                Remove
              </Button>
            </>
          ) : (
            <Button size="sm" icon={KeyRound} onClick={() => open("set")}>
              Set up password
            </Button>
          )}
        </div>
      </div>

      {mode !== "idle" && (
        <form onSubmit={submit} className="anim-fade-up mt-4 space-y-4 rounded-2xl border border-line bg-subtle/40 p-4 sm:p-5">
          <p className="font-semibold text-ink">{mode === "set" ? "Create an app password" : mode === "change" ? "Change app password" : "Remove app password"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(mode === "change" || mode === "remove") && (
              <Field label="Current password">
                <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
              </Field>
            )}
            {mode !== "remove" && (
              <>
                <Field label="New password">
                  <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus={mode === "set"} />
                </Field>
                <Field label="Confirm password">
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                </Field>
              </>
            )}
          </div>
          {error && (
            <p className="text-sm" style={{ color: "var(--t-expenses-ink)" }}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={mode === "remove" ? "danger" : "primary"} loading={busy}>
              {mode === "set" ? "Enable password" : mode === "change" ? "Update password" : "Remove password"}
            </Button>
            <Button variant="ghost" onClick={() => open("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {hasPassword && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <Timer className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.7} />
            <div>
              <p className="font-semibold text-ink">Auto-lock</p>
              <p className="text-sm text-muted">Lock automatically after a period of inactivity.</p>
            </div>
          </div>
          <Select value={String(autoLock)} onChange={(e) => setAutoLock(Number(e.target.value))} wrapperClassName="sm:w-48" aria-label="Auto-lock timeout">
            <option value="0">Never</option>
            <option value="1">After 1 minute</option>
            <option value="5">After 5 minutes</option>
            <option value="15">After 15 minutes</option>
            <option value="30">After 30 minutes</option>
            <option value="60">After 1 hour</option>
          </Select>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-faint">
        Forgot your app password? On the lock screen choose <span className="font-semibold text-muted">“Forgot app password?”</span> to verify with your account password, or reset your data to start fresh.
      </p>
    </Section>
  );
}
