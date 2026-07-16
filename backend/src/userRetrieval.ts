import type { Pool } from "pg";

export interface Note {
  id: number;
  title: string;
  content: string;
}

export interface NewNote {
  title: string;
  content?: string
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
async function getUserInfo(db: Pool): Promise<UserData | null> {
  const response = await db.query("SELECT * FROM users WHERE username = $1", ["GuestInDB"]);
  const rowCount = response.rowCount ?? 0;
  if (rowCount > 1) {
    throw new Error("More than one guest user matched");
  }
  if (rowCount === 0) {
    return null;
  }

  const resSaveData = response.rows[0];
  return {
    id: Number(resSaveData.id),
    username: resSaveData.username,
    firstName: resSaveData.first_name,
    lastName: resSaveData.last_name ?? "",
    avatarUrl: resSaveData.avatar ?? "",
    email: resSaveData.email,
    themePreference: resSaveData.theme_preference ?? undefined,
    autoSave: resSaveData.autosave ?? false,
  };
}

export default async function userRetrieval(db: Pool): Promise<UserData | null> {
  return getUserInfo(db);
}
