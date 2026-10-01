"use client";

import { useEffect, useRef, useState } from "react";
import { useSync } from "@tldraw/sync";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "tldraw";
import { CONNECT_URI, SYNC_URL, assetStore, getBookmarkPreview } from "./sync";

// Where the pre-sync version kept the board. Read once to offer moving it into the synced board.
const LEGACY_STORAGE_KEY = "unsorted-canvas-v1";
const LEGACY_MOVED_KEY = "unsorted-canvas-v1-moved";

const LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.) — we'll just ask about the old board again next time.
  }
}

export default function Canvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!SYNC_URL) {
    return (
      <Gate>
        <span>NEXT_PUBLIC_SYNC_URL isn&apos;t set, so there&apos;s nowhere to sync to.</span>
      </Gate>
    );
  }

  return <SyncedCanvas />;
}

function SyncedCanvas() {
  const editorRef = useRef<Editor | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const store = useSync({ uri: CONNECT_URI, assets: assetStore });

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    editor.registerExternalAssetHandler("url", getBookmarkPreview);
    offerLegacyBoard(editor);
  };

  const clearCanvas = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!window.confirm("Throw everything away? This clears the board on every device.")) return;

    editor.selectAll();
    editor.deleteShapes(editor.getSelectedShapeIds());
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
    if (!window.confirm("Replace the board on every device with this backup?")) return;

    try {
      loadSnapshot(editor.store, JSON.parse(await file.text()));
    } catch {
      window.alert("That backup doesn't look like a valid UNSORTED canvas.");
    }
  };

  if (store.status === "error") {
    return (
      <Gate>
        <span>Couldn&apos;t reach the board. The sync server may be down.</span>
        <div className="gate-actions">
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      </Gate>
    );
  }

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
          <span>Everything syncs live to anyone who opens the board.</span>
        </aside>
      )}

      <section className="canvas">
        <Tldraw
          store={store}
          licenseKey={LICENSE_KEY}
          onMount={handleMount}
          colorScheme="light"
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
        {store.status === "synced-remote" && (
          <span className="saved">{store.connectionStatus === "online" ? "synced" : "offline · reconnecting"}</span>
        )}
      </div>
    </main>
  );
}

// The first time a device connects, offer to move its old local-only board into the shared one,
// but only if the shared board is still empty so nothing gets overwritten.
function offerLegacyBoard(editor: Editor) {
  const raw = readStorage(LEGACY_STORAGE_KEY);
  if (!raw || readStorage(LEGACY_MOVED_KEY)) return;

  const hasShapes = editor.store.allRecords().some((r) => r.typeName === "shape");
  if (hasShapes) return;

  if (!window.confirm("This device has a board from before syncing. Move it into the synced board?")) return;

  try {
    loadSnapshot(editor.store, JSON.parse(raw));
    writeStorage(LEGACY_MOVED_KEY, new Date().toISOString());
  } catch {
    window.alert("Couldn't read the old board. It's still saved on this device.");
  }
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell gate">
      <div className="gate-card">
        <div className="brand-name">UNSORTED</div>
        {children}
      </div>
    </main>
  );
}
