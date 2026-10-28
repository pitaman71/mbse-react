/** A React UI for any mbse-schemas app (mbse-basis [FEA-004: index site browser views](../../../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../../../mbse-basis/docs/features/FEA-005.md)), reading logical views through
 * mbse-rest's client, whose calls and view kinds are mbse-rest's docs/CONTRACT.md. */

import { Client, newStore, schemaNames, ServiceError, Views } from "@mbse/rest/Services/Rest/Client";

/** The client of mbse-rest, a store for it (its schemas read with `Client.loadSchemas`, [CAP-002: named schema list](../../../mbse-basis/docs/capabilities/CAP-002.md), and named by
 * `schemaNames`), and the view kinds. */
export { Client, newStore, schemaNames, ServiceError, Views };

export { App } from "./ui/App.js";
export { Service, type ObjectView, type EntryView, type DetailView, type AdjacentView } from "./data/views.js";
export * as Schemas from "./data/schemas.js";
export { corpusFetch } from "./data/corpus.js";
