/** Where the user is: which browser view, kept in the address bar, and which object the inspector shows, kept in the
 * inspector's own history, never the browser's (FEA-005). Inspecting an object pushes onto the inspector's history,
 * dropping what lay ahead of it; its Back and Forward move along it; closing the inspector forgets it. Switching views
 * replaces the address bar's entry. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const VIEWS = ["schemas", "objects", "relations"] as const;
export type View = (typeof VIEWS)[number];

/** An object to inspect: its reference's key (`Views.keyOf`, its JSON) and its schema, where the UI knows it. */
export interface Target {
  readonly key: string;
  readonly schema?: string | undefined;
}

export interface Place {
  readonly view: View;
  readonly inspect?: Target | undefined;
}

/** The view an address bar's hash names, or the objects. */
export function parse(hash: string): View {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  return (VIEWS as readonly string[]).includes(path) ? path as View : "objects";
}

export const format = (view: View): string => `#/${view}`;

/** The inspector's history: the objects inspected, and where in it the inspector is. */
interface History {
  readonly targets: readonly Target[];
  readonly at: number;
}

const EMPTY: History = { targets: [], at: -1 };

interface Navigation {
  readonly place: Place;
  /** FEA-005's gesture: show `target` in the inspector, pushing it onto the inspector's history. */
  readonly inspect: (target: Target) => void;
  readonly show: (view: View) => void;
  readonly close: () => void;
  /** The inspector's Back and Forward, along its own history; undefined where there is nothing to go to. */
  readonly back: (() => void) | undefined;
  readonly forward: (() => void) | undefined;
}

const Context = createContext<Navigation | null>(null);

export function NavigationProvider({ children }: { readonly children: ReactNode }) {
  const [view, setView] = useState<View>(() => parse(window.location.hash));
  const [history, setHistory] = useState<History>(EMPTY);
  useEffect(() => {
    const changed = () => setView(parse(window.location.hash));
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, []);
  const inspect = useCallback((target: Target) => setHistory((h) => h.targets[h.at]?.key === target.key ? h
    : { targets: [...h.targets.slice(0, h.at + 1), target], at: h.at + 1 }), []);
  const show = useCallback((next: View) => {
    window.history.replaceState(window.history.state, "", format(next));
    setView(next);
  }, []);
  const close = useCallback(() => setHistory(EMPTY), []);
  const { targets, at } = history;
  const back = at > 0 ? () => setHistory((h) => ({ ...h, at: Math.max(0, h.at - 1) })) : undefined;
  const forward = at < targets.length - 1
    ? () => setHistory((h) => ({ ...h, at: Math.min(h.targets.length - 1, h.at + 1) })) : undefined;
  const place = { view, inspect: targets[at] };
  return <Context.Provider value={{ place, inspect, show, close, back, forward }}>{children}</Context.Provider>;
}

export function useNavigation(): Navigation {
  const found = useContext(Context);
  if (found === null) throw new Error("useNavigation outside NavigationProvider");
  return found;
}
