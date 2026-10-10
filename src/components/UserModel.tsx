import { useState } from "react";
import type { UserData } from "./NoteManager";

interface UserModalProps {
  userData: UserData;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

export default function UserModal({ userData, onClose, onSignOut }: UserModalProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    setErrorMessage(null);
    try {
      await onSignOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sign out");
      setSigningOut(false);
    }
  };

  return (
    <section className="card w-full max-w-sm bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Your account</h2>
        <div>
          <p className="font-medium">{userData.firstName}</p>
          <p className="text-sm text-base-content/70 break-all">{userData.email}</p>
        </div>
        {errorMessage && <div className="alert alert-error" role="alert">{errorMessage}</div>}
        <div className="card-actions justify-end mt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
          <button type="button" onClick={signOut} className="btn btn-error" disabled={signingOut}>
            {signingOut && <span className="loading loading-spinner loading-sm" />}
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
