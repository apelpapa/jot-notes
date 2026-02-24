import { useRef, useState } from "react";
import { apiBase, type NewNote, type Note, type UserData } from "./NoteManager";

interface NewNoteCardProps {
  userData: UserData;
  notes: Note[];
  setNotes: (note: Note[]) => void;
}

export default function NewNoteCard({ userData, notes, setNotes }: NewNoteCardProps) {
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const newNote: NewNote = { title: noteTitle, content: noteContent };
    const newNoteString: string = JSON.stringify(newNote);
    try {
      const response = await fetch(`${apiBase}/${userData.id}/notes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: newNoteString,
      });
      const newNote: Note = await response.json();
      setNotes(notes.concat(newNote))
    } catch (err) {
      console.error("Could Not Save Note, Notes Will Be Lost", err); // Some kind of handler to indicate that this note was not saved, need to manually save
    }
    setNoteTitle("");
    setNoteContent("");
    formRef.current?.reset();
  }

  return (
    <div className="card bg-base-300 max-w-96 shadow-sm">
      <div className="card-body">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col justify-center items-center">
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
