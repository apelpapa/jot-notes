import { Client } from "pg";

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface SaveData {
  user: {
    name: string;
    id: string;
    themePreference: string;
    autoSave: boolean;
  };
  notes: Note[];
}

const defaultData: SaveData = {
  user: {
    name: "Guest",
    id: "0",
    themePreference: 'light',
    autoSave: false,
  },
  notes: [],
};

//Right now it is just pulling a set user. Update Accordingly
export default async function userRetrieval(db: Client){
    try{
        const saveData = db.query('SELECT * FROM users WHERE id = $1', [1])
        console.log(saveData)
    } catch (err){

    }
}