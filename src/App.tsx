import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SecurityProvider, useSecurity } from "@/context/SecurityContext";
import { ToastProvider } from "@/context/ToastContext";
import { Layout, NAV, type Route } from "@/components/Layout";
import { LogoMark, Wordmark } from "@/components/ui";
import { AuthPage } from "@/pages/AuthPage";
import { LockScreen } from "@/pages/LockScreen";
import { Dashboard } from "@/pages/Dashboard";
import { Overview } from "@/pages/Overview";
import { EntryPage } from "@/pages/EntryPage";
import { History } from "@/pages/History";
import { SettingsPage } from "@/pages/Settings";

const ROUTES: Route[] = ["dashboard", "overview", "entry", "history", "settings"];

function parseHash(): { route: Route; query: string } {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const route = (ROUTES as string[]).includes(path) ? (path as Route) : "dashboard";
  return { route, query };
}

function useHashRouter() {
  const [state, setState] = useState(parseHash);

  useEffect(() => {
    const onHash = () => {
      setState(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = "#/" + to;
    if (window.location.hash === next) {
      setState(parseHash());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.hash = next;
    }
  }, []);

  const query = useMemo(() => new URLSearchParams(state.query), [state.query]);
  return { route: state.route, query, navigate };
}

function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-app grid place-items-center bg-canvas px-6">
      <div className="anim-fade flex flex-col items-center">
        <LogoMark className="size-16" />
        <Wordmark className="mt-4 text-2xl" />
        <div className="mt-6 h-[2px] w-28 overflow-hidden rounded-full bg-line">
          <div className="h-full w-full animate-pulse rounded-full bg-accent" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Shell() {
  const { locked } = useSecurity();
  const { route, query, navigate } = useHashRouter();

  // Keyboard shortcut: "N" opens a new entry (desktop, TV remotes with keyboards)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || locked) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        navigate("entry");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, locked]);

  useEffect(() => {
    const label = NAV.find((n) => n.route === route)?.label ?? "Dashboard";
    document.title = locked ? "Locked · My Accounter" : `${label} · My Accounter`;
  }, [route, locked]);

  if (locked) return <LockScreen />;

  let page: ReactNode;
  switch (route) {
    case "overview":
      page = <Overview navigate={navigate} />;
      break;
    case "entry":
      page = <EntryPage query={query} navigate={navigate} />;
      break;
    case "history":
      page = <History query={query} navigate={navigate} />;
      break;
    case "settings":
      page = <SettingsPage query={query} />;
      break;
    default:
      page = <Dashboard navigate={navigate} />;
  }

  return (
    <Layout route={route} navigate={navigate}>
      {page}
    </Layout>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <AuthPage />;
  return (
    <DataProvider key={user.uid}>
      <SecurityProvider key={user.uid}>
        <Shell />
      </SecurityProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
