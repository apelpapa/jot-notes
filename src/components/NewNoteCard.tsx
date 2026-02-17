import { useState } from "react";
import type { Note, SaveData } from "./NoteManager";

interface NewNoteCardProps {
  setNotes: (note: Note[]) => void;
  currentNotes: Note[];
  setCurrentData: (saveData: SaveData) => void;
  currentData: SaveData;
  autoSaveStatus: boolean;
  saveLocal: (saveData: SaveData) => void;
}

export default function NewNoteCard({
  saveLocal,
  autoSaveStatus,
  setNotes,
  currentNotes,
  setCurrentData,
  currentData,
}: NewNoteCardProps) {
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>): void {
    e.preventDefault();
    const updatedNotes: Note[] = currentNotes.concat({
      title: noteTitle,
      id: crypto.randomUUID(),
      content: noteContent,
    });
    setNotes(updatedNotes);
    setNoteTitle("");
    setNoteContent("");
    const updatedCurrentData: SaveData = { ...currentData, notes: updatedNotes };
    setCurrentData(updatedCurrentData);
    if(autoSaveStatus){
      saveLocal(updatedCurrentData)
    }
    e.currentTarget.reset();
  }

  return (
    <div className="card bg-base-300 max-w-96 shadow-sm">
      <div className="card-body">
        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center">
          <input
            type="text"
            className="input mb-2 validator"
            value={noteTitle}
            placeholder="Title"
            onChange={(e) => setNoteTitle(e.target.value)}
            required
          />
          <textarea
            className="textarea mb-2"
            value={noteContent}
            placeholder="Notes (Optional)"
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-primary mb-0">
              Jot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
