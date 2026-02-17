import { useState } from "react"
import NoteCard from "./NoteCard"

interface Note{
    id: number
    title: string
    content: string
}

const sampleNote:Note = {
    id: 1,
    title: 'Sample Note 1',
    content: 'The Content of Sample Note 1'
}

export default function Notes(){
    const [notes, setNotes] = useState<Note[]>([sampleNote])
    return(
        <div className="flex gap-2 mt-2">
            {notes.map(note=>{
                return(<NoteCard key={note.id} noteId={note.id} noteTitle={note.title} noteContent={note.content} />)
            })}
        </div>
    )
}