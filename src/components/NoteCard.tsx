interface NoteCardProps {
    noteId: number
    noteTitle: string,
    noteContent: string
}

export default function NoteCard({ noteId, noteTitle, noteContent }:NoteCardProps) {
  return (
    <div className="card bg-base-200 w-96 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{noteTitle}</h2>
        <p>{noteContent}</p>
      </div>
    </div>
  );
}
