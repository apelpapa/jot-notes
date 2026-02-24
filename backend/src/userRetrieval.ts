import { Client } from "../node_modules/@types/pg";

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface SaveData {
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName?: string;
    themePreference?: string;
    autoSave: boolean;
    avatarUrl?: string;
    email: string;
  };
  notes: Note[];
}

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  themePreference?: string;
  autoSave: boolean;
  avatarUrl?: string;
  email: string;
}
//Right now it is just pulling a set user. Update Accordingly
async function getUserInfo(db: Client): Promise<UserData | null> {
  try {
    const response = await db.query("SELECT * FROM users WHERE username = $1", ["apelpapa"]);
    const rowCount = response.rowCount ?? 0;
    if (rowCount > 1) {
      console.error("More than one user matched, major error!");
      return null;
    } else if (response.rowCount === 0) {
      return null;
    } else {
      const resSaveData = response.rows[0];
      const saveData: UserData = {
        id: resSaveData.id,
        username: resSaveData.username, //This probably should be grabbed from input, but idk
        firstName: resSaveData.first_name,
        lastName: resSaveData.last_name ?? "",
        avatarUrl: resSaveData.avatar ?? "",
        email: resSaveData.email,
        themePreference: resSaveData.themePreference,
        autoSave: resSaveData.autosave,
      };
      return saveData;
    }
  } catch (err) {
    console.error("Could not reach user table", err);
    return null;
  }
}

async function getNoteData(db: Client, id: Number): Promise<Note[]> {
  const response = await db.query("SELECT * FROM notes WHERE user_id = $1", [id]);
  const notes = response.rows;
  return notes;
}

export default async function userRetrieval(db: Client): Promise<SaveData | null> {
  try {
    const userData: UserData | null = await getUserInfo(db);
    if (!userData) {
      return null;
    }
    const noteData = await getNoteData(db, userData.id);
    const resData: SaveData = { user: userData, notes: noteData };
    return resData;
  } catch (err) {
    console.error("Could not retrieve data" + err);
    return null;
  }
}
