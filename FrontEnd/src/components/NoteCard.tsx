import { FaTrash } from "react-icons/fa";

interface NoteCardProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  handleDelete:(noteId: string)=>void
}

export default function NoteCard({ handleDelete, noteId, noteTitle, noteContent }: NoteCardProps) {
  return (
    <div className="rounded-lg bg-base-300 w-96 shadow-sm p-2">
      <div className="flex flex-col justify-start items-start">
        <h2 className="font-bold text-xl pl-2">{noteTitle}</h2>
        {noteContent && <p className={`border m-2 p-1 min-h-4`}>{noteContent}</p>}
        
        <button onClick={()=>handleDelete(noteId)}  className="btn btn-ghost text-secondary aspect-square p-0 m-0 self-end">
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
