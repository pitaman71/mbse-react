/** The service the views read, given once at the top of the tree. */

import { createContext, useContext } from "react";
import type { Service } from "../data/views.js";

export const ServiceContext = createContext<Service | null>(null);

export function useService(): Service {
  const found = useContext(ServiceContext);
  if (found === null) throw new Error("useService outside ServiceContext");
  return found;
}
