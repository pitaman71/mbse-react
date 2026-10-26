/** The source: the corpus by default; a live server's calls go through the dev server's proxy at `/rest`. */

import { Client } from "@mbse/rest/Services/Rest/Client";
import { describe, expect, test } from "vitest";
import { configured, tabSession } from "../src/config.js";
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


describe("the tab's session (CAP-015)", () => {
  test("one id for the tab's life, the browser's locale, and its kind of device", () => {
    const first = tabSession();
    expect(first.id).toMatch(/^tab-/);
    expect(tabSession().id).toBe(first.id);
    expect(first.locale).not.toBe("");
    expect(["touch", "desktop"]).toContain(first.device);
  });
});
