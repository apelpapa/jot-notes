import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";
import NewNoteCard from "./NewNoteCard";
import FixedFooter from "./FixedFooter";
import Header from "./Header";

const localStorageKey = "saveData";
const apiBase = "/api";

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface SaveData {
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName?: string;
    themePreference: string;
    autoSave: boolean;
    avatarUrl?: string;
    email: string;
  };
  notes: Note[];
}

//make is so that there is a check for save data, if not then apply this preference
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

const defaultData: SaveData = {
  user: {
    id: -1,
    username: "GuestUser",
    firstName: "Guest",
    themePreference: prefersDark ? "dark" : "light",
    email: "no@email.com",
    autoSave: false,
  },
  notes: [],
};

function loadLocalSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(localStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && Array.isArray(parsed.notes)) {
      return parsed as SaveData;
    }

    return null;
  } catch {
    return null;
  }
}

function saveLocalStorage(save: SaveData): void {
  try {
    const stringedSave = JSON.stringify(save);
    localStorage.setItem(localStorageKey, stringedSave);
  } catch {
    console.error("Local Storage Save Failed");
  }
}

async function getDbSave():Promise<SaveData> {
  let resData: SaveData = loadLocalSave() ?? defaultData;
  try {
    const response = await fetch(apiBase);
    if (!response.ok){
      return resData
    }
    resData = response.headers.get("content-type") ? await response.json() : (loadLocalSave() ?? defaultData);
  } catch (err) {
    console.error(err);
    resData = loadLocalSave() ?? defaultData;
  }
  return resData;
}

export default function NoteManager() {
  const [currentData, setCurrentData] = useState<SaveData>(loadLocalSave() ?? defaultData);
  const [notes, setNotes] = useState<Note[]>(currentData.notes);
  const [autoSaveStatus, setAutoSaveStatus] = useState<boolean>(currentData.user.autoSave);

  useEffect(() => {
    async function loadDbSave(){
      const dbSave = await getDbSave()
      setCurrentData(dbSave)
    }
    loadDbSave()
  }, []);

  function handleDelete(noteId: string) {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    setNotes(updatedNotes);
    const updatedCurrentData = { ...currentData, notes: updatedNotes };
    setCurrentData(updatedCurrentData);
    if (autoSaveStatus) {
      saveLocalStorage(updatedCurrentData);
    }
  }

  return (
    <>
      <Header currentData={currentData} />
      <div className="w-11/12 mx-auto">
        <div className="mt-2">
          <NewNoteCard
            autoSaveStatus={autoSaveStatus}
            setCurrentData={setCurrentData}
            currentData={currentData}
            currentNotes={notes}
            setNotes={setNotes}
            saveLocal={saveLocalStorage}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {notes.map((note) => {
            return (
              <NoteCard
                handleDelete={handleDelete}
                key={note.id}
                noteId={note.id}
                noteTitle={note.title}
                noteContent={note.content}
              />
            );
          })}
        </div>
      </div>
      <FixedFooter
        setAutoSaveStatus={setAutoSaveStatus}
        autoSaveStatus={autoSaveStatus}
        setCurrentData={setCurrentData}
        currentData={currentData}
        saveLocal={saveLocalStorage}
      />
    </>
  );
}
