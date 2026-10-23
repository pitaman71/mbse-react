/** A React UI for any mbse-schemas app (VISUALIZATION.md, FEA-004 and FEA-005). */

import { Builders } from "@mbse/schemas/Framework";

/** A store of the app's schemas, read from mbse-rest (VISUALIZATION.md, CAP-003). */
export function newStore(): unknown {
  return new Builders.Store();
}
