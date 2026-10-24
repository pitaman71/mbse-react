/** The source: the corpus by default; a live server's calls go through the dev server's proxy at `/rest`. */

import { Client } from "@mbse/rest/Services/Rest/Client";
import { expect, test } from "vitest";
import { configured } from "../src/config.js";
import { corpusFetch } from "../src/data/corpus.js";
import { Service } from "../src/data/views.js";

test("the corpus is the default source", () => {
  expect(configured().source).toBe("corpus");
});

test("a live base prefixes every call, as the proxy at /rest expects", async () => {
  const asked: string[] = [];
  const proxy = (input: string, init?: RequestInit): Promise<Response> => {
    asked.push(input);
    return corpusFetch(`http://corpus${input.replace(/^\/rest/, "")}`, init);
  };
  const service = new Service(new Client("/rest", proxy));
  expect((await service.chips("work.Task")).length).toBe(2);
  expect(asked).toEqual(["/rest/schemas", "/rest/views/chip"]);
});
