import type { PostgrestError } from "@supabase/supabase-js";

export class AuthenticationError extends Error {}

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  status: number;
}

// PGRST301/PGRST303: the access token was rejected or has expired.
export function unwrap<T>({ data, error, status }: QueryResult<T>): NonNullable<T> {
  if (status === 401 || error?.code === "PGRST301" || error?.code === "PGRST303") {
    throw new AuthenticationError("Your session has expired");
  }
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    if (error.code === "23514") throw new Error("Check your note: use a title of 1–200 characters and content of at most 20,000 characters.");
    console.error("Supabase request failed", error.code);
    throw new Error("The service could not complete your request. Please try again.");
  }
  if (data == null) throw new Error("No data returned");
  return data;
}
