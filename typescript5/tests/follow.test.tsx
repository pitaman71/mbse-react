/** The follow ([CAP-315: every read within a transaction or through a follow](mbse:mbse-basis/docs/capabilities/CAP-315.md)): a view kept outlives the transaction that read it, and is
 * stale from then on, so each is kept only until the service's change feed gives a transaction the service committed;
 * then every view shown is read again, and re-rendered. The feed is mbse-rest's `Remote` over a transport of the test's,
 * which answers `GET /changes` as mbse-rest's service does; the views are the golden corpus', a title renamed in them
 * once the test has "committed". */

import { Client, Gone } from "@mbse/rest/Services/Rest/Client";
import { Remote, type Reply, type Transport } from "@mbse/rest/Services/Rest/Store";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { corpusFetch } from "../src/data/corpus.js";
import { Service } from "../src/data/views.js";
import { App } from "../src/ui/App.js";

const BEFORE = "Install the schemas";
const AFTER = "Install the schemas, again";

/** A service's change feed, as `GET /changes` serves it: each transaction committed, a one-transaction journal, by its
 * id. The UI reads no more of a transaction than that the follow gave it, so each is its id alone here. */
class Feed {
  readonly committed: { id: string }[] = [];
  readonly asked: string[] = [];
  /** How the next request is answered, where not as the feed. */
  next: "gone" | "down" | undefined = undefined;
  made = 0;

  readonly transport: Transport = (method, path): Reply => {
    this.asked.push(`${method} ${path}`);
    const next = this.next;
    this.next = undefined;
    if (next === "down") throw new Error("unreachable");
    if (next === "gone") return { status: 410, body: '{"error": "a feed this service never gave"}' };
    const url = new URL(path, "http://feed");
    const after = url.searchParams.get("after");
    const from = after === null ? 0 : this.committed.findIndex((t) => t.id === after) + 1;
    const journal = url.searchParams.get("feed") === null ? [] : this.committed.slice(from);
    return { status: 200, body: globalThis.JSON.stringify({ feed: "test", head: this.committed.at(-1)?.id ?? null,
      journal }) };
  };

  /** A `Remote` over it, as the UI's `Feed` makes one. */
  remote = (): Remote => {
    this.made += 1;
    return new Remote(this.transport);
  };

  commit(): void {
    this.committed.push({ id: `t${this.committed.length + 1}` });
  }
}

/** The corpus, its views' requests counted, and the title renamed once `renamed` is set. */
function corpus() {
  const state = { renamed: false, views: 0 };
  const fetch = async (input: string, init?: RequestInit): Promise<Response> => {
    if (new URL(input, "http://corpus").pathname.startsWith("/views/")) state.views += 1;
    const found = await corpusFetch(input, init);
    const text = await found.text();
    return new Response(state.renamed ? text.replaceAll(`"${BEFORE}"`, `"${AFTER}"`) : text,
      { status: found.status, headers: found.headers });
  };
  return { state, client: new Client("http://corpus", fetch) };
}

