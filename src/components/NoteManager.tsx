import { useState } from "react";
import NoteCard from "./NoteCard";
import NewNoteCard from "./NewNoteCard";

export interface Note {
  id: string;
  title: string;
  content: string;
}

const sampleNote: Note = {
  id: crypto.randomUUID(),
  title: "Sample Note 1",
  content: "The Content of Sample Note 1",
};

export default function NoteManager() {
  const [notes, setNotes] = useState<Note[]>([sampleNote]);

  return (
    <div className="w-11/12 mx-auto">
      <NewNoteCard currentNotes={notes} setNotes={setNotes} />
      <div className="flex flex-wrap gap-2 mt-2">
        {notes.map((note) => {
          return <NoteCard key={note.id} noteId={note.id} noteTitle={note.title} noteContent={note.content} />;
        })}
      </div>
    </div>
  );
}
