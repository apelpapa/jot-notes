import { useState } from "react";
import { FaTrash } from "react-icons/fa";
import type { Note } from "./NoteManager";

interface NoteCardProps {
  note: Note;
  onDelete?: (noteId: number) => Promise<void>;
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const [deleting, setDeleting] = useState(false);

  const deleteNote = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="rounded-lg bg-base-300 w-full sm:w-96 shadow-sm p-4">
      <div className="flex min-h-28 flex-col items-start">
        <h2 className="font-bold text-xl break-words w-full">{note.title}</h2>
        {note.content && <p className="mt-3 whitespace-pre-wrap break-words w-full">{note.content}</p>}
        {onDelete && (
          <button
            type="button"
            onClick={deleteNote}
            className="btn btn-ghost text-secondary aspect-square p-0 mt-auto self-end"
            aria-label={`Delete ${note.title}`}
            disabled={deleting}
          >
            {deleting ? <span className="loading loading-spinner loading-sm" /> : <FaTrash />}
          </button>
        )}
      </div>
    </article>
  );
}
