export function validateSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) {
    throw new Error("Set the URL and publishable key in config/supabase-config.ts before building.");
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("The Supabase URL must be a valid project URL."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("The Supabase URL must be an HTTPS project origin (HTTP is allowed only on loopback).");
  }
  if (!key.startsWith("sb_publishable_")) {
    throw new Error("Use a Supabase publishable key. Secret and service-role keys must never enter the frontend.");
  }
  return { url: parsed.origin, publishableKey: key };
}

// Public connection values shipped with the app. Use only a publishable key here.
export const supabaseConfig = validateSupabaseConfig(
  "https://bqcfljdatqkcabpdbrdm.supabase.co",
  "sb_publishable_K0vhiynCI2_OoaDT8twcBg_z_myyKfI",
);
