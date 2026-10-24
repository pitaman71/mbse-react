/** A React UI for any mbse-schemas app (VISUALIZATION.md, FEA-004 and FEA-005), reading logical views through
 * mbse-rest's client, whose calls and view kinds are mbse-rest's docs/CONTRACT.md. */

import { Client, newStore, schemaNames, ServiceError, Views } from "@mbse/rest/Services/Rest/Client";

/** The client of mbse-rest, a store for it (its schemas read with `Client.loadSchemas`, CAP-002, and named by
 * `schemaNames`), and the view kinds. */
export { Client, newStore, schemaNames, ServiceError, Views };
