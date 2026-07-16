import type { Pool } from "pg";
import type { AuthenticatedUser } from "./auth.js";

export interface Note {
  id: number;
  title: string;
  content: string;
}

export interface NewNote {
  title: string;
  content?: string
}

export interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  themePreference?: string;
  autoSave: boolean;
  avatarUrl?: string;
  email: string;
}

function makeUsername(user: AuthenticatedUser): string {
  const emailName = user.email.split("@")[0] ?? "user";
  const safeName = emailName.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "user";
  return `${safeName}_${user.id.slice(0, 8)}`;
}

async function getUserInfo(db: Pool, user: AuthenticatedUser): Promise<UserData> {
  const firstName = user.firstName?.trim() || user.email.split("@")[0] || "User";
  const response = await db.query(
    `INSERT INTO users (auth_user_id, username, first_name, email, theme_preference, autosave)
     VALUES ($1, $2, $3, $4, $5, false)
     ON CONFLICT (auth_user_id) DO UPDATE
       SET email = EXCLUDED.email,
           first_name = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name)
     RETURNING *`,
    [user.id, makeUsername(user), firstName, user.email, "light"],
  );

  const resSaveData = response.rows[0];
  return {
    id: Number(resSaveData.id),
    username: resSaveData.username,
    firstName: resSaveData.first_name,
    lastName: resSaveData.last_name ?? "",
    avatarUrl: resSaveData.avatar ?? "",
    email: resSaveData.email ?? user.email,
    themePreference: resSaveData.theme_preference ?? "light",
    autoSave: resSaveData.autosave ?? false,
  };
}

export default async function userRetrieval(db: Pool, user: AuthenticatedUser): Promise<UserData> {
  return getUserInfo(db, user);
}
