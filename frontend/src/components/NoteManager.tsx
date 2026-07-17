import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import FixedFooter from "./FixedFooter";
import Header, { type NoteView } from "./Header";
import NewNoteCard from "./NewNoteCard";
import NoteCard from "./NoteCard";
import { authenticatedFetch, AuthenticationError } from "../lib/api";

export const apiBase = "/api";

const localNotesKey = "jot-notes.local-notes.v1";
const sessionNotesKey = "jot-notes.session-notes.v1";
const persistenceKey = "jot-notes.persist-local-notes.v1";
const themeKey = "jot-notes.theme.v1";

export interface Note {
  id: number;
  title: string;
  content?: string;
}

export interface NewNote {
  title: string;
  content?: string;
}

export interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  themePreference: string;
  autoSave: boolean;
  avatarUrl?: string;
  email: string;
}

interface NoteManagerProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

type LoadStatus = "idle" | "loading" | "ready" | "unavailable";

function normalizeNote(value: unknown): Note | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "number"
    ? candidate.id
    : typeof candidate.id === "string" && /^\d+$/.test(candidate.id)
      ? Number(candidate.id)
      : Number.NaN;

  if (!Number.isSafeInteger(id) || id < 1) return null;
  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0) return null;
  if (candidate.content !== undefined && candidate.content !== null && typeof candidate.content !== "string") {
    return null;
  }

  return {
    id,
    title: candidate.title.slice(0, 200),
    content: typeof candidate.content === "string" ? candidate.content.slice(0, 20_000) : undefined,
  };
}

function normalizeNotes(values: unknown[]): Note[] {
  return values.flatMap((value) => {
    const note = normalizeNote(value);
    return note ? [note] : [];
  });
}

function readNotes(storage: Storage, key: string): Note[] {
  try {
    const storedValue = storage.getItem(key);
    if (!storedValue) return [];
    const parsed: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];
    return normalizeNotes(parsed);
  } catch (error) {
    console.error("Could not read local notes", error);
    return [];
  }
}

function getInitialPersistence(): boolean {
  try {
    return window.localStorage.getItem(persistenceKey) !== "false";
  } catch {
    return false;
  }
}

