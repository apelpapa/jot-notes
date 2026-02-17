export default function NewNoteCard() {
  return (
    <div className="card bg-base-300 w-96 shadow-sm">
      <div className="card-body">
        <input type="text" className="input"></input>
        <div className="card-actions justify-end">
          <button className="btn">Jot</button>
        </div>
      </div>
    </div>
  );
}
