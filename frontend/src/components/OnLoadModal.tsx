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
                This App is currently in beta testing and every person is logged
                in to the same user automatically and all notes are{" "}
                <strong>public</strong>. Do not use this to store anything. It
                is currently <strong>Wiped Every 30 to 60 Minutes</strong>. Have
                fun, but <strong>PLEASE</strong> keep it appropriate. <br />
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