describe("the service's follow", () => {
  test("begins before the schemas are read, so that no view is older than the feed's head", async () => {
    const feed = new Feed();
    const service = new Service(corpus().client, feed.remote);
    await service.schemas();
    expect(feed.asked).toEqual(["GET /changes"]);
    expect(feed.made).toBe(1);
  });

  test("keeps each view until the feed gives a transaction; then drops every one, and says so once", async () => {
    const feed = new Feed();
    const { state, client } = corpus();
    const service = new Service(client, feed.remote);
    const told: number[] = [];
    service.subscribe(() => told.push(service.version));
    await service.chips("work.Task");
    expect(service.poll()).toBe(0);
    await service.chips("work.Task");
    expect(state.views).toBe(1); // kept
    feed.commit();
    feed.commit();
    expect(service.poll()).toBe(2);
    expect(told).toEqual([1]);
    state.renamed = true;
    expect((await service.chips("work.Task")).map((c) => c.label)).toEqual([AFTER, "Seed the demo"]);
    expect(state.views).toBe(2); // read again
    expect(service.poll()).toBe(0);
  });

  test("a follow that could not begin begins on a poll, every view read before it dropped", async () => {
    const feed = new Feed();
    const { state, client } = corpus();
    const service = new Service(client, feed.remote);
    feed.next = "down";
    await service.chips("work.Task");
    expect(feed.made).toBe(1);
    expect(service.poll()).toBe(1);
    expect(feed.made).toBe(2);
    await service.chips("work.Task");
    expect(state.views).toBe(2);
    expect(service.poll()).toBe(0);
  });

  test("a feed that cannot be read is read again on the next poll, nothing dropped", async () => {
    const feed = new Feed();
    const { state, client } = corpus();
    const service = new Service(client, feed.remote);
    await service.chips("work.Task");
    feed.next = "down";
    expect(service.poll()).toBe(0);
    expect(service.followError).toBeInstanceOf(Error);
    feed.commit();
    expect(service.poll()).toBe(1);
    expect(service.followError).toBeUndefined();
    await service.chips("work.Task");
    expect(state.views).toBe(2);
  });

  test("a feed gone (410) is followed again from its head, every view dropped, as what was missed is not known",
    async () => {
      const feed = new Feed();
      const { state, client } = corpus();
      const service = new Service(client, feed.remote);
      await service.chips("work.Task");
      feed.next = "gone";
      expect(service.poll()).toBe(1);
      expect(service.followError).toBeInstanceOf(Gone);
      expect(feed.made).toBe(2); // followed again at once: a new Remote, from the head
      await service.chips("work.Task");
      expect(state.views).toBe(2);
      expect(service.poll()).toBe(0);
      feed.commit();
      expect(service.poll()).toBe(1);
    });

  test("none without a feed: the corpus, which no one writes", async () => {
    const service = new Service(corpus().client);
    await service.chips("work.Task");
    expect(service.poll()).toBe(0);
    expect(service.version).toBe(0);
  });
});

describe("the UI re-rendered on the follow's journals", () => {
  beforeEach(() => window.history.replaceState(null, "", "#/objects"));

  test("a browser's chips and the inspector's detail, read again, what was shown kept until they arrive", async () => {
    const feed = new Feed();
    const { state, client } = corpus();
    const service = new Service(client, feed.remote);
    render(<App service={service} source="test" />);
    const tasks = await screen.findByRole("region", { name: "work.Tasks" });
    await userEvent.click(await within(tasks).findByText(BEFORE));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    await within(inspector).findByRole("heading", { level: 2, name: BEFORE });
    state.renamed = true;
    feed.commit();
    act(() => { service.poll(); });
    expect(within(tasks).queryByText("Loading…")).toBeNull(); // what was shown stays until the views arrive
    expect(await within(tasks).findByText(AFTER)).toBeInTheDocument();
    expect(await within(inspector).findByRole("heading", { level: 2, name: AFTER })).toBeInTheDocument();
    await waitFor(() => expect(within(tasks).queryByText(BEFORE)).toBeNull());
  });

  test("a save's detail is shown until a detail read after the follow gives what the service committed", async () => {
    const feed = new Feed();
    const { state, client } = corpus();
    const service = new Service(client, feed.remote);
    render(<App service={service} source="test" />);
    await userEvent.click(await screen.findByText(BEFORE));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    await within(inspector).findByRole("heading", { level: 2, name: BEFORE });
    await userEvent.click(within(inspector).getByRole("button", { name: "Edit" }));
    const form = within(inspector).getByRole("form", { name: "edit" });
    fireEvent.change(within(form).getByRole("textbox", { name: "title" }), { target: { value: "Install the **schemas**" } });
    fireEvent.change(within(form).getByRole("textbox", { name: "description" }),
      { target: { value: "Define them in a *module-scope* `install`." } });
    await userEvent.click(within(inspector).getByRole("button", { name: "Save" }));
    const saved = await within(inspector).findByRole("heading", { level: 2, name: BEFORE });
    expect(saved.querySelector("strong")).toHaveTextContent("schemas"); // what the save gave back
    act(() => { service.poll(); }); // nothing committed yet: still what the save gave back
    expect(within(inspector).getByRole("heading", { level: 2 }).querySelector("strong")).not.toBeNull();
    state.renamed = true; // the service, as the follow then gives it
    feed.commit();
    act(() => { service.poll(); });
    expect(await within(inspector).findByRole("heading", { level: 2, name: AFTER })).toBeInTheDocument();
  });
});
