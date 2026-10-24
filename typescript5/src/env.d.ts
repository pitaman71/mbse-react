/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the views come from: the golden corpus (the default) or a live mbse-rest server (`MBSE_REST_URL`). */
  readonly MBSE_SOURCE: "corpus" | "live";
  /** The live server's base URL, where `MBSE_SOURCE` is `live`. */
  readonly MBSE_REST_URL: string;
}
