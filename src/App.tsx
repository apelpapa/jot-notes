import { useEffect } from "react";
import NoteCard from "./components/NoteCard";
import { themeChange } from "theme-change";
import Footer from "./components/Footer";

function App() {
  useEffect(() => {
    themeChange(false);
  }, []);

  return (
    <>
      <NoteCard />
      <Footer />
    </>
  );
}

export default App;
