import { Client } from "../node_modules/@types/pg";

export interface Note {
  id: string;
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
        username: resSaveData.username,
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

export default async function userRetrieval(db: Client): Promise<UserData | null> {
  try {
    const userData: UserData | null = await getUserInfo(db);
    if (!userData) {
      return null;
    }
    return userData;
  } catch (err) {
    console.error("Error retrieving user data" + err);
    return null;
  }
}