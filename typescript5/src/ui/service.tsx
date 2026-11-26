/** The service the views read, given once at the top of the tree, and the follow of what it commits. */

import { createContext, useContext, useSyncExternalStore } from "react";
import type { Service } from "../data/views.js";

export const ServiceContext = createContext<Service | null>(null);

export function useService(): Service {
  const found = useContext(ServiceContext);
  if (found === null) throw new Error("useService outside ServiceContext");
  return found;
}

/** The service's `version`: a component that reads a view passes it to `useLoad`, so that it re-renders, the view
 * read again, each time the follow gives what the service committed ([CAP-315: every read within a transaction or through a follow](mbse:mbse-basis/docs/capabilities/CAP-315.md)). */
export function useFollowed(): number {
  const service = useService();
  return useSyncExternalStore(service.subscribe, () => service.version);
}
