import { useState } from "react";
import { createPortal } from "react-dom";
import ModalContainer from "./ModalContainer";
import UserModal from "./UserModel";
import type { UserData } from "./NoteManager";

const tab1 = {
  name: "Global Notes",
  link: "",
};

const tab2 = {
  name: "My Notes",
  link: "",
};

const tab3 = {
  name: "About",
  link: "",
};

interface HeaderProps {
  userData: UserData;
}

export default function Header({ userData }: HeaderProps) {
  const [userModal, setUserModal] = useState(false);
  //console.log(userData)
  return (
    <>
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />{" "}
              </svg>
            </div>
            <ul
              tabIndex={-1}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              <li>
                <a href={tab1.link}>{tab1.name}</a>
              </li>
              <li>
                <a href={tab2.link}>{tab2.name}</a>
              </li>
              <li>
                <a href={tab3.link}>{tab3.name}</a>
              </li>
            </ul>
          </div>
          <a className="btn btn-ghost text-xl">Jot Notes</a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a>{tab1.name}</a>
            </li>
            <li>
              <a href={tab2.link}>{tab2.name}</a>
            </li>
            <li>
              <a href={tab3.link}>{tab3.name}</a>
            </li>
          </ul>
        </div>
        <div className="navbar-end">
          <button onClick={() => setUserModal(true)} className="btn">
            {userData.firstName}
          </button>
        </div>
      </div>
      {userModal && createPortal(<ModalContainer><UserModal onClose={() => setUserModal(false)}  /></ModalContainer>, document.body)}
    </>
  );
}
