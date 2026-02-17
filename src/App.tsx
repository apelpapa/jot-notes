//Todo
//Favicon

import NewNoteCard from "./components/NewNoteCard";
import FixedFooter from "./components/FixedFooter";
import Notes from "./components/Notes";

function App() {

  return (
    <div className="p-2">
      <NewNoteCard />
      <Notes />
      <FixedFooter />
    </div>
  );
}

export default App;
