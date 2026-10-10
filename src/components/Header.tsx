import { useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import InstallAppButton from "./InstallAppButton";
import ModalContainer from "./ModalContainer";
import UserModal from "./UserModel";
import type { UserData } from "./NoteManager";

export type NoteView = "global" | "my" | "about";

interface HeaderProps {
  session: Session | null;
  userData: UserData;
  currentView: NoteView;
  onViewChange: (view: NoteView) => void;
  onSignOut: () => Promise<void>;
}

const navigation: Array<{ name: string; view: NoteView }> = [
  { name: "Global Notes", view: "global" },
  { name: "My Notes", view: "my" },
  { name: "About", view: "about" },
];

export default function Header({ session, userData, currentView, onViewChange, onSignOut }: HeaderProps) {
  const [authModal, setAuthModal] = useState(false);
  const [userModal, setUserModal] = useState(false);

  const selectView = (view: NoteView) => {
    onViewChange(view);
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
  };

  const signOut = async () => {
    await onSignOut();
    setUserModal(false);
  };

  const renderNavigationItems = () => navigation.map((item) => (
    <li key={item.view}>
      <button
        type="button"
        className={currentView === item.view ? "active" : ""}
        aria-current={currentView === item.view ? "page" : undefined}
        onClick={() => selectView(item.view)}
      >
        {item.name}
      </button>
    </li>
  ));

  return (
    <>
      <header className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <div className="dropdown">
            <button type="button" tabIndex={0} className="btn btn-ghost lg:hidden" aria-label="Open navigation">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
            <ul tabIndex={-1} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow">
              {renderNavigationItems()}
            </ul>
          </div>
          <button type="button" className="btn btn-ghost text-xl" onClick={() => selectView("my")}>
            Jot Notes
          </button>
        </div>

        <nav className="navbar-center hidden lg:flex" aria-label="Main navigation">
          <ul className="menu menu-horizontal px-1">{renderNavigationItems()}</ul>
        </nav>

        <div className="navbar-end gap-2">
          <InstallAppButton />
          <button
            type="button"
            onClick={() => session ? setUserModal(true) : setAuthModal(true)}
            className={session ? "btn" : "btn btn-primary"}
          >
            {session ? userData.firstName : "Sign in"}
          </button>
        </div>
      </header>

      {authModal && !session && createPortal(
        <ModalContainer ariaLabel="Sign in to Jot Notes">
          <AuthScreen onClose={() => setAuthModal(false)} />
        </ModalContainer>,
        document.body,
      )}

      {userModal && session && createPortal(
        <ModalContainer ariaLabel="User information">
          <UserModal userData={userData} onClose={() => setUserModal(false)} onSignOut={signOut} />
        </ModalContainer>,
        document.body,
      )}
    </>
  );
}
