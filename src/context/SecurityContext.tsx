import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { hashSecret, type HashAlgo, randomSalt, verifySecret } from "@/lib/utils";

interface LockRecord {
  salt: string;
  hash: string;
  algo: HashAlgo;
  autoLock: number; // minutes, 0 = never
  createdAt: number;
}

interface SecurityValue {
  hasPassword: boolean;
  locked: boolean;
  autoLock: number;
  setAt: number | null;
  verify: (pw: string) => Promise<boolean>;
  unlock: (pw: string) => Promise<boolean>;
  setPassword: (pw: string) => Promise<void>;
  removePassword: () => void;
  lockNow: () => void;
  setAutoLock: (minutes: number) => void;
}

const SecurityCtx = createContext<SecurityValue | null>(null);
const lockKey = (id: string) => `myaccounter:lock:${id}`;

function readRecord(id: string): LockRecord | null {
  try {
    const s = localStorage.getItem(lockKey(id));
    if (!s) return null;
    const r = JSON.parse(s) as LockRecord;
    return r && typeof r.hash === "string" && typeof r.salt === "string" ? r : null;
  } catch {
    return null;
  }
}

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const id = user?.uid ?? "guest";
  const [record, setRecord] = useState<LockRecord | null>(() => readRecord(id));
  const [locked, setLocked] = useState<boolean>(() => !!readRecord(id));
  const lastActive = useRef(Date.now());

  const persist = useCallback(
    (r: LockRecord | null) => {
      try {
        if (r) localStorage.setItem(lockKey(id), JSON.stringify(r));
        else localStorage.removeItem(lockKey(id));
      } catch {
        /* ignore */
      }
      setRecord(r);
    },
    [id],
  );

  const verify = useCallback(async (pw: string) => (record ? verifySecret(pw, record.salt, record.hash, record.algo) : true), [record]);

  const unlock = useCallback(
    async (pw: string) => {
      const ok = await verify(pw);
      if (ok) {
        lastActive.current = Date.now();
        setLocked(false);
      }
      return ok;
    },
    [verify],
  );

  const setPassword = useCallback(
    async (pw: string) => {
      const salt = randomSalt();
      const { hash, algo } = await hashSecret(pw, salt);
      persist({ salt, hash, algo, autoLock: record?.autoLock ?? 5, createdAt: Date.now() });
    },
    [persist, record],
  );

  const removePassword = useCallback(() => {
    persist(null);
    setLocked(false);
  }, [persist]);

  const lockNow = useCallback(() => {
    if (record) setLocked(true);
  }, [record]);

  const setAutoLock = useCallback(
    (minutes: number) => {
      if (record) persist({ ...record, autoLock: minutes });
    },
    [persist, record],
  );

  /* Auto-lock after inactivity */
  useEffect(() => {
    if (!record || locked || !record.autoLock) return;
    lastActive.current = Date.now();
    const limit = record.autoLock * 60000;
    const bump = () => {
      lastActive.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const check = () => {
      if (Date.now() - lastActive.current > limit) setLocked(true);
    };
    const iv = window.setInterval(check, 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [record, locked]);

  const value = useMemo<SecurityValue>(
    () => ({
      hasPassword: !!record,
      locked: !!record && locked,
      autoLock: record?.autoLock ?? 5,
      setAt: record?.createdAt ?? null,
      verify,
      unlock,
      setPassword,
      removePassword,
      lockNow,
      setAutoLock,
    }),
    [record, locked, verify, unlock, setPassword, removePassword, lockNow, setAutoLock],
  );

  return <SecurityCtx.Provider value={value}>{children}</SecurityCtx.Provider>;
}

export function useSecurity(): SecurityValue {
  const ctx = useContext(SecurityCtx);
  if (!ctx) throw new Error("useSecurity must be used inside SecurityProvider");
  return ctx;
}
