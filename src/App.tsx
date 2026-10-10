import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import NoteManager from "./components/NoteManager";
import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const currentUserId = useRef<string | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    const acceptSession = (nextSession: Session | null) => {
      currentUserId.current = nextSession?.user.id ?? null;
      setSession(nextSession);
      setRestoringSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (active) acceptSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) console.error("Could not restore Supabase session", error);
      acceptSession(error ? null : data.session);
    }).catch((error: unknown) => {
      if (!active || receivedAuthEvent) return;
      console.error("Could not restore Supabase session", error);
      acceptSession(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    // An expired request from a previous account must not sign out the next one.
    if (currentUserId.current !== userId) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  }, [userId]);

  if (restoringSession) {
    return <main className="min-h-screen grid place-items-center">
      <span className="loading loading-spinner loading-lg" aria-label="Restoring session" />
    </main>;
  }

  // All account state and composers belong to this identity, including Guest.
  return <NoteManager key={userId ?? "guest"} session={session} onSignOut={signOut} />;
}

export default App;
