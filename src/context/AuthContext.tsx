import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
  isGuest: boolean;
}

interface AuthValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  reauthenticate: (password: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  reload: () => Promise<void>;
}

const GUEST_KEY = "myaccounter:guest";
const AuthCtx = createContext<AuthValue | null>(null);

const toAppUser = (u: User): AppUser => ({
  uid: u.uid,
  email: u.email,
  displayName: u.displayName,
  emailVerified: u.emailVerified,
  createdAt: u.metadata.creationTime ?? null,
  lastSignIn: u.metadata.lastSignInTime ?? null,
  isGuest: false,
});

const GUEST_USER: AppUser = {
  uid: "guest",
  email: null,
  displayName: "Guest",
  emailVerified: false,
  createdAt: null,
  lastSignIn: null,
  isGuest: true,
};

export function authMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/missing-email": "Please enter your email address.",
    "auth/missing-password": "Please enter your password.",
    "auth/user-not-found": "No account was found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-login-credentials": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error — check your connection and try again.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled for this Firebase project.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/requires-recent-login": "For security, please sign in again and retry.",
    "auth/unauthorized-domain": "This domain is not authorised in Firebase Authentication settings.",
    "auth/user-mismatch": "The credentials do not match the signed-in account.",
  };
  if (map[code]) return map[code];
  if (err instanceof Error) return err.message.replace(/^Firebase:\s*/i, "").replace(/\s*\(auth\/[^)]+\)\.?/, "") || "Something went wrong.";
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(() => {
    try {
      return localStorage.getItem(GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let settled = false;
    const safety = setTimeout(() => {
      if (!settled) setLoading(false);
    }, 9000);
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        settled = true;
        setFbUser(u);
        if (u) {
          try {
            localStorage.removeItem(GUEST_KEY);
          } catch {
            /* ignore */
          }
          setGuest(false);
        }
        setLoading(false);
      },
      () => {
        settled = true;
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(safety);
      unsub();
    };
  }, []);

  const user = useMemo<AppUser | null>(() => {
    void version;
    if (fbUser) return toAppUser(fbUser);
    return guest ? GUEST_USER : null;
  }, [fbUser, guest, version]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
      setVersion((v) => v + 1);
    }
    sendEmailVerification(cred.user).catch(() => undefined);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    setGuest(false);
    if (auth.currentUser) await signOut(auth);
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {
      /* ignore */
    }
    setGuest(true);
  }, []);

  const reauthenticate = useCallback(async (password: string) => {
    const u = auth.currentUser;
    if (!u || !u.email) throw new Error("No signed-in account to verify.");
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      await reauthenticate(current);
      if (!auth.currentUser) throw new Error("Not signed in.");
      await updatePassword(auth.currentUser, next);
    },
    [reauthenticate],
  );

  const updateName = useCallback(async (name: string) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name.trim() });
    setVersion((v) => v + 1);
  }, []);

  const sendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const reload = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setFbUser(auth.currentUser);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, signIn, signUp, resetPassword, logout, continueAsGuest, reauthenticate, changePassword, updateName, sendVerification, reload }),
    [user, loading, signIn, signUp, resetPassword, logout, continueAsGuest, reauthenticate, changePassword, updateName, sendVerification, reload],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
