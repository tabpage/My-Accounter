import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { get, ref, set } from "firebase/database";
import { getDb } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import {
  ALL_TYPES,
  type AppData,
  type Category,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  type Entry,
  type EntryInput,
  MODE_TYPES,
  type Settings,
} from "@/lib/constants";
import { sortEntries } from "@/lib/calc";
import { applyAppearance, buildAppearance, formatMoney, type MoneyOptions, uid } from "@/lib/utils";

export type CloudStatus = "off" | "guest" | "syncing" | "synced" | "error" | "denied";
export interface CloudState {
  status: CloudStatus;
  lastSync: number | null;
  message?: string;
}

interface DataValue {
  data: AppData;
  entries: Entry[];
  modeEntries: Entry[];
  categories: Category[];
  categoryMap: Map<string, Category>;
  settings: Settings;
  addEntry: (input: EntryInput) => Entry;
  updateEntry: (id: string, patch: Partial<EntryInput>) => void;
  deleteEntry: (id: string) => void;
  importEntries: (list: Entry[], newCategories: Category[], replace: boolean) => number;
  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  importCategories: (list: Category[], replace: boolean) => number;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  money: (n: number, opts?: MoneyOptions) => string;
  cloud: CloudState;
  syncNow: () => Promise<void>;
  storageBytes: number;
}

const DataCtx = createContext<DataValue | null>(null);
const storageKey = (id: string) => `myaccounter:data:${id}`;
const cloudPath = (id: string) => `myAccounter/users/${id}`;

export function createDefaultData(): AppData {
  return {
    version: 1,
    entries: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_SETTINGS, currency: { ...DEFAULT_SETTINGS.currency } },
    updatedAt: 0,
  };
}

function validEntry(e: unknown): e is Entry {
  const x = e as Entry;
  return !!x && typeof x.id === "string" && typeof x.amount === "number" && isFinite(x.amount) && ALL_TYPES.includes(x.type) && typeof x.date === "string";
}
function validCategory(c: unknown): c is Category {
  const x = c as Category;
  return !!x && typeof x.id === "string" && typeof x.name === "string";
}

