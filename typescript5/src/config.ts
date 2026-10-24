/** Where the views come from (README.md, Running it): the golden corpus, served by a fetch of our own (the default),
 * or a live mbse-rest server, set with `MBSE_REST_URL` when the dev server starts. In development a live server is
 * reached through the dev server's proxy at `/rest`, so that the browser sees one origin; a build calls it directly. */

import { Client } from "@mbse/rest/Services/Rest/Client";
import { corpusFetch } from "./data/corpus.js";
import { Service } from "./data/views.js";

export type Source = "corpus" | "live";

export interface Config {
  readonly source: Source;
  /** The service's base URL, as the client prefixes each path with it. */
  readonly base: string;
}

export function configured(): Config {
  if (import.meta.env.MBSE_SOURCE !== "live") return { source: "corpus", base: "http://corpus" };
  return { source: "live", base: import.meta.env.DEV ? "/rest" : import.meta.env.MBSE_REST_URL };
}

/** The service a configuration reaches. */
export function serviceFor(config: Config): Service {
  return new Service(config.source === "corpus" ? new Client(config.base, corpusFetch) : new Client(config.base));
}
