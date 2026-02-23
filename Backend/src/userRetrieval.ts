import { Client } from "pg";

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

//Right now it is just pulling a set user. Update Accordingly
export default async function userRetrieval(db: Client):Promise<SaveData | null> {
  try {
    const response = await db.query("SELECT * FROM users WHERE username = $1", ["apelpapa"]);
    const rowCount = response.rowCount ?? 0
    if (rowCount > 1) {
      console.error("More than one user matched, major error!");
      return null
    } else if (response.rowCount === 0) {
      return null;
    } else {
      const resSaveData = response.rows[0]
      const saveData = {
        user: {
          id: resSaveData.id,
          username: resSaveData.username, //This probably should be grabbed from input, but idk
          firstName: resSaveData.first_name,
          lastName: resSaveData.last_name ?? '',
          avatarUrl: resSaveData.avatar ?? '',
          email: resSaveData.email,
          themePreference: resSaveData.themePreference,
          autoSave: resSaveData.autoSave
        },
        notes: [{                       // Needs to be from table not this bs
          id: 'bs',
          title: 'BSTitle',
          content: 'More bs content'
        }],
      };
      return saveData
    }
  } catch (err) {
    console.error("Could not reach user table", err);
    return null
  }
}
