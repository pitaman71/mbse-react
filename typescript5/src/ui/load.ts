/** A promise's state as React renders it: loading, its value, or its error. */

import { useEffect, useRef, useState } from "react";

export type Loaded<T> =
  | { readonly state: "loading" }
  | { readonly state: "done"; readonly value: T; readonly at: number }
  | { readonly state: "error"; readonly error: Error };

const same = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

/** Runs `load` whenever `deps` or `refresh` change, and gives its state; a stale result is dropped. A change of
 * `refresh` alone, the follow's `version` (`useFollowed`), reads again what is shown: it stays shown until the new
 * value arrives, and stays where reading it again fails. `at` is the `refresh` a value was read at. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[], refresh = 0): Loaded<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>({ state: "loading" });
  const last = useRef<readonly unknown[] | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const again = last.current !== undefined && same(last.current, deps);
    last.current = deps;
    if (!again) setLoaded({ state: "loading" });
    load().then(
      (value) => { if (live) setLoaded({ state: "done", value, at: refresh }); },
      (error: unknown) => {
        if (!live) return;
        const failed: Loaded<T> = { state: "error", error: error instanceof Error ? error : new Error(String(error)) };
        setLoaded((shown) => again && shown.state === "done" ? shown : failed);
      },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refresh]);
  return loaded;
}
