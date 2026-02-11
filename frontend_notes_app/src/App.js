import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * Storage key for persisting notes locally.
 * Using a versioned key makes future migrations easier.
 */
const STORAGE_KEY = "retro_notes_v1";

/**
 * Generate a reasonably unique id without extra dependencies.
 * (crypto.randomUUID is not universally available in older browsers)
 */
function generateId() {
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {number} updatedAt
 * @property {number} createdAt
 */

/**
 * Load notes from localStorage with validation.
 * @returns {Note[]}
 */
function loadNotesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n === "object")
      .map((n) => ({
        id: typeof n.id === "string" ? n.id : generateId(),
        title: typeof n.title === "string" ? n.title : "",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * Persist notes to localStorage.
 * @param {Note[]} notes
 */
function saveNotesToStorage(notes) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * Format a timestamp for display.
 * @param {number} ts
 */
function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * @param {{ title: string }} props
 */
function SectionTitle({ title }) {
  return (
    <div className="sectionTitle" role="heading" aria-level={2}>
      <span className="sectionTitle__label">{title}</span>
    </div>
  );
}

/**
 * @param {{
 *  note: Note,
 *  isActive: boolean,
 *  onSelect: (id: string) => void,
 *  onDelete: (id: string) => void,
 * }} props
 */
function NoteListItem({ note, isActive, onSelect, onDelete }) {
  const preview = useMemo(() => {
    const s = (note.content || "").trim().replace(/\s+/g, " ");
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }, [note.content]);

  return (
    <div className={`noteItem ${isActive ? "noteItem--active" : ""}`}>
      <button
        type="button"
        className="noteItem__main"
        onClick={() => onSelect(note.id)}
        aria-current={isActive ? "true" : "false"}
      >
        <div className="noteItem__titleRow">
          <span className="noteItem__title">
            {note.title?.trim() ? note.title : "Untitled note"}
          </span>
          <span className="noteItem__meta">{formatTs(note.updatedAt)}</span>
        </div>
        <div className="noteItem__preview">{preview || <em>(empty)</em>}</div>
      </button>

      <button
        type="button"
        className="iconBtn iconBtn--danger"
        onClick={() => onDelete(note.id)}
        aria-label={`Delete note: ${note.title?.trim() ? note.title : "Untitled note"}`}
        title="Delete"
      >
        DEL
      </button>
    </div>
  );
}

/**
 * @param {{
 *  value: string,
 *  onChange: (value: string) => void,
 *  placeholder?: string,
 *  label: string,
 *  id: string,
 * }} props
 */
function LabeledInput({ value, onChange, placeholder, label, id }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input
        id={id}
        className="field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </label>
  );
}

/**
 * @param {{
 *  value: string,
 *  onChange: (value: string) => void,
 *  placeholder?: string,
 *  label: string,
 *  id: string,
 * }} props
 */
function LabeledTextarea({ value, onChange, placeholder, label, id }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <textarea
        id={id}
        className="field__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
      />
    </label>
  );
}

/**
 * @param {{
 *  query: string,
 *  onChange: (value: string) => void,
 * }} props
 */
function SearchBox({ query, onChange }) {
  return (
    <label className="search" htmlFor="notesSearch">
      <span className="search__label">FIND</span>
      <input
        id="notesSearch"
        className="search__input"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type to filter notes…"
        autoComplete="off"
      />
    </label>
  );
}

/**
 * @param {{
 *  onCreate: () => void,
 *  canDeleteAll: boolean,
 *  onDeleteAll: () => void,
 * }} props
 */
function Toolbar({ onCreate, canDeleteAll, onDeleteAll }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Notes actions">
      <button type="button" className="btn btn--primary" onClick={onCreate}>
        + NEW NOTE
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onDeleteAll}
        disabled={!canDeleteAll}
      >
        WIPE ALL
      </button>
    </div>
  );
}

/**
 * Main application component.
 */
