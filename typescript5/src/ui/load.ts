/** A promise's state as React renders it: loading, its value, or its error. */

import { useEffect, useState } from "react";

export type Loaded<T> =
  | { readonly state: "loading" }
  | { readonly state: "done"; readonly value: T }
  | { readonly state: "error"; readonly error: Error };

/** Runs `load` whenever `deps` change, and gives its state; a stale result is dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): Loaded<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>({ state: "loading" });
  useEffect(() => {
    let live = true;
    setLoaded({ state: "loading" });
    load().then(
      (value) => { if (live) setLoaded({ state: "done", value }); },
      (error: unknown) => { if (live) setLoaded({ state: "error", error: error instanceof Error ? error : new Error(String(error)) }); },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return loaded;
}
