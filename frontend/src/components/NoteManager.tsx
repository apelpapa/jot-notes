//See comments

import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";
import NewNoteCard from "./NewNoteCard";
import FixedFooter from "./FixedFooter";
import Header from "./Header";
import OnLoadModal from "./OnLoadModal";
import ServiceUnavailable from "./ServiceUnavailable";

//const localStorageKey = "saveData";
export const apiBase = "/api";

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

//make is so that there is a check for save data, if not then apply this preference
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

const defaultUserData: UserData = {
  id: -1,
  username: "GuestUser",
  firstName: "Guest",
  themePreference: prefersDark ? "dark" : "light",
  email: "no@email.com",
  autoSave: false,
};

class ApiUnavailableError extends Error {}

//async function saveUser(userData: UserData): Promise<void> {}

//async function saveNote(newNote: Note): Promise<void> {}

async function loadUser(): Promise<UserData> {
  const userRes = await fetch(apiBase + "/users");
  if (userRes.status === 503) {
    throw new ApiUnavailableError();
  }
  if (!userRes.ok) {
    throw new Error(`Could not load user (${userRes.status})`);
  }
  return (await userRes.json()) ?? defaultUserData;
}

async function loadNotes(id: number): Promise<Note[]> {
  const notesRes = await fetch(`${apiBase}/${id}/notes`);
  if (notesRes.status === 503) {
    throw new ApiUnavailableError();
  }
  if (!notesRes.ok) {
    throw new Error(`Could not load notes (${notesRes.status})`);
  }
  const noteData: unknown = await notesRes.json();
  if (!Array.isArray(noteData)) {
    throw new Error("Invalid notes response");
  }
  return noteData as Note[];
}

export default function NoteManager() {
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [notes, setNotes] = useState<Note[]>([]);
  const [appStatus, setAppStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    async function loadData() {
      try {
        const dbUser = await loadUser();
        const dbNotes = await loadNotes(dbUser.id);
        setUserData(dbUser);
        setNotes(dbNotes);
        setAppStatus("ready");
      } catch (err) {
        console.error("Could not load Jot Notes", err);
        setAppStatus("unavailable");
      }
    }
    loadData();
  }, []);

  if (appStatus === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" aria-label="Loading Jot Notes" />
      </main>
    );
  }

  if (appStatus === "unavailable") {
    return <ServiceUnavailable />;
  }

  const showServiceUnavailable = () => setAppStatus("unavailable");

  return (
    <>
    <OnLoadModal/>
      <Header userData={userData} />
      <div className="w-11/12 mx-auto">
        <div className="mt-2">
          <NewNoteCard userData={userData} setNotes={setNotes} onServiceUnavailable={showServiceUnavailable} />
        </div>
        <div className="flex flex-wrap gap-2 mt-2 mb-24">
          {notes.map((note) => {
            return (
              <NoteCard
                key={note.id}
                title={note.title}
                content={note.content}
                noteId={note.id}
                userId={userData.id}
                setNotes={setNotes}
                onServiceUnavailable={showServiceUnavailable}
              />
            );
          })}
        </div>
      </div>

      <FixedFooter userData={userData} setUserData={setUserData} />
    </>
  );
}
