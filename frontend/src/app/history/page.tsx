"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile, ChatMessage } from "@/services/fileService";
import { History, MessageSquare, Trash2, ArrowRight } from "lucide-react";

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [files, setFiles] = useState<UserFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const data = await fileService.getUserFiles();
      setFiles(data);
      if (data.length > 0) {
        const firstId = data[0].id || data[0]._id || "";
        setSelectedFileId(firstId);
      }
    } catch {
      setError("Failed to load user files.");
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFiles();
    }
  }, [mounted, isAuthenticated, loadFiles]);

  const loadHistory = useCallback(async (fileId: string) => {
    if (!fileId) return;
    try {
      setLoadingHistory(true);
      setError(null);
      const history = await fileService.getChatHistory(fileId);
      setMessages(history);
    } catch {
      setError("Failed to load chat history for this document.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadHistory(selectedFileId);
    }
  }, [selectedFileId, loadHistory]);

  const handleClearHistory = async () => {
    if (!selectedFileId) return;
    if (!confirm("Are you sure you want to clear the chat history for this document?")) {
      return;
    }

    try {
      await fileService.clearChatHistory(selectedFileId);
      setMessages([]);
    } catch {
      alert("Failed to clear chat history.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white text-slate-900 p-4">
        <div className="h-10 w-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentFile = files.find((f) => (f.id || f._id) === selectedFileId);

  return (
    <div className="space-y-6 bg-transparent text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="h-7 w-7 text-purple-600" />
            <span>Chat History & Saved Threads</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Review past RAG Q&A conversations across all your uploaded documents.
          </p>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Selector Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Document
          </h3>

          {loadingFiles ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-400 text-center">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 text-center">
              No documents uploaded.
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const fId = file.id || file._id || "";
                const isSelected = fId === selectedFileId;
                return (
                  <button
                    key={fId}
                    onClick={() => setSelectedFileId(fId)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">📄 {file.originalName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* History Thread Panel */}
        <div className="lg:col-span-3 space-y-4">
          {currentFile && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📄</span> {currentFile.originalName}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  File ID: {currentFile.id || currentFile._id}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/chat?fileId=${currentFile.id || currentFile._id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Open Live Chat</span>
                </Link>

                {messages.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Loading */}
          {loadingHistory && (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-500 text-sm shadow-sm">
              <div className="h-8 w-8 mx-auto mb-3 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
              Loading conversation history...
            </div>
          )}

          {/* Empty History */}
          {!loadingHistory && messages.length === 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <div className="text-5xl">💬</div>
              <h3 className="text-lg font-bold text-slate-900">
                No chat history for this document
              </h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Start a conversation on the RAG Chat page to view saved questions and answers here.
              </p>
              {selectedFileId && (
                <div className="pt-2">
                  <Link
                    href={`/chat?fileId=${selectedFileId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <span>Start Chat Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Messages Feed */}
          {!loadingHistory && messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-50 border-purple-200 text-slate-900 ml-8"
                      : "bg-white border-slate-200 text-slate-800 mr-8 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs text-slate-400 font-semibold">
                    <span>{msg.role === "user" ? "You" : "OmniVerse Assistant"}</span>
                    <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
