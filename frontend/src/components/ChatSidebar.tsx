"use client";

import { useState } from "react";
import { UserFile, ChatSession } from "@/services/fileService";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  userFiles: UserFile[];
  selectedFileIds: string[];
  onToggleFileId: (fileId: string) => void;
  onSelectAllFiles: () => void;
  onClearFiles: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  userFiles,
  selectedFileIds,
  onToggleFileId,
  onSelectAllFiles,
  onClearFiles,
  isOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionFilter.toLowerCase())
  );

  const startRename = (s: ChatSession) => {
    setEditingSessionId(s.sessionId);
    setEditTitle(s.title);
  };

  const saveRename = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <button
          onClick={onNewSession}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm"
        >
          <span>+</span>
          <span>New Chat Session</span>
        </button>
        <button
          onClick={onCloseMobile}
          className="lg:hidden ml-2 text-zinc-400 hover:text-white p-2"
        >
          ✕
        </button>
      </div>

      {/* Multi-Document Scope Selector */}
      <div className="p-4 border-b border-zinc-800/80 space-y-3 bg-zinc-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
            📚 Documents Scope ({selectedFileIds.length})
          </span>
          <div className="flex gap-2 text-[11px]">
            <button onClick={onSelectAllFiles} className="text-indigo-400 hover:underline">
              All
            </button>
            <span className="text-zinc-600">•</span>
            <button onClick={onClearFiles} className="text-zinc-500 hover:text-zinc-300">
              Clear
            </button>
          </div>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {userFiles.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2 text-center">No documents uploaded yet.</p>
          ) : (
            userFiles.map((file) => {
              const fid = file.id || file._id || "";
              const isChecked = selectedFileIds.includes(fid);
              return (
                <label
                  key={fid}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                    isChecked
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                      : "bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleFileId(fid)}
                    className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0"
                  />
                  <span className="truncate flex-1">📄 {file.originalName}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Sessions Search */}
      <div className="p-3 border-b border-zinc-800/50">
        <input
          type="text"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          placeholder="Search chats..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-2">
          Saved Chats ({filteredSessions.length})
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-xs text-zinc-600 text-center py-6">No chat sessions found.</div>
        ) : (
          filteredSessions.map((s) => {
            const isActive = s.sessionId === activeSessionId;
            const isEditing = editingSessionId === s.sessionId;

            return (
              <div
                key={s.sessionId}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-200 shadow-sm"
                    : "bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => onSelectSession(s.sessionId)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <span>📌</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(s.sessionId)}
                      onKeyDown={(e) => e.key === "Enter" && saveRename(s.sessionId)}
                      autoFocus
                      className="bg-zinc-950 border border-zinc-700 px-2 py-0.5 rounded text-white text-xs w-full focus:outline-none"
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.title}</p>
                      {s.lastMessage && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{s.lastMessage}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Session Action Buttons */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(s);
                    }}
                    title="Rename chat"
                    className="p-1 hover:text-indigo-400 text-zinc-500 transition"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this chat session?")) onDeleteSession(s.sessionId);
                    }}
                    title="Delete chat"
                    className="p-1 hover:text-red-400 text-zinc-500 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
