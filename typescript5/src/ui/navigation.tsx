/** Where the user is: which browser view, and which object the inspector shows, kept in the address bar so that the
 * browser's history is the inspector's (FEA-005: navigate to that object and push browsing history). Inspecting an
 * object pushes an entry; switching views and closing the inspector replace the current one. */

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

export function parse(hash: string): Place {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const view = (VIEWS as readonly string[]).includes(path) ? path as View : "objects";
  const params = new URLSearchParams(query);
  const key = params.get("inspect");
  return { view, inspect: key === null ? undefined : { key, schema: params.get("schema") ?? undefined } };
}

export function format(place: Place): string {
  const params = new URLSearchParams();
  if (place.inspect !== undefined) {
    params.set("inspect", place.inspect.key);
    if (place.inspect.schema !== undefined) params.set("schema", place.inspect.schema);
  }
  const query = params.toString();
  return `#/${place.view}${query === "" ? "" : `?${query}`}`;
}

interface Navigation {
  readonly place: Place;
  /** FEA-005's gesture: show `target` in the inspector, pushing a history entry. */
  readonly inspect: (target: Target) => void;
  readonly show: (view: View) => void;
  readonly close: () => void;
}

const Context = createContext<Navigation | null>(null);

export function NavigationProvider({ children }: { readonly children: ReactNode }) {
  const [place, setPlace] = useState<Place>(() => parse(window.location.hash));
  useEffect(() => {
    const changed = () => setPlace(parse(window.location.hash));
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, []);
  const go = useCallback((next: Place, push: boolean) => {
    const url = format(next);
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    setPlace(next);
  }, []);
  const inspect = useCallback((target: Target) => {
    const current = parse(window.location.hash);
    go({ ...current, inspect: target }, current.inspect?.key !== target.key);
  }, [go]);
  const show = useCallback((view: View) => go({ ...parse(window.location.hash), view }, false), [go]);
  const close = useCallback(() => go({ ...parse(window.location.hash), inspect: undefined }, false), [go]);
  return <Context.Provider value={{ place, inspect, show, close }}>{children}</Context.Provider>;
}

export function useNavigation(): Navigation {
  const found = useContext(Context);
  if (found === null) throw new Error("useNavigation outside NavigationProvider");
  return found;
}