export function sanitizeData(raw: unknown): AppData {
  const d = createDefaultData();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    entries: Array.isArray(r.entries)
      ? r.entries.filter(validEntry).map((e) => ({
          ...e,
          description: String(e.description ?? ""),
          categoryId: String(e.categoryId ?? ""),
          time: typeof e.time === "string" ? e.time : "12:00",
          createdAt: Number(e.createdAt) || Date.now(),
          updatedAt: Number(e.updatedAt) || Date.now(),
        }))
      : [],
    categories: Array.isArray(r.categories) ? r.categories.filter(validCategory).map((c) => ({ ...c, type: c.type ?? "any", color: c.color || "#78716C" })) : d.categories,
    settings: { ...d.settings, ...(r.settings ?? {}), currency: { ...d.settings.currency, ...(r.settings?.currency ?? {}) } },
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

function loadLocal(id: string): AppData | null {
  try {
    const s = localStorage.getItem(storageKey(id));
    return s ? sanitizeData(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("The cloud did not respond in time (offline or database unavailable).")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function pullCloud(id: string): Promise<{ updatedAt: number; data: AppData } | null> {
  const snap = await withTimeout(get(ref(getDb(), cloudPath(id))), 12000);
  if (!snap.exists()) return null;
  const v = snap.val() as { updatedAt?: number; payload?: string } | null;
  if (!v || typeof v.payload !== "string") return null;
  return { updatedAt: Number(v.updatedAt) || 0, data: sanitizeData(JSON.parse(v.payload)) };
}

async function pushCloud(id: string, data: AppData): Promise<void> {
  await withTimeout(set(ref(getDb(), cloudPath(id)), { app: "My Accounter", v: 1, updatedAt: data.updatedAt, payload: JSON.stringify(data) }), 15000);
}

function cloudError(e: unknown): CloudState {
  const msg = String((e as Error)?.message ?? e);
  if (/permission/i.test(msg)) return { status: "denied", lastSync: null, message: "Permission denied by your Firebase Realtime Database rules." };
  return { status: "error", lastSync: null, message: msg };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid ?? "guest";
  const isGuest = !user || user.isGuest;

  const [data, setData] = useState<AppData>(() => loadLocal(userId) ?? createDefaultData());
  const [cloud, setCloud] = useState<CloudState>({ status: isGuest ? "guest" : "off", lastSync: null });
  const [storageBytes, setStorageBytes] = useState(0);

  const dataRef = useRef(data);
  dataRef.current = data;
  const cloudRef = useRef(cloud);
  cloudRef.current = cloud;
  const syncedAt = useRef(0);
  const syncReady = useRef(false);

  /* Pull → compare → push (last write wins) */
  const reconcile = useCallback(async () => {
    if (isGuest) return;
    setCloud((c) => ({ ...c, status: "syncing", message: undefined }));
    try {
      const local = dataRef.current;
      const remote = await pullCloud(userId);
      if (remote && remote.updatedAt > local.updatedAt) {
        syncedAt.current = remote.updatedAt;
        setData(remote.data);
      } else if (local.updatedAt > 0 && (!remote || local.updatedAt > remote.updatedAt)) {
        await pushCloud(userId, local);
        syncedAt.current = local.updatedAt;
      } else {
        syncedAt.current = Math.max(local.updatedAt, remote?.updatedAt ?? 0);
      }
      syncReady.current = true;
      setCloud({ status: "synced", lastSync: Date.now() });
    } catch (e) {
      syncReady.current = false;
      setCloud(cloudError(e));
    }
  }, [isGuest, userId]);

  const cloudEnabled = !isGuest && data.settings.cloudSync;

  useEffect(() => {
    if (!cloudEnabled) {
      syncReady.current = false;
      setCloud({ status: isGuest ? "guest" : "off", lastSync: null });
      return;
    }
    void reconcile();
    const onOnline = () => {
      if (cloudRef.current.status === "error") void reconcile();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [cloudEnabled, isGuest, reconcile]);

  /* Persist locally + debounced cloud push */
  useEffect(() => {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(storageKey(userId), json);
      setStorageBytes(json.length);
    } catch {
      /* quota exceeded or storage unavailable */
    }
    if (!cloudEnabled || !syncReady.current || cloudRef.current.status === "denied") return;
    if (data.updatedAt <= syncedAt.current) return;
    const t = setTimeout(async () => {
      const snapshot = dataRef.current;
      setCloud((c) => ({ ...c, status: "syncing" }));
      try {
        await pushCloud(userId, snapshot);
        syncedAt.current = snapshot.updatedAt;
        setCloud({ status: "synced", lastSync: Date.now() });
      } catch (e) {
        const st = cloudError(e);
        if (st.status === "denied") syncReady.current = false;
        setCloud(st);
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [data, userId, cloudEnabled]);

  /* Theme + accent */
  const { theme, accent, customAccent } = data.settings;
  useEffect(() => {
    const appearance = buildAppearance({ theme, accent, customAccent });
    applyAppearance(appearance);
    if (theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance(appearance);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [theme, accent, customAccent]);

  /* Mutations */
  const commit = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => ({ ...fn(prev), updatedAt: Math.max(Date.now(), prev.updatedAt + 1) }));
  }, []);

  const addEntry = useCallback(
    (input: EntryInput) => {
      const now = Date.now();
      const entry: Entry = { ...input, id: uid("e_"), createdAt: now, updatedAt: now };
      commit((d) => ({ ...d, entries: [entry, ...d.entries] }));
      return entry;
    },
    [commit],
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<EntryInput>) =>
      commit((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)) })),
    [commit],
  );

  const deleteEntry = useCallback((id: string) => commit((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })), [commit]);

  const importEntries = useCallback(
    (list: Entry[], newCategories: Category[], replace: boolean) => {
      const current = dataRef.current;
      const sig = (e: Entry) => `${e.date}|${e.time}|${e.type}|${e.amount}|${e.description.toLowerCase()}`;
      const ids = new Set(current.entries.map((e) => e.id));
      const sigs = new Set(current.entries.map(sig));
      const fresh = replace ? list : list.filter((e) => !ids.has(e.id) && !sigs.has(sig(e)));
      commit((d) => {
        const known = new Set(d.categories.map((c) => c.id));
        const categories = [...d.categories, ...newCategories.filter((c) => !known.has(c.id))];
        return { ...d, categories, entries: replace ? fresh : [...d.entries, ...fresh] };
      });
      return fresh.length;
    },
    [commit],
  );

  const addCategory = useCallback(
    (c: Omit<Category, "id">) => {
      const cat: Category = { ...c, name: c.name.trim(), id: uid("c_") };
      commit((d) => ({ ...d, categories: [...d.categories, cat] }));
      return cat;
    },
    [commit],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<Category, "id">>) =>
      commit((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    [commit],
  );

  const deleteCategory = useCallback(
    (id: string) =>
      commit((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        entries: d.entries.map((e) => (e.categoryId === id ? { ...e, categoryId: "" } : e)),
      })),
    [commit],
  );

  const importCategories = useCallback(
    (list: Category[], replace: boolean) => {
      const current = dataRef.current.categories;
      const key = (c: Category) => `${c.name.trim().toLowerCase()}|${c.type}`;
      const keys = new Set(current.map(key));
      const ids = new Set(current.map((c) => c.id));
      const seen = new Set<string>();
      const deduped = list.filter((c) => {
        const k = key(c);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const fresh = replace ? deduped : deduped.filter((c) => !keys.has(key(c))).map((c) => (ids.has(c.id) ? { ...c, id: uid("c_") } : c));
      commit((d) => ({ ...d, categories: replace ? fresh : [...d.categories, ...fresh] }));
      return fresh.length;
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [commit],
  );

  const resetAll = useCallback(() => {
    commit((d) => {
      const fresh = createDefaultData();
      return {
        ...fresh,
        settings: { ...fresh.settings, theme: d.settings.theme, accent: d.settings.accent, customAccent: d.settings.customAccent, cloudSync: d.settings.cloudSync },
      };
    });
  }, [commit]);

  /* Derived */
  const entries = useMemo(() => sortEntries(data.entries), [data.entries]);
  const modeEntries = useMemo(() => {
    const allowed = MODE_TYPES[data.settings.mode];
    return entries.filter((e) => allowed.includes(e.type));
  }, [entries, data.settings.mode]);
  const categoryMap = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const currency = data.settings.currency;
  const money = useCallback((n: number, opts?: MoneyOptions) => formatMoney(n, currency, opts), [currency]);

  const value = useMemo<DataValue>(
    () => ({
      data,
      entries,
      modeEntries,
      categories: data.categories,
      categoryMap,
      settings: data.settings,
      addEntry,
      updateEntry,
      deleteEntry,
      importEntries,
      addCategory,
      updateCategory,
      deleteCategory,
      importCategories,
      updateSettings,
      resetAll,
      money,
      cloud,
      syncNow: reconcile,
      storageBytes,
    }),
    [data, entries, modeEntries, categoryMap, addEntry, updateEntry, deleteEntry, importEntries, addCategory, updateCategory, deleteCategory, importCategories, updateSettings, resetAll, money, cloud, reconcile, storageBytes],
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
