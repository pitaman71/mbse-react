/** mbse-rest's golden corpus (`../mbse-rest/conformance/`) served through a fetch of our own, as mbse-rest's client
 * tests serve it: the UI develops against real requests and responses before a server runs (CONTRACT.md, The golden
 * corpus). A request the corpus holds no case for is answered 599, with an error body that says so. */

import { JSON as J } from "@mbse/schemas/Framework";

const files = import.meta.glob("../../../../mbse-rest/conformance/*.{json,ndjson}", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

const byName = new Map(Object.entries(files).map(([path, text]) => [path.slice(path.lastIndexOf("/") + 1), text]));

const read = (name: string): string => {
  const text = byName.get(name);
  if (text === undefined) throw new Error(`the golden corpus has no file ${name}`);
  return text;
};

/** One case of `cases.json`. */
export interface Case {
  readonly name: string;
  readonly method: string;
  readonly path: string;
  readonly request: string | null;
  readonly status: number;
  readonly content_type: string;
  readonly response: string;
}

export const CASES: readonly Case[] = globalThis.JSON.parse(read("cases.json")) as Case[];

/** The status the corpus fetch answers a request it holds no case for: outside HTTP's, so never mistaken for one. */
export const NO_CASE = 599;

const canonical = (text: string): string => J.dumps(J.loads(text));
const requests = new Map(CASES.filter((c) => c.request !== null).map((c) => [c.name, canonical(read(c.request!))]));

/** A fetch that serves the corpus: the case whose method, path and request body agree. */
export async function corpusFetch(input: string, init?: RequestInit): Promise<Response> {
  const path = new URL(input, "http://corpus").pathname;
  const method = init?.method ?? "GET";
  const body = typeof init?.body === "string" ? canonical(init.body) : null;
  const found = CASES.find((c) => c.method === method && c.path === path
    && (c.request === null ? body === null : body === requests.get(c.name)));
  if (found === undefined) {
    const error = `the golden corpus holds no case for ${method} ${path} with this request`;
    return new Response(globalThis.JSON.stringify({ error }), {
      status: NO_CASE, headers: { "content-type": "application/json" },
    });
  }
  return new Response(read(found.response), { status: found.status, headers: { "content-type": found.content_type } });
}

/** The response text of a case, by its name: for tests. */
export function response(name: string): string {
  const found = CASES.find((c) => c.name === name);
  if (found === undefined) throw new Error(`the golden corpus has no case ${name}`);
  return read(found.response);
}
