import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, LogOut, RotateCcw, ShieldCheck, TriangleAlert, Unlock } from "lucide-react";
import { authMessage, useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useSecurity } from "@/context/SecurityContext";
import { useToast } from "@/context/ToastContext";
import { Button, ConfirmDialog, Field, Guilloche, Input, LogoMark, Modal, Wordmark } from "@/components/ui";
import { cn } from "@/utils/cn";

export function LockScreen() {
  const { user, logout, reauthenticate } = useAuth();
  const { unlock, removePassword } = useSecurity();
  const { resetAll } = useData();
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [accountPw, setAccountPw] = useState("");
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const name = user?.displayName || user?.email?.split("@")[0] || "there";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    const ok = await unlock(pw);
    setBusy(false);
    if (!ok) {
      setError(true);
      setShake((s) => s + 1);
      setPw("");
    }
  };

  const verifyAccount = async () => {
    setVerifyErr(null);
    if (!accountPw) return setVerifyErr("Please enter your account password.");
    setVerifying(true);
    try {
      await reauthenticate(accountPw);
      removePassword();
      toast("Identity verified — app password removed. You can set a new one in Settings.");
    } catch (err) {
      setVerifyErr(authMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-app relative flex items-center justify-center overflow-hidden bg-canvas px-5 py-10">
      <Guilloche className="anim-spin-slow pointer-events-none absolute left-1/2 top-1/2 size-[56rem] -translate-x-1/2 -translate-y-1/2 text-ink opacity-[0.05]" />
      <div className="anim-fade-up relative w-full max-w-sm text-center">
        <LogoMark className="mx-auto size-16" />
        <Wordmark className="mt-4 block text-xl" />
        <div className="mx-auto mt-8 grid size-14 place-items-center rounded-full border border-line bg-card shadow-[var(--shadow-card)]">
          <LockKeyhole className="size-6 text-ink" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">Welcome back, {name}</h1>
        <p className="mt-2 text-sm text-muted">Your ledger is locked. Enter your app password to continue.</p>

        <form key={shake} onSubmit={submit} className={cn("mt-8 space-y-3 text-left", shake > 0 && "anim-shake")}>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              type={show ? "text" : "password"}
              className="h-13 pl-10 pr-11 text-center text-lg tracking-[0.3em]"
              placeholder="••••••"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError(false);
              }}
              autoFocus
              autoComplete="current-password"
              aria-label="App password"
              aria-invalid={error}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-faint hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {error && (
            <p className="text-center text-sm" style={{ color: "var(--t-expenses-ink)" }}>
              Incorrect password. Please try again.
            </p>
          )}
          <Button type="submit" size="lg" block icon={Unlock} loading={busy}>
            Unlock
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-5 text-sm">
          <button type="button" onClick={() => setForgotOpen(true)} className="font-medium text-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
            Forgot app password?
          </button>
          <span className="h-4 w-px bg-line" />
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-ink">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your app password?" description="Choose how you would like to regain access." icon={ShieldCheck}>
        <div className="space-y-4">
          {!user?.isGuest && (
            <div className="rounded-2xl border border-line p-4 sm:p-5">
              <h3 className="font-semibold text-ink">Verify with your account password</h3>
              <p className="mt-1 text-sm text-muted">Confirm your Firebase account password to remove the app lock. Your data stays intact.</p>
              <div className="mt-4 space-y-3">
                <Field error={verifyErr ?? undefined}>
                  <Input type="password" placeholder={`Password for ${user?.email ?? "your account"}`} value={accountPw} onChange={(e) => setAccountPw(e.target.value)} autoComplete="current-password" />
                </Field>
                <Button block icon={ShieldCheck} loading={verifying} onClick={verifyAccount}>
                  Verify &amp; unlock
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--t-expenses-soft)", background: "var(--t-expenses-soft)" }}>
            <h3 className="flex items-center gap-2 font-semibold" style={{ color: "var(--t-expenses-ink)" }}>
              <TriangleAlert className="size-4" /> Reset app data
            </h3>
            <p className="mt-1 text-sm text-muted">
              Permanently erase all entries, categories and settings for this account{user?.isGuest ? " on this device" : " (including the cloud copy)"}, and remove the app password.
            </p>
            <Button variant="danger" icon={RotateCcw} className="mt-4" block onClick={() => setResetOpen(true)}>
              Reset all data
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        icon={TriangleAlert}
        title="Erase everything?"
        message="All of your entries, categories and preferences will be permanently deleted. This cannot be undone."
        confirmLabel="Erase & reset"
        requireText="RESET"
        onConfirm={() => {
          resetAll();
          removePassword();
          setResetOpen(false);
          setForgotOpen(false);
          toast("All data has been reset. Your ledger is fresh.", "info");
        }}
      />
    </div>
  );
}