// PUBLIC_INTERFACE
function App() {
  const [notes, setNotes] = useState(() => loadNotesFromStorage());
  const [activeId, setActiveId] = useState(() => (loadNotesFromStorage()[0]?.id ? loadNotesFromStorage()[0].id : null));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  // Retro theme toggle (kept from template, but with retro visuals)
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Persist on any notes change
    saveNotesToStorage(notes);
  }, [notes]);

  useEffect(() => {
    // If active note was deleted, pick the first available note.
    if (activeId && !notes.some((n) => n.id === activeId)) {
      setActiveId(notes[0]?.id ?? null);
    }
  }, [activeId, notes]);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    return notes
      .filter((n) => (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function flashStatus(message) {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 1800);
  }

  // PUBLIC_INTERFACE
  function handleCreate() {
    const now = Date.now();
    const newNote = {
      id: generateId(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveId(newNote.id);
    flashStatus("New note created");
  }

  // PUBLIC_INTERFACE
  function handleDelete(id) {
    const note = notes.find((n) => n.id === id);
    const label = note?.title?.trim() ? `"${note.title.trim()}"` : "this note";
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!ok) return;

    setNotes((prev) => prev.filter((n) => n.id !== id));
    flashStatus("Note deleted");
  }

  // PUBLIC_INTERFACE
  function handleDeleteAll() {
    if (notes.length === 0) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Wipe ALL notes? This cannot be undone.");
    if (!ok) return;
    setNotes([]);
    setActiveId(null);
    setQuery("");
    flashStatus("All notes wiped");
  }

  function updateActiveNote(patch) {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== activeNote.id) return n;
        return { ...n, ...patch, updatedAt: Date.now() };
      })
    );
  }

  return (
    <div className="App">
      <header className="topbar">
        <div className="topbar__left">
          <div className="brand">
            <div className="brand__badge" aria-hidden="true">
              CRT
            </div>
            <div className="brand__text">
              <div className="brand__title">RETRO NOTES MANAGER</div>
              <div className="brand__subtitle">Create • Edit • Delete • Local Save</div>
            </div>
          </div>
        </div>

        <div className="topbar__right">
          <button
            className="btn btn--small btn--ghost"
            onClick={toggleTheme}
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            THEME: {theme === "dark" ? "DARK" : "LIGHT"}
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar" aria-label="Notes list">
          <SectionTitle title="NOTES" />
          <Toolbar onCreate={handleCreate} canDeleteAll={notes.length > 0} onDeleteAll={handleDeleteAll} />

          <SearchBox query={query} onChange={setQuery} />

          <div className="sidebar__count" aria-live="polite">
            SHOWING <strong>{filteredNotes.length}</strong> / {notes.length}
          </div>

          <div className="list" role="list">
            {filteredNotes.length === 0 ? (
              <div className="empty">
                <div className="empty__title">No notes found</div>
                <div className="empty__hint">Hit “NEW NOTE” to start.</div>
              </div>
            ) : (
              filteredNotes.map((n) => (
                <NoteListItem
                  key={n.id}
                  note={n}
                  isActive={n.id === activeId}
                  onSelect={setActiveId}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </aside>

        <section className="editor" aria-label="Note editor">
          <SectionTitle title="EDITOR" />

          {status ? (
            <div className="status" role="status" aria-live="polite">
              {status}
            </div>
          ) : (
            <div className="status status--idle" aria-hidden="true">
              READY
            </div>
          )}

          {!activeNote ? (
            <div className="editorEmpty">
              <div className="editorEmpty__title">No note selected</div>
              <div className="editorEmpty__hint">Pick one on the left, or create a new note.</div>
              <button type="button" className="btn btn--primary" onClick={handleCreate}>
                + NEW NOTE
              </button>
            </div>
          ) : (
            <form
              className="editorForm"
              onSubmit={(e) => {
                e.preventDefault();
                flashStatus("Saved");
              }}
            >
              <LabeledInput
                id="noteTitle"
                label="TITLE"
                value={activeNote.title}
                onChange={(v) => updateActiveNote({ title: v })}
                placeholder="Untitled note"
              />

              <LabeledTextarea
                id="noteContent"
                label="CONTENT"
                value={activeNote.content}
                onChange={(v) => updateActiveNote({ content: v })}
                placeholder="Write something rad…"
              />

              <div className="editorMeta" aria-label="Note metadata">
                <div className="metaPill">
                  CREATED: <strong>{formatTs(activeNote.createdAt)}</strong>
                </div>
                <div className="metaPill">
                  UPDATED: <strong>{formatTs(activeNote.updatedAt)}</strong>
                </div>
              </div>

              <div className="editorActions">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => handleDelete(activeNote.id)}
                >
                  DELETE NOTE
                </button>
                <button type="submit" className="btn btn--ghost">
                  OK / SAVE
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="footer">
        <span className="footer__left">LOCAL STORAGE: ON</span>
        <span className="footer__right">v1 • client-side persistence</span>
      </footer>
    </div>
  );
}

export default App;
