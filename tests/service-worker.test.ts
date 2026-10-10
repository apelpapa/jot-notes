import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(cacheControl = "") {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const cache = { put: vi.fn().mockResolvedValue(undefined), addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue(["other-app", "jot-notes-shell-v2", "jot-notes-shell-v4"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn().mockResolvedValue(new Response("asset", { headers: { "Cache-Control": cacheControl } }));
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://notes.test" }, clients: { claim: vi.fn() }, skipWaiting: vi.fn(),
      addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) => listeners.set(name, listener) },
    caches, fetch, URL, Response,
  });
  async function request(url: string, authorization = false) {
    const responses: Promise<unknown>[] = [];
    const waits: Promise<unknown>[] = [];
    listeners.get("fetch")!({
      request: { method: "GET", mode: "cors", url, headers: new Headers(authorization ? { Authorization: "Bearer private" } : {}) },
      respondWith: (response: Promise<unknown>) => responses.push(response),
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(responses); await Promise.all(waits);
    return responses.length;
  }
  return { request, cache, caches, fetch, listeners };
}
describe("service worker caching boundaries", () => {
  it.each([
    "https://notes.test/api/notes", "https://notes.test/api",
    "https://project.supabase.co/rest/v1/notes",
    "https://notes.test/account/export", "https://notes.test/assets/app.js?token=secret",
  ])("never intercepts API or non-static requests", async (url) => {
    const w = worker(); expect(await w.request(url)).toBe(0); expect(w.cache.put).not.toHaveBeenCalled();
  });
  it("never caches an authorized request, even for an asset", async () => {
    const w = worker(); expect(await w.request("https://notes.test/assets/app.js", true)).toBe(0);
  });
  it("caches a public static asset", async () => {
    const w = worker(); expect(await w.request("https://notes.test/assets/app.js")).toBe(1);
    expect(w.cache.put).toHaveBeenCalledOnce();
  });
  it.each(["private", "no-store", "public, no-store"])("honors private response cache controls", async (control) => {
    const w = worker(control); await w.request("https://notes.test/assets/app.js");
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it("still serves the network response when browser caching is unavailable", async () => {
    const w = worker(); w.caches.open.mockRejectedValue(new Error("Storage unavailable"));
    expect(await w.request("https://notes.test/assets/app.js")).toBe(1);
    expect(w.fetch).toHaveBeenCalledOnce();
  });
  it("cleans only obsolete Jot Notes caches", async () => {
    const w = worker(); let pending!: Promise<unknown>;
    w.listeners.get("activate")!({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
    expect(w.caches.delete.mock.calls).toEqual([["jot-notes-shell-v2"]]);
  });
});
