"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile, ChatMessage } from "@/services/fileService";

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [files, setFiles] = useState<UserFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

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
      const userFiles = await fileService.getUserFiles();
      setFiles(userFiles);
      if (userFiles.length > 0 && !selectedFileId) {
        setSelectedFileId(userFiles[0].id || userFiles[0]._id || "");
      }
    } catch {
      setError("Failed to load documents.");
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedFileId]);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFiles();
    }
  }, [mounted, isAuthenticated, loadFiles]);

  const loadHistory = useCallback(async (fileId: string) => {
    if (!fileId) {
      setMessages([]);
      return;
    }
    try {
      setLoadingHistory(true);
      setError("");
      const history = await fileService.getChatHistory(fileId);
      setMessages(history);
    } catch {
      setError("Failed to load chat history for this document.");
      setMessages([]);
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
    if (!confirm("Are you sure you want to delete all chat history for this document?")) return;
    try {
      await fileService.clearChatHistory(selectedFileId);
      setMessages([]);
    } catch {
      alert("Failed to clear chat history.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentFile = files.find((f) => (f.id || f._id) === selectedFileId);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"
            >
              OmniVerse
            </Link>

            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">
                Dashboard
              </Link>
              <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">
                My Documents
              </Link>
              <Link href="/upload" className="text-zinc-400 hover:text-zinc-200 transition">
                Document Upload
              </Link>
              <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">
                RAG Chat
              </Link>
              <Link href="/history" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">
                Chat History
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden md:inline">
              <span className="text-zinc-200 font-medium">{user?.full_name || user?.name || user?.email}</span>
            </span>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Chat History & Saved Threads
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Review past RAG Q&A conversations across all your uploaded documents.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document Selector Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Select Document
            </h3>

            {loadingFiles ? (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 text-center">
                Loading files...
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 text-center">
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
                      className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
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
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📄</span> {currentFile.originalName}
                  </h2>
                  <p className="text-xs font-mono text-zinc-400">
                    File ID: {currentFile.id || currentFile._id}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/chat?fileId=${currentFile.id || currentFile._id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                  >
                    Open Live Chat 💬
                  </Link>

                  {messages.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition"
                    >
                      Clear History 🗑️
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Loading */}
            {loadingHistory && (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-12 text-center text-zinc-400 text-sm">
                <div className="h-8 w-8 mx-auto mb-3 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                Loading message history thread...
              </div>
            )}

            {/* Empty History */}
            {!loadingHistory && messages.length === 0 && (
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-12 text-center space-y-3">
                <div className="text-5xl">💬</div>
                <h3 className="text-lg font-bold text-white">
                  No chat history for this document
                </h3>
                <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                  Start a conversation on the RAG Chat page to view saved questions and answers here.
                </p>
                {selectedFileId && (
                  <div>
                    <Link
                      href={`/chat?fileId=${selectedFileId}`}
                      className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                    >
                      Start Chat Now
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Messages Thread Timeline */}
            {!loadingHistory && messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || msg._id || index}
                    className={`rounded-2xl p-5 border ${
                      msg.role === "user"
                        ? "bg-zinc-900/80 border-indigo-500/30"
                        : "bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-2 font-bold">
                        {msg.role === "user" ? (
                          <span className="text-zinc-200">👤 You</span>
                        ) : (
                          <span className="text-indigo-400">🤖 OmniVerse AI</span>
                        )}
                      </div>

                      {msg.createdAt && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Sources */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          📚 Cited Sources ({msg.sources.length})
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={src.chunkId || sIdx}
                              className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-indigo-400 font-medium">
                                <span>Source #{src.source || sIdx + 1}</span>
                                <span className="text-zinc-400 font-mono text-[10px]">
                                  Score: {(src.score ?? src.similarity ?? 0).toFixed(3)}
                                </span>
                              </div>
                              {src.chunkId && (
                                <p className="text-[10px] font-mono text-zinc-500 truncate">
                                  Chunk ID: {src.chunkId}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
