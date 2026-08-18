"use client";

import { useState } from "react";
import { UserFile, ChatSession } from "@/services/fileService";
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Search, FileText } from "lucide-react";

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
      className={`fixed lg:static inset-y-0 left-0 z-30 w-80 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
        <button
          onClick={onNewSession}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>New RAG Thread</span>
        </button>

        <button
          onClick={onCloseMobile}
          className="lg:hidden ml-2 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Sessions */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search chat history..."
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Session Threads List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
          Recent Sessions ({filteredSessions.length})
        </div>

        {filteredSessions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No chat threads found.</p>
        ) : (
          filteredSessions.map((s) => {
            const isSelected = s.sessionId === activeSessionId;
            const isEditing = editingSessionId === s.sessionId;

            return (
              <div
                key={s.sessionId}
                className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-purple-50 border-purple-300 text-purple-950 font-semibold shadow-2xs"
                    : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                }`}
                onClick={() => !isEditing && onSelectSession(s.sessionId)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-purple-600" : "text-slate-400"}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveRename(s.sessionId)}
                      autoFocus
                      className="bg-white border border-purple-500 rounded px-1.5 py-0.5 text-xs text-slate-900 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="truncate">{s.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  {isEditing ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); saveRename(s.sessionId); }}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(s); }}
                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-slate-100 rounded"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(s.sessionId); }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Target Documents Selection */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Target Documents ({selectedFileIds.length}/{userFiles.length})
          </span>
          <div className="flex gap-2 text-[10px] font-semibold text-purple-600">
            <button onClick={onSelectAllFiles} className="hover:underline">All</button>
            <span>•</span>
            <button onClick={onClearFiles} className="hover:underline">Clear</button>
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
          {userFiles.length === 0 ? (
            <p className="text-slate-400 text-[11px] py-1">No files uploaded yet.</p>
          ) : (
            userFiles.map((f) => {
              const fId = f.id || f._id || "";
              const isChecked = selectedFileIds.includes(fId);
              return (
                <label
                  key={fId}
                  className={`flex items-center gap-2 p-1.5 rounded-lg border transition cursor-pointer ${
                    isChecked
                      ? "bg-purple-50 border-purple-200 text-purple-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleFileId(fId)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                  />
                  <span className="truncate text-[11px] font-medium">{f.originalName}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
