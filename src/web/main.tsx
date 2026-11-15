import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, failureText } from "./api.js";
import { noteLine } from "./note-link.js";

// get() gives the first value, so only the first `note` counts.
const noteValue = new URLSearchParams(window.location.search).get("note");

function App() {
  const [status, setStatus] = useState("checking");
  const [notesSaved, setNotesSaved] = useState("checking");
  const [note, setNote] = useState("checking");

  useEffect(() => {
    api<{ status: string }>("/api/health")
      .then((body) => setStatus(body.status))
      .catch((error: unknown) => setStatus(failureText(error)));
    api<{ count: number }>("/api/notes/count")
      .then((body) => setNotesSaved(String(body.count)))
      .catch((error: unknown) => setNotesSaved(failureText(error)));
    if (noteValue !== null) void noteLine(noteValue, api<{ text: string }>).then(setNote);
  }, []);

  return (
    <main>
      <h1>V1be Coding</h1>
      <p>API: {status}</p>
      <p>Notes saved: {notesSaved}</p>
      {noteValue !== null && <p>Note: {note}</p>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
