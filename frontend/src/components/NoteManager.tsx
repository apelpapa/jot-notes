//See comments

import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";
import NewNoteCard from "./NewNoteCard";
import FixedFooter from "./FixedFooter";
import Header from "./Header";
import OnLoadModal from "./OnLoadModal";

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

//async function saveUser(userData: UserData): Promise<void> {}

//async function saveNote(newNote: Note): Promise<void> {}

async function loadUser(): Promise<UserData> {
  let userData: UserData = defaultUserData;
  try {
    const userRes = await fetch(apiBase + "/users");
    if (!userRes.ok) {
      console.log("could not access user table, returning default user"); //debug line
      return userData;
    }
    userData = userRes.headers.get("content-type")
      ? await userRes.json()
      : defaultUserData;
  } catch (err) {
    console.error(err);
    userData = defaultUserData;
  }
  //console.log(userData) //debug line
  return userData;
}

async function loadNotes(id: Number): Promise<Note[]> {
  try {
    const notesRes = await fetch(`${apiBase}/${id}/notes`);
    return notesRes.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default function NoteManager() {
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    async function loadData() {
      const dbUser = await loadUser();
      const dbNotes = await loadNotes(dbUser.id);
      setUserData(dbUser);
      setNotes(dbNotes);
    }
    loadData();
  }, []);

  return (
    <>
    <OnLoadModal/>
      <Header userData={userData} />
      <div className="w-11/12 mx-auto">
        <div className="mt-2">
          <NewNoteCard userData={userData} notes={notes} setNotes={setNotes} />
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
                notes={notes}
                setNotes={setNotes}
              />
            );
          })}
        </div>
      </div>

      <FixedFooter userData={userData} setUserData={setUserData} />
    </>
  );
}
