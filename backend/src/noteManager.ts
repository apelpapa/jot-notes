import type { Pool } from "pg";

import type { NewNote, Note } from "./userRetrieval.js";

export async function noteRetrieval(db: Pool, id: number): Promise<Note[]> {
  const response = await db.query<Note>("SELECT * FROM notes WHERE user_id = $1", [id]);
  return response.rows;
}

export async function postNote(db: Pool, id: number, newNote: NewNote): Promise<Note> {
  const response = await db.query<Note>(
    "INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *",
    [newNote.title, newNote.content, id],
  );
  return response.rows[0];
}

export async function deleteNote(db: Pool, userId: number, noteId: number): Promise<number | null> {
  const response = await db.query<Pick<Note, "id">>(
    "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id",
    [noteId, userId],
  );
  return response.rows[0]?.id ?? null;
}
