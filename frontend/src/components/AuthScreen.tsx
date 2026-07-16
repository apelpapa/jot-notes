import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "signIn" | "signUp";

interface AuthScreenProps {
  onClose: () => void;
}

export default function AuthScreen({ onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setNotice(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      if (mode === "signUp") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: firstName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          onClose();
        } else {
          setNotice("Check your email to confirm your account, then come back to sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card w-full max-w-md bg-base-100 shadow-xl" aria-labelledby="auth-title">
      <div className="card-body gap-5">
        <div className="flex justify-end">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close sign in">
            Close
          </button>
        </div>

        <div className="flex flex-col items-center text-center gap-3">
          <img
            src="/images/favicons/web-app-manifest-192x192.png"
            alt=""
            className="h-20 w-20 rounded-2xl"
          />
          <div>
            <h1 id="auth-title" className="text-3xl font-bold">Jot Notes</h1>
            <p className="text-base-content/70 mt-1">
              {mode === "signIn"
                ? "Sign in to access your account notes."
                : "Create an account to sync notes and share them in Global Notes."}
            </p>
          </div>
        </div>

        <div role="tablist" className="tabs tabs-box w-full">
          <button
            type="button"
            role="tab"
            className={`tab flex-1 ${mode === "signIn" ? "tab-active" : ""}`}
            aria-selected={mode === "signIn"}
            onClick={() => switchMode("signIn")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            className={`tab flex-1 ${mode === "signUp" ? "tab-active" : ""}`}
            aria-selected={mode === "signUp"}
            onClick={() => switchMode("signUp")}
          >
            Create account
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          {mode === "signUp" && (
            <label className="form-control">
              <span className="label-text mb-1">First name</span>
              <input
                className="input input-bordered w-full"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                maxLength={80}
                required
              />
            </label>
          )}

          <label className="form-control">
            <span className="label-text mb-1">Email</span>
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Password</span>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            {mode === "signUp" && <span className="label-text-alt mt-1">Use at least 8 characters.</span>}
          </label>

          {errorMessage && <div className="alert alert-error" role="alert">{errorMessage}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading && <span className="loading loading-spinner loading-sm" />}
            {mode === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Continue without an account
        </button>
      </div>
    </section>
  );
}
