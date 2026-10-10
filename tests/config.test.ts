import { describe, expect, it } from "vitest";
import { validateSupabaseConfig } from "../config/supabase-config";

describe("public build configuration", () => {
  it("accepts only a publishable key and a project origin", () => {
    expect(validateSupabaseConfig("https://example.supabase.co", "sb_publishable_test").url)
      .toBe("https://example.supabase.co");
    expect(validateSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_test").url)
      .toBe("http://127.0.0.1:54321");
  });
  it.each(["sb_secret_never_publish", "eyJ.service_role.signature", "", undefined])(
    "rejects a privileged or missing key", (key) =>
      expect(() => validateSupabaseConfig("https://example.supabase.co", key)).toThrow(),
  );
  it.each(["http://example.supabase.co", "https://user:password@example.supabase.co", "https://example.supabase.co/?token=secret", "not-a-url", undefined])(
    "rejects unsafe or missing project URLs", (url) =>
      expect(() => validateSupabaseConfig(url, "sb_publishable_test")).toThrow(),
  );
});
