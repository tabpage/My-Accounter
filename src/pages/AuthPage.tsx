import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, MailCheck, UserRound } from "lucide-react";
import { authMessage, useAuth } from "@/context/AuthContext";
import { ALL_TYPES, TYPE_META } from "@/lib/constants";
import { Button, Field, Guilloche, Input, LogoMark, Wordmark } from "@/components/ui";

type View = "signin" | "signup" | "reset";

function PasswordInput({ id, value, onChange, autoComplete, placeholder }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <Input id={id} type={show ? "text" : "password"} className="pl-10 pr-11" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder ?? "••••••••"} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-faint hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthPage() {
  const { signIn, signUp, resetPassword, continueAsGuest } = useAuth();
  const [view, setView] = useState<View>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (v: View) => {
    setView(v);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim()) return setError("Please enter your email address.");
    if (view !== "reset" && !password) return setError("Please enter your password.");
    if (view === "signup") {
      if (password.length < 6) return setError("Password should be at least 6 characters.");
      if (password !== confirm) return setError("Passwords do not match.");
    }
    setBusy(true);
    try {
      if (view === "signin") await signIn(email, password);
      else if (view === "signup") await signUp(name, email, password);
      else {
        await resetPassword(email);
        setNotice(`A password reset link has been sent to ${email.trim()}. Check your inbox (and spam folder).`);
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<View, [string, string]> = {
    signin: ["Welcome back", "Sign in to continue to your ledger."],
    signup: ["Create your account", "Begin keeping your finances with clarity."],
    reset: ["Reset password", "We'll email you a secure link to set a new password."],
  };

  return (
    <div className="min-h-app grid bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#141311] text-[#f1eee6] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Guilloche className="anim-spin-slow absolute -right-40 -top-40 size-[44rem] text-[#d6b46a] opacity-[0.14]" />
        <Guilloche className="absolute -bottom-56 -left-48 size-[36rem] text-[#d6b46a] opacity-[0.08]" />
        <div className="relative flex items-center gap-3">
          <svg viewBox="0 0 48 48" className="size-11" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="#f1eee6" />
            <text x="24" y="29.5" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontWeight="700" fontSize="23" fill="#141311">A</text>
            <rect x="15" y="33.5" width="18" height="1.7" rx=".85" fill="#b8913f" />
            <rect x="15" y="37" width="18" height="1.7" rx=".85" fill="#b8913f" />
          </svg>
          <span className="font-serif text-2xl font-semibold tracking-tight">
            <span className="font-medium italic">My</span> Accounter
          </span>
        </div>

        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6b46a]">Personal Finance Ledger</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Your finances, kept with <span className="italic text-[#d6b46a]">timeless</span> clarity.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#bdb6a8]">
            Track everyday revenue and expenses — or keep the complete accounting equation with capital, liabilities and drawings.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9e978a]">General Mode</p>
              <p className="mt-2 font-serif text-lg">Revenue − Expenses</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9e978a]">Manual Mode</p>
              <p className="mt-2 font-serif text-lg">Assets = Liabilities + Equity</p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#9e978a]">
          {ALL_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: TYPE_META[t].hex }} />
              {TYPE_META[t].label}
            </span>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <Guilloche className="pointer-events-none absolute -right-32 -top-32 size-[26rem] text-ink opacity-[0.045] lg:hidden" />
        <div className="anim-fade-up relative w-full max-w-[26rem]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-11" />
            <Wordmark className="text-2xl" />
          </div>

          {view === "reset" && (
            <button type="button" onClick={() => go("signin")} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
              <ArrowLeft className="size-4" /> Back to sign in
            </button>
          )}

          <h2 className="font-serif text-[2.1rem] font-semibold leading-tight tracking-tight text-ink">{titles[view][0]}</h2>
          <p className="mt-2 text-[0.95rem] text-muted">{titles[view][1]}</p>
          <div className="hairline-gold mt-7 opacity-70" />

          <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
            {view === "signup" && (
              <Field label="Full name" htmlFor="auth-name">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <Input id="auth-name" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Jane Doe" />
                </div>
              </Field>
            )}
            <Field label="Email" htmlFor="auth-email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input id="auth-email" type="email" inputMode="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
              </div>
            </Field>
            {view !== "reset" && (
              <Field
                label={
                  <span className="flex items-center justify-between">
                    Password
                    {view === "signin" && (
                      <button type="button" onClick={() => go("reset")} className="text-[0.72rem] font-semibold normal-case tracking-normal text-accent-ink hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </span>
                }
                htmlFor="auth-password"
              >
                <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={view === "signup" ? "new-password" : "current-password"} />
              </Field>
            )}
            {view === "signup" && (
              <Field label="Confirm password" htmlFor="auth-confirm">
                <PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </Field>
            )}

            {error && (
              <div role="alert" className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--t-expenses-soft)", background: "var(--t-expenses-soft)", color: "var(--t-expenses-ink)" }}>
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="flex gap-2.5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--t-revenue-soft)", background: "var(--t-revenue-soft)", color: "var(--t-revenue-ink)" }}>
                <MailCheck className="mt-0.5 size-4 shrink-0" />
                {notice}
              </div>
            )}

            <Button type="submit" size="lg" block loading={busy} iconRight={busy ? undefined : ArrowRight}>
              {view === "signin" ? "Sign in" : view === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          {view !== "reset" && (
            <p className="mt-7 text-center text-sm text-muted">
              {view === "signin" ? "New to My Accounter?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => go(view === "signin" ? "signup" : "signin")} className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                {view === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}

          <div className="mt-8 flex items-center gap-4 text-xs text-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" onClick={continueAsGuest} className="mt-5 w-full rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink">
            Continue as guest <span className="text-faint">— data stays on this device</span>
          </button>

          <p className="mt-10 text-center text-xs text-faint">Secured by Firebase Authentication · © {new Date().getFullYear()} My Accounter</p>
        </div>
      </main>
    </div>
  );
}
