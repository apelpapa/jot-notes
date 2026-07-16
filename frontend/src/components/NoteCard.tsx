import { FaTrash } from "react-icons/fa";
import type { Dispatch, SetStateAction } from "react";
import { apiBase, type Note } from "./NoteManager";

interface NoteCardProps {
  noteId: number;
  title: string;
  content?: string;
  userId: number;
  setNotes: Dispatch<SetStateAction<Note[]>>;
  onServiceUnavailable: () => void;

}

export default function NoteCard({ noteId, title, content, userId, setNotes, onServiceUnavailable }: NoteCardProps) {
  async function handleDelete(noteId: number, userId: number): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/${userId}/${noteId}`, {
        method: "DELETE",
      });
      if (response.status === 503) {
        onServiceUnavailable();
        return;
      }
      if (!response.ok) {
        console.error("Could not delete note, server responded with", response.status);
        return;
      }
      const deletedNoteId = await response.json()
      if(typeof deletedNoteId === "number"){
        setNotes((currentNotes) => currentNotes.filter((note) => note.id !== deletedNoteId));
      }
    } catch (err) {
      console.error("Error on deleting in db", err);
    }
  }

  return (
    <div className="rounded-lg bg-base-300 w-96 shadow-sm p-2">
      <div className="flex flex-col justify-start items-start">
        <p className="font-bold text-xl pl-2">{title}</p>
        {content && <p className={`border m-2 p-1 min-h-4`}>{content}</p>}
        <button
          onClick={() => handleDelete(noteId, userId)}
          className="btn btn-ghost text-secondary aspect-square p-0 m-0 self-end"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
