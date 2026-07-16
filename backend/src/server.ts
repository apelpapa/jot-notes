import express, { json, Request, type ErrorRequestHandler, type Response } from "express";
import env from "dotenv";
import pg from "pg";
import { createAuthMiddleware } from "./auth.js";
import userRetrieval from "./userRetrieval.js";
import { deleteNote, globalNoteRetrieval, noteRetrieval, postNote } from "./noteManager.js";

interface NoteParams {
  noteId: string;
}

const apiURL = "/api";

env.config();

const port: number = parseInt(process.env.PORT || "3000");
const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
}

const app = express();
app.disable("x-powered-by");
app.use(json());

const db = new pg.Pool();
db.on("error", (error) => {
  console.error("Unexpected PG pool error", error);
});

try {
  await db.query("SELECT 1");
} catch (error) {
  console.error("PG Connection Error", error);
}

const serviceUnavailable = (res: Response) => {
  return res.status(503).json({ error: "Service temporarily unavailable" });
};

app.get(`${apiURL}/notes/global`, async (_req, res) => {
  try {
    const noteData = await globalNoteRetrieval(db);
    res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    return res.json(noteData);
  } catch (error) {
    console.error("Could not retrieve Global Notes", error);
    return serviceUnavailable(res);
  }
});

app.use(apiURL, createAuthMiddleware(supabaseUrl, supabasePublishableKey));

app.get(`${apiURL}/users`, async (req, res) => {
  try {
    const userData = await userRetrieval(db, req.authUser!);
    return res.json(userData);
  } catch (error) {
    console.error("Could not retrieve user data", error);
    return serviceUnavailable(res);
  }
});

app.get(`${apiURL}/notes`, async (req, res) => {
  try {
    const userData = await userRetrieval(db, req.authUser!);
    const noteData = await noteRetrieval(db, userData.id);
    return res.json(noteData);
  } catch (error) {
    console.error("Could not retrieve notes", error);
    return serviceUnavailable(res);
  }
});

app.post(`${apiURL}/notes`, async (req, res) => {
  const { title, content } = req.body ?? {};
  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "Title is too long" });
  }
  if (content != null && typeof content !== "string") {
    return res.status(400).json({ error: "Content must be text" });
  }
  if (typeof content === "string" && content.length > 20_000) {
    return res.status(400).json({ error: "Content is too long" });
  }

  try {
    const userData = await userRetrieval(db, req.authUser!);
    const response = await postNote(db, userData.id, { title: title.trim(), content });
    return res.status(201).json(response);
  } catch (error) {
    console.error("Could not save note", error);
    return serviceUnavailable(res);
  }
});

app.delete(`${apiURL}/notes/:noteId`, async (req: Request<NoteParams>, res) => {
  const noteId = parseInt(req.params.noteId);
  if (Number.isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  try {
    const userData = await userRetrieval(db, req.authUser!);
    const response = await deleteNote(db, userData.id, noteId);
    if (response == null) {
      return res.status(404).json({ error: "Note not found" });
    }
    return res.json(response);
  } catch (error) {
    console.error("Could not delete note", error);
    return serviceUnavailable(res);
  }
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled request error", error);
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : 500;

  if (status === 400) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

app.listen(port, "127.0.0.1", () => {
  console.log(`Jot Notes API listening on 127.0.0.1:${port}`);
});
