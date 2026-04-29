import { createPortal } from "react-dom";
import ModalContainer from "./ModalContainer";
import { useState } from "react";

export default function OnLoadModal() {
  const [onLoadModal, setOnLoadModal] = useState(true);
  return (
    <>
      {onLoadModal &&
        createPortal(
          <ModalContainer>
            <div className="bg-100 p-3 max-w-100">
              <p>
                This app is currently in alpha testing. Everyone is
                automatically logged in as the same user, and all notes are{" "}
                <strong>public</strong>. Do not use this to store anything
                private or important. Data is currently{" "}
                <strong>wiped every 30 to 60 minutes</strong>. Have fun, but
                please keep it appropriate.
              </p>

              <button
                className="block btn btn-accent mx-auto mt-2"
                onClick={() => setOnLoadModal(false)}
              >
                I Understand
              </button>
            </div>
          </ModalContainer>,
          document.body,
        )}
    </>
  );
}
