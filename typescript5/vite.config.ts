/** The app's build and test configuration (Vite and Vitest).
 *
 * Its source is the golden corpus by default; `MBSE_REST_URL=http://localhost:8000 npm run dev` points it at a live
 * mbse-rest server instead, through the dev server's proxy at `/rest`, so that the browser sees one origin. */

import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const workspace = fileURLToPath(new URL("../..", import.meta.url));
const live = process.env.MBSE_REST_URL;

export default defineConfig({
  plugins: [react()],
  // The siblings are linked into node_modules (`file:` dependencies): resolving through the links, as Node does not
  // by default, lets the siblings' sources find their dependencies (`@mbse/schemas`, `yaml`) here.
  resolve: { preserveSymlinks: true },
  define: {
    "import.meta.env.MBSE_SOURCE": JSON.stringify(live === undefined ? "corpus" : "live"),
    "import.meta.env.MBSE_REST_URL": JSON.stringify(live ?? ""),
  },
  server: {
    fs: { allow: [workspace] }, // the corpus is mbse-rest's, beside this repository
    proxy: live === undefined ? undefined : {
      "/rest": { target: live, changeOrigin: true, rewrite: (path) => path.replace(/^\/rest/, "") },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