function getInitialTheme(): string {
  try {
    const storedTheme = window.localStorage.getItem(themeKey);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // Use the system preference when local storage is unavailable.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialLocalNotes(persist: boolean): Note[] {
  return persist
    ? readNotes(window.localStorage, localNotesKey)
    : readNotes(window.sessionStorage, sessionNotesKey);
}

async function loadUser(accessToken: string): Promise<UserData> {
  const response = await authenticatedFetch(accessToken, `${apiBase}/users`);
  if (response.status === 503) throw new Error("service-unavailable");
  if (!response.ok) throw new Error(`Could not load user (${response.status})`);
  return response.json() as Promise<UserData>;
}

async function loadAccountNotes(accessToken: string): Promise<Note[]> {
  const response = await authenticatedFetch(accessToken, `${apiBase}/notes`);
  if (response.status === 503) throw new Error("service-unavailable");
  if (!response.ok) throw new Error(`Could not load notes (${response.status})`);

  const noteData: unknown = await response.json();
  if (!Array.isArray(noteData)) throw new Error("Invalid notes response");
  return normalizeNotes(noteData);
}

export default function NoteManager({ session, onSignOut }: NoteManagerProps) {
  const [persistLocalNotes, setPersistLocalNotes] = useState(getInitialPersistence);
  const [localNotes, setLocalNotes] = useState<Note[]>(() => getInitialLocalNotes(getInitialPersistence()));
  const [accountNotes, setAccountNotes] = useState<Note[]>([]);
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [accountUser, setAccountUser] = useState<UserData | null>(null);
  const [accountStatus, setAccountStatus] = useState<LoadStatus>("idle");
  const [globalStatus, setGlobalStatus] = useState<LoadStatus>("idle");
  const [currentView, setCurrentView] = useState<NoteView>("my");
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    try {
      const serializedNotes = JSON.stringify(localNotes);
      window.localStorage.setItem(persistenceKey, String(persistLocalNotes));
      if (persistLocalNotes) {
        window.localStorage.setItem(localNotesKey, serializedNotes);
        window.sessionStorage.removeItem(sessionNotesKey);
      } else {
        window.sessionStorage.setItem(sessionNotesKey, serializedNotes);
        window.localStorage.removeItem(localNotesKey);
      }
    } catch (error) {
      console.error("Could not save local notes", error);
    }
  }, [localNotes, persistLocalNotes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(themeKey, theme);
    } catch {
      // The theme still applies for the current session.
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    const accessToken = session.access_token;

    async function loadAccount() {
      setAccountStatus("loading");
      try {
        // Finish provisioning a new profile before asking the notes endpoint
        // to look it up as well.
        const user = await loadUser(accessToken);
        const notes = await loadAccountNotes(accessToken);
        if (!active) return;
        setAccountUser(user);
        setAccountNotes(notes);
        setTheme(user.themePreference || "light");
        setAccountStatus("ready");
      } catch (error) {
        if (!active) return;
        if (error instanceof AuthenticationError) {
          await onSignOut();
          return;
        }
        console.error("Could not load account notes", error);
        setAccountStatus("unavailable");
      }
    }

    void loadAccount();
    return () => { active = false; };
  }, [session, onSignOut]);

  useEffect(() => {
    if (currentView !== "global") return;
    const abortController = new AbortController();

    async function loadGlobalNotes() {
      setGlobalStatus("loading");
      try {
        const response = await fetch(`${apiBase}/notes/global`, { signal: abortController.signal });
        if (!response.ok) throw new Error(`Could not load global notes (${response.status})`);
        const noteData: unknown = await response.json();
        if (!Array.isArray(noteData)) throw new Error("Invalid global notes response");
        setGlobalNotes(normalizeNotes(noteData));
        setGlobalStatus("ready");
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("Could not load Global Notes", error);
        setGlobalStatus("unavailable");
      }
    }

    void loadGlobalNotes();
    return () => abortController.abort();
  }, [currentView]);

  const userData: UserData = session
    ? accountUser ?? {
      id: -1,
      username: "",
      firstName: session.user.email?.split("@")[0] || "Account",
      themePreference: theme,
      autoSave: true,
      email: session.user.email ?? "",
    }
    : {
      id: -1,
      username: "local",
      firstName: "Guest",
      themePreference: theme,
      autoSave: persistLocalNotes,
      email: "",
    };

  const createNote = async (newNote: NewNote): Promise<boolean> => {
    if (!newNote.title) return false;

    if (!session) {
      setLocalNotes((currentNotes) => {
        const highestId = currentNotes.reduce((highest, note) => Math.max(highest, note.id), Date.now());
        return [{ id: highestId + 1, title: newNote.title, content: newNote.content }, ...currentNotes];
      });
      return true;
    }

    try {
      const response = await authenticatedFetch(session.access_token, `${apiBase}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newNote),
      });
      if (response.status === 503) {
        setAccountStatus("unavailable");
        return false;
      }
      if (!response.ok) throw new Error(`Could not save note (${response.status})`);
      const savedNote = normalizeNote(await response.json());
      if (!savedNote) throw new Error("Invalid saved note response");
      setAccountNotes((currentNotes) => [savedNote, ...currentNotes]);
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        await onSignOut();
        return false;
      }
      console.error("Could not save account note", error);
      return false;
    }
  };

  const createGlobalNote = async (newNote: NewNote): Promise<boolean> => {
    if (!session || !newNote.title) return false;

    try {
      const response = await authenticatedFetch(session.access_token, `${apiBase}/notes/global`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newNote),
      });
      if (response.status === 503) {
        setGlobalStatus("unavailable");
        return false;
      }
      if (!response.ok) throw new Error(`Could not publish Global Note (${response.status})`);
      const savedNote = normalizeNote(await response.json());
      if (!savedNote) throw new Error("Invalid Global Note response");
      setGlobalNotes((currentNotes) => [savedNote, ...currentNotes]);
      setGlobalStatus("ready");
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        await onSignOut();
        return false;
      }
      console.error("Could not publish Global Note", error);
      return false;
    }
  };

  const deleteNote = async (noteId: number): Promise<void> => {
    if (!session) {
      setLocalNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
      return;
    }

    try {
      const response = await authenticatedFetch(session.access_token, `${apiBase}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (response.status === 503) {
        setAccountStatus("unavailable");
        return;
      }
      if (!response.ok) throw new Error(`Could not delete note (${response.status})`);
      setAccountNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    } catch (error) {
      if (error instanceof AuthenticationError) {
        await onSignOut();
        return;
      }
      console.error("Could not delete account note", error);
    }
  };

  const changePersistence = (enabled: boolean) => {
    setPersistLocalNotes(enabled);
  };

  const myNotes = session ? accountNotes : localNotes;

  return (
    <div className="min-h-screen bg-base-200">
      <Header
        session={session}
        userData={userData}
        currentView={currentView}
        onViewChange={setCurrentView}
        onSignOut={onSignOut}
      />

      <main className="w-11/12 max-w-7xl mx-auto pt-6 pb-28">
        {currentView === "my" && (
          <>
            <div className="mb-5">
              <h1 className="text-3xl font-bold">My Notes</h1>
              <p className="text-base-content/70 mt-1">
                {session
                  ? "These notes are saved privately to your account."
                  : persistLocalNotes
                    ? "No account needed. These notes stay on this device between visits."
                    : "No account needed. These notes last for this browser session only."}
              </p>
            </div>

            {session && accountStatus === "loading" ? (
              <span className="loading loading-spinner loading-lg" aria-label="Loading account notes" />
            ) : session && accountStatus === "unavailable" ? (
              <div className="alert alert-error" role="alert">
                Account notes are temporarily unavailable. Your logged-out local notes are still safe on this device.
              </div>
            ) : (
              <>
                <NewNoteCard
                  onCreate={createNote}
                  submitLabel={session ? "Save to account" : "Jot locally"}
                />
                <div className="flex flex-wrap gap-3 mt-5">
                  {myNotes.map((note) => <NoteCard key={note.id} note={note} onDelete={deleteNote} />)}
                </div>
                {myNotes.length === 0 && (
                  <p className="mt-6 text-base-content/60">Your first note can start right here.</p>
                )}
              </>
            )}
          </>
        )}

        {currentView === "global" && (
          <>
            <div className="mb-5">
              <h1 className="text-3xl font-bold">Global Notes</h1>
              <p className="text-base-content/70 mt-1">
                A separate public feed. Nothing from My Notes is posted here automatically.
              </p>
            </div>
            {session ? (
              <div className="mb-6">
                <NewNoteCard onCreate={createGlobalNote} submitLabel="Publish to Global Notes" />
              </div>
            ) : (
              <div className="alert mb-6" role="status">
                You can browse Global Notes without an account. Sign in only if you want to publish one.
              </div>
            )}
            {globalStatus === "loading" && (
              <span className="loading loading-spinner loading-lg" aria-label="Loading Global Notes" />
            )}
            {globalStatus === "unavailable" && (
              <div className="alert alert-error" role="alert">Global Notes are temporarily unavailable.</div>
            )}
            {globalStatus === "ready" && (
              <div className="flex flex-wrap gap-3">
                {globalNotes.map((note) => <NoteCard key={note.id} note={note} />)}
                {globalNotes.length === 0 && <p className="text-base-content/60">No Global Notes yet.</p>}
              </div>
            )}
          </>
        )}

        {currentView === "about" && (
          <section className="card bg-base-100 shadow-sm max-w-2xl">
            <div className="card-body">
              <h1 className="card-title text-3xl">About Jot Notes</h1>
              <p>Start writing immediately—an account is optional.</p>
              <p>While signed out, notes remain in this browser and never enter the public feed.</p>
              <p>When you sign in, My Notes sync privately to your account.</p>
              <p>Global Notes are created separately and are always public.</p>
            </div>
          </section>
        )}
      </main>

      <FixedFooter
        theme={theme}
        onToggleTheme={() => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light")}
        showLocalStorageSetting={!session}
        persistLocalNotes={persistLocalNotes}
        onPersistenceChange={changePersistence}
      />
    </div>
  );
}
