/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Tldraw,
  Editor,
  TLStoreSnapshot,
  createTLStore,
  getSnapshot,
} from "tldraw";

const STORAGE_KEY = "unsorted-canvas-v1";

function loadSnapshot(): TLStoreSnapshot | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export default function Canvas() {
  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;

    const previous = loadSnapshot();
    if (previous) {
      try {
        editor.store.loadSnapshot(previous);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const save = () => {
      try {
        const snapshot = getSnapshot(editor.store);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // Keep the canvas usable even if browser storage is unavailable/full.
      }
    };

    const unsubscribe = editor.store.listen(save, { scope: "document", source: "user" });
    save();

    return () => unsubscribe();
  };

  const clearCanvas = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!window.confirm("Throw everything away? This clears the local canvas.")) return;

    editor.selectAll();
    editor.deleteShapes(editor.getSelectedShapeIds());
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
  };

  const exportCanvas = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const snapshot = getSnapshot(editor.store);
    const blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unsorted-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCanvas = async (file: File) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      editor.store.loadSnapshot(snapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      window.alert("That backup doesn't look like a valid UNSORTED canvas.");
    }
  };

  if (!ready) return null;

  return (
    <main className="app-shell">
      <div className="brand">
        <div className="brand-name">UNSORTED</div>
        <div className="brand-sub">everything I didn&apos;t know where to put.</div>
      </div>

      <div className="top-actions">
        <button onClick={() => setShowHelp((v) => !v)} aria-label="Show shortcuts">?</button>
        <button onClick={exportCanvas} aria-label="Export canvas">↗</button>
        <label className="icon-button" aria-label="Import canvas">
          ↙
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCanvas(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button onClick={clearCanvas} aria-label="Clear canvas">×</button>
      </div>

      {showHelp && (
        <aside className="help">
          <strong>Make a mess.</strong>
          <span>Click the toolbar to add things. Drag, rotate and overlap them however you want.</span>
          <span><kbd>Space</kbd> + drag · pan</span>
          <span><kbd>⌘/Ctrl</kbd> + Z · undo</span>
          <span><kbd>⌘/Ctrl</kbd> + Shift + Z · redo</span>
          <span><kbd>Delete</kbd> · delete selection</span>
          <span>Everything saves locally in this browser.</span>
        </aside>
      )}

      <section className="canvas">
        <Tldraw
          persistenceKey="unsorted-tldraw"
          onMount={handleMount}
          inferDarkMode={false}
          autoFocus
          components={{
            SharePanel: null,
            PageMenu: null,
            NavigationPanel: null,
            HelpMenu: null,
            DebugMenu: null,
            ActionsMenu: null,
            MainMenu: null,
          }}
        />
      </section>

      <div className="hint">
        <span>put something here.</span>
        {savedAt && <span className="saved">saved {savedAt}</span>}
      </div>
    </main>
  );
}