import type { Pool } from "pg";

import type { NewNote, Note } from "./userRetrieval.js";

interface NoteRow {
  id: number | string;
  title: string;
  content: string | null;
}

function normalizeId(id: number | string): number {
  const parsedId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(parsedId) || parsedId < 1) {
    throw new Error("Database returned an invalid note id");
  }
  return parsedId;
}

function normalizeNote(row: NoteRow): Note {
  return {
    id: normalizeId(row.id),
    title: row.title,
    content: row.content ?? "",
  };
}

export async function noteRetrieval(db: Pool, id: number): Promise<Note[]> {
  const response = await db.query<NoteRow>(
    "SELECT id, title, content FROM notes WHERE user_id = $1 ORDER BY id DESC",
    [id],
  );
  return response.rows.map(normalizeNote);
}

export async function globalNoteRetrieval(db: Pool): Promise<Note[]> {
  const response = await db.query<NoteRow>(
    `SELECT id, title, content
     FROM global_notes
     ORDER BY id DESC
     LIMIT 100`,
  );
  return response.rows.map(normalizeNote);
}

export async function postGlobalNote(db: Pool, id: number, newNote: NewNote): Promise<Note> {
  const response = await db.query<NoteRow>(
    `INSERT INTO global_notes (title, content, user_id)
     VALUES ($1, $2, $3)
     RETURNING id, title, content`,
    [newNote.title, newNote.content, id],
  );
  return normalizeNote(response.rows[0]);
}

export async function postNote(db: Pool, id: number, newNote: NewNote): Promise<Note> {
  const response = await db.query<NoteRow>(
    "INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING id, title, content",
    [newNote.title, newNote.content, id],
  );
  return normalizeNote(response.rows[0]);
}

export async function deleteNote(db: Pool, userId: number, noteId: number): Promise<number | null> {
  const response = await db.query<Pick<NoteRow, "id">>(
    "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id",
    [noteId, userId],
  );
  return response.rows[0] ? normalizeId(response.rows[0].id) : null;
}
