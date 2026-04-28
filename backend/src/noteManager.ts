//See Comments Below

import { Client } from "pg";

import type { NewNote, Note } from "./userRetrieval";
import { decodeBase64 } from "bcryptjs";

export async function noteRetrieval(db: Client, id: Number): Promise<Note[]> {
  try {
    const response = await db.query("SELECT * FROM notes WHERE user_id = $1", [id]);
    const notes = response.rows;
    return notes;
  } catch (err) {
    console.error("Error when retrieving notes", err);
    return [];
  }
}


export async function postNote(db:Client, id:Number, newNote: NewNote): Promise<Note | null>{ //I do NOT want null here, need safeguards
  try{
    console.log(`HERE HERE HERE ${newNote.title} BEFORE BEFORE BEFORE`)
    const response = await db.query("INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *", [newNote.title, newNote.content, id])
    return response.rows[0]
  } catch (err){
    console.error('Could not post new note', err)
    return null // I do not want this, this needs to be safeguarded so new note is not lost
  }
}

export async function deleteNote(db:Client, userId:number, noteId:number): Promise<number> {
  try{
    const response = await db.query("DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *", [noteId, userId])
    return response.rows[0]?.id
  } catch (err) {
    console.log('Error Deleting Note', err)
    return NaN
  }
}