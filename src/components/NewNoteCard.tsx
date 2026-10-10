import { useState } from "react";
import type { NewNote } from "./NoteManager";

interface NewNoteCardProps {
  onCreate: (note: NewNote) => Promise<boolean>;
  submitLabel: string;
  disabled?: boolean;
}

export default function NewNoteCard({ onCreate, submitLabel, disabled = false }: NewNoteCardProps) {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const saved = await onCreate({ title: noteTitle.trim(), content: noteContent });
      if (saved) {
        setNoteTitle("");
        setNoteContent("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save your note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card bg-base-300 w-full max-w-lg shadow-sm">
      <div className="card-body">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="form-control">
            <span className="label-text mb-1">Title</span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              maxLength={200}
              required
              disabled={disabled || saving}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Note</span>
            <textarea
              className="textarea textarea-bordered w-full min-h-28"
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              maxLength={20_000}
              placeholder="Optional"
              disabled={disabled || saving}
            />
          </label>
          {errorMessage && <div className="alert alert-error" role="alert">{errorMessage}</div>}
          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-primary" disabled={disabled || saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
