import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const mock = vi.hoisted(() => ({
  session: null as Session | null,
  listeners: new Set<(event: string, session: Session | null) => void>(),
  mutation: null as Promise<unknown> | null,
  restore: null as Promise<unknown> | null,
  profileFailure: false,
  signals: [] as AbortSignal[],
  signOut: vi.fn(),
  inserted: vi.fn(),
}));
function emit(session: Session | null) {
  mock.session = session;
  for (const listener of mock.listeners) listener(session ? "SIGNED_IN" : "SIGNED_OUT", session);
}
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mock.restore ?? Promise.resolve({ data: { session: mock.session }, error: null }),
      onAuthStateChange: (listener: (event: string, session: Session | null) => void) => {
        mock.listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => mock.listeners.delete(listener) } } };
      },
      signOut: (...args: unknown[]) => {
        mock.signOut(...args);
        mock.session = null;
        for (const listener of mock.listeners) listener("SIGNED_OUT", null);
        return Promise.resolve({ error: null });
      },
    },
    from: (table: string) => {
      const identity = mock.session?.user.id;
      let mutation = false;
      const execute = () => {
        if (mutation) return mock.mutation ?? Promise.resolve({ data: { id: 99, title: "Saved" }, error: null, status: 201 });
        if (table === "users") return Promise.resolve(mock.profileFailure
          ? { data: null, error: { message: "Unavailable" }, status: 503 }
          : { data: { first_name: identity === "A" ? "Alice" : "Bob", email: identity === "A" ? "a@example.test" : "b@example.test", theme_preference: "light" }, error: null, status: 200 });
        return Promise.resolve({ data: [{ id: identity === "A" ? 1 : 2, title: identity === "A" ? "Alice private note" : "Bob private note" }], error: null, status: 200 });
      };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: () => query,
        limit: () => query,
        abortSignal: (signal: AbortSignal) => { mock.signals.push(signal); return query; },
        insert: (value: unknown) => { mutation = true; mock.inserted(value); return query; },
        delete: () => { mutation = true; return query; },
        single: execute,
        maybeSingle: execute,
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => execute().then(resolve, reject),
      };
      return query;
    },
  },
}));
import App from "../src/App";

function session(id: string): Session {
  return {
    access_token: id, refresh_token: id, token_type: "bearer", expires_in: 3600,
    user: { id, email: id === "A" ? "a@example.test" : "b@example.test", aud: "authenticated",
      app_metadata: {}, user_metadata: {}, created_at: "2026-10-10T00:00:00Z" },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  mock.session = session("A");
  mock.listeners.clear(); mock.mutation = null; mock.restore = null;
  mock.profileFailure = false; mock.signals = []; mock.signOut.mockClear(); mock.inserted.mockClear();
});
describe("account identity boundaries", () => {
  it("never shows the previous account's profile when the next account fails to load", async () => {
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText("Alice private note");
    mock.profileFailure = true;
    await act(async () => emit(session("B")));
    await screen.findByText(/Account notes are temporarily unavailable/);
    expect(screen.queryByText("Alice private note")).toBeNull();
    expect(screen.queryByRole("button", { name: "Alice" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "b" }));
    expect(await screen.findByText("b@example.test")).toBeTruthy();
    expect(screen.queryByText("a@example.test")).toBeNull();
  });
  it("discards a delayed private save after another account signs in", async () => {
    const pending = deferred<unknown>();
    mock.mutation = pending.promise;
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText("Alice private note");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Late Alice secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to account" }));
    await waitFor(() => expect(mock.inserted).toHaveBeenCalledOnce());
    const oldSignals = [...mock.signals];
    await act(async () => emit(session("B")));
    await screen.findByText("Bob private note");
    await act(async () => pending.resolve({ data: { id: 99, title: "Late Alice secret" }, error: null, status: 201 }));
    expect(screen.queryByText("Late Alice secret")).toBeNull();
    expect(screen.queryByText("Alice private note")).toBeNull();
    expect(oldSignals.every((signal) => signal.aborted)).toBe(true);
  });
  it("does not sign out the next account when a previous request returns 401", async () => {
    const pending = deferred<unknown>();
    mock.mutation = pending.promise;
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText("Alice private note");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Pending" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to account" }));
    await waitFor(() => expect(mock.inserted).toHaveBeenCalledOnce());
    await act(async () => emit(session("B")));
    await screen.findByText("Bob private note");
    await act(async () => pending.resolve({ data: null, error: { message: "Expired", code: "PGRST301" }, status: 401 }));
    expect(mock.signOut).not.toHaveBeenCalled();
    expect(screen.getByText("Bob private note")).toBeTruthy();
  });
  it("keeps guest notes separate and restores them after sign-out", async () => {
    localStorage.setItem("jot-notes.local-notes.v1", JSON.stringify([{ id: 5, title: "Guest note" }]));
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText("Alice private note");
    await act(async () => emit(null));
    await screen.findByText("Guest note");
    expect(screen.queryByText("Alice private note")).toBeNull();
    await act(async () => emit(session("B")));
    await screen.findByText("Bob private note");
    expect(screen.queryByText("Guest note")).toBeNull();
    expect(mock.inserted).not.toHaveBeenCalled();
  });
  it("ignores stale session restoration after an authentication event", async () => {
    const pending = deferred<unknown>();
    mock.restore = pending.promise;
    render(<StrictMode><App /></StrictMode>);
    await act(async () => emit(session("B")));
    await screen.findByText("Bob private note");
    await act(async () => pending.resolve({ data: { session: session("A") }, error: null }));
    expect(screen.queryByText("Alice private note")).toBeNull();
    expect(screen.getByText("Bob private note")).toBeTruthy();
  });
  it("shows quota errors without clearing the draft", async () => {
    mock.mutation = Promise.resolve({ data: null, error: { message: "Your account has reached 1,000 private notes.", code: "P0001" }, status: 400 });
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText("Alice private note");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to account" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Keep this draft");
  });
});
