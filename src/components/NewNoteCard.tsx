import { useState } from "react";
import type { Note } from './NoteManager'

interface NewNoteCardProps{
  setNotes:((note:Note[])=> void)
  currentNotes: Note[]
}

export default function NewNoteCard({ setNotes, currentNotes }:NewNoteCardProps) {
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");

function handleSubmit(e: React.SubmitEvent<HTMLFormElement>): void {
  e.preventDefault()
  setNotes(currentNotes.concat({
    title: noteTitle,
    id: crypto.randomUUID(),
    content: noteContent
  }))
  setNoteTitle('')
  setNoteContent('')
}

  return (
    <div className="card bg-base-300 w-96 shadow-sm">
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <input type="text" className="input mb-2" value={noteTitle} placeholder="Title" onChange={(e)=>setNoteTitle(e.target.value)} />
          <textarea className="textarea mb-2" value={noteContent} placeholder="Notes (Optional)" onChange={(e) => setNoteContent(e.target.value)} />
          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-ghost mr-auto">Jot</button>
          </div>
        </form>
      </div>
    </div>
  );
}
