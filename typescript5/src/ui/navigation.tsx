/** Where the user is: which browser view, kept in the address bar, and which object the inspector shows, kept in
 * neither the browser's history nor one of the inspector's own (FEA-005): inspecting an object replaces what the
 * inspector shows, and closing it clears it. Switching views replaces the address bar's entry. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const VIEWS = ["schemas", "objects", "relations"] as const;
export type View = (typeof VIEWS)[number];

/** An object, by its reference's key (`Views.keyOf`, its JSON), and its schema, where the UI knows it. */
export interface Bound {
  readonly key: string;
  readonly schema?: string | undefined;
}

/** CAP-023: what anchors a relation inspector besides its object: a relation that holds the object, the link the
 * object fills in it, and bindings for the relation's other links and property values on it, which define the
 * sibling context. */
export interface RelationAnchor {
  readonly relation: string;
  readonly link: string;
  readonly links: Readonly<Record<string, Bound>>;
  readonly properties: Readonly<Record<string, unknown>>;
}

/** An object to inspect: a single object inspector's (CAP-017), anchored by its schema and ID (its reference); or,
 * with an anchor, a relation inspector's (CAP-023). */
export interface Target extends Bound {
  readonly anchor?: RelationAnchor | undefined;
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

interface Navigation {
  readonly place: Place;
  /** FEA-005's gesture: show `target` in the inspector, in place of what it shows. */
  readonly inspect: (target: Target) => void;
  readonly show: (view: View) => void;
  readonly close: () => void;
}

const Context = createContext<Navigation | null>(null);

export function NavigationProvider({ children }: { readonly children: ReactNode }) {
  const [view, setView] = useState<View>(() => parse(window.location.hash));
  const [inspected, setInspected] = useState<Target | undefined>(undefined);
  useEffect(() => {
    const changed = () => setView(parse(window.location.hash));
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, []);
  const inspect = useCallback((target: Target) => setInspected(target), []);
  const show = useCallback((next: View) => {
    window.history.replaceState(window.history.state, "", format(next));
    setView(next);
  }, []);
  const close = useCallback(() => setInspected(undefined), []);
  const place = { view, inspect: inspected };
  return <Context.Provider value={{ place, inspect, show, close }}>{children}</Context.Provider>;
}

export function useNavigation(): Navigation {
  const found = useContext(Context);
  if (found === null) throw new Error("useNavigation outside NavigationProvider");
  return found;
}
