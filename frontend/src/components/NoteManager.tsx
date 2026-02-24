import { useEffect, useState } from "react";
import NoteCard from "./NoteCard";
import NewNoteCard from "./NewNoteCard";
import FixedFooter from "./FixedFooter";
import Header from "./Header";

const localStorageKey = "saveData";
const apiBase = "/api";

export interface Note {
  id: number;
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

async function saveData(save: SaveData): Promise<void> {
  try {
    const stringedSave = JSON.stringify(save);
    localStorage.setItem(localStorageKey, stringedSave);
    console.log(stringedSave)
    if(save.user.id >= 0){
      await fetch(apiBase+'/notes', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: stringedSave
      })
    }
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
      setNotes(dbSave.notes)
      setAutoSaveStatus(dbSave.user.autoSave)
    }
    loadDbSave()
  }, []);

  function handleDelete(noteId: number) {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    setNotes(updatedNotes);
    const updatedCurrentData = { ...currentData, notes: updatedNotes };
    setCurrentData(updatedCurrentData);
    if (autoSaveStatus) {
      saveData(updatedCurrentData);
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
            saveLocal={saveData}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2 mb-24">
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
        saveLocal={saveData}
      />
    </>
  );
}
