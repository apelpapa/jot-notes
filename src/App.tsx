//Todo
//Favicon

import FixedFooter from "./components/FixedFooter";
import NoteManager from "./components/NoteManager";

function App() {
  console.log(typeof(crypto.randomUUID()))

  return (
    <div className="p-2">
      <NoteManager />
      <FixedFooter />
    </div>
  );
}

export default App;
