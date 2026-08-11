"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, {
  UserFile,
  RagSource,
  ChatMessage,
  SessionChatSource,
} from "@/services/fileService";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMode = "document" | "session";

interface MessageUI {
  id?: string;
  role: "user" | "assistant";
  content: string;
  // File-scoped chat sources (chunkId-based)
  sources?: RagSource[];
  // Session chat sources (filename/page/similarity-based)
  sessionSources?: SessionChatSource[];
  createdAt?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // ── Mode toggle ──────────────────────────────────────────────────────────
  const [chatMode, setChatMode] = useState<ChatMode>("document");

  // ── Document Chat state ──────────────────────────────────────────────────
  const [fileId, setFileId] = useState("");
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [prepStatus, setPrepStatus] = useState("");
  const [prepping, setPrepping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Session Chat state ───────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : `session-${Date.now()}`
  );
  const [scopeFileId, setScopeFileId] = useState(""); // optional file scope for session chat

  // ── Shared state ─────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Mount guard ──────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  // ── Load user files ──────────────────────────────────────────────────────
  const loadUserFiles = useCallback(async () => {
    try {
      const files = await fileService.getUserFiles();
      setUserFiles(files);
      const urlFileId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("fileId")
          : null;
      if (urlFileId) {
        setFileId(urlFileId);
        setScopeFileId(urlFileId);
      } else if (files.length > 0 && !fileId) {
        setFileId(files[0].id || files[0]._id || "");
      }
    } catch {
      // ignore
    }
  }, [fileId]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadUserFiles();
  }, [mounted, isAuthenticated, loadUserFiles]);

  // ── Load document chat history when fileId changes ───────────────────────
  const loadChatHistory = useCallback(async (targetFileId: string) => {
    if (!targetFileId || chatMode !== "document") return;
    try {
      setHistoryLoading(true);
      setError("");
      const history = await fileService.getChatHistory(targetFileId);
      setMessages(
        history.map((m) => ({
          id: m.id || m._id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          createdAt: m.createdAt,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [chatMode]);

  useEffect(() => {
    if (fileId && chatMode === "document") loadChatHistory(fileId);
  }, [fileId, chatMode, loadChatHistory]);

  // ── Switch modes ─────────────────────────────────────────────────────────
  const switchMode = (mode: ChatMode) => {
    setChatMode(mode);
    setMessages([]);
    setError("");
    setQuestion("");
  };

  // ── New Chat (session mode) ──────────────────────────────────────────────
  const newSessionChat = () => {
    setMessages([]);
    setError("");
    setSessionId(crypto.randomUUID());
  };

  // ── Clear document chat history ──────────────────────────────────────────
  const handleClearHistory = async () => {
    if (!fileId) return;
    if (!confirm("Clear chat history for this document?")) return;
    try {
      await fileService.clearChatHistory(fileId);
      setMessages([]);
    } catch {
      alert("Failed to clear chat history.");
    }
  };

  // ── Prepare document (process → chunk → embed) ───────────────────────────
  const prepareDocument = async () => {
    if (!fileId) { setError("Please select a document."); return; }
    try {
      setPrepping(true);
      setError("");
      setPrepStatus("Step 1/3: Extracting text...");
      await fileService.processFile(fileId);
      setPrepStatus("Step 2/3: Chunking document...");
      await fileService.chunkFile(fileId);
      setPrepStatus("Step 3/3: Generating embeddings...");
      await fileService.embedFile(fileId);
      setPrepStatus("✅ Document ready! You can now chat.");
      await loadUserFiles();
    } catch (err: any) {
      setPrepStatus("");
      setError(
        err.response?.data?.detail || err.response?.data?.message || "Failed to prepare document."
      );
    } finally {
      setPrepping(false);
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!question.trim() || loading) return;
    if (chatMode === "document" && !fileId) {
      setError("Please select a document first.");
      return;
    }

    const userPrompt = question.trim();
    setQuestion("");
    setError("");

    // Optimistic user bubble
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setLoading(true);

    try {
      if (chatMode === "document") {
        // ── File-scoped RAG (/api/files/{id}/chat) ──
        const response = await api.post(`/api/files/${fileId}/chat`, {
          query: userPrompt,
          question: userPrompt,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.data.answer || "",
            sources: response.data.sources || [],
          },
        ]);
      } else {
        // ── Session-based RAG (/api/chat) ──
        const result = await fileService.chatSession(
          sessionId,
          userPrompt,
          scopeFileId || undefined
        );
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.answer,
            sessionSources: result.sources || [],
          },
        ]);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to get an answer. Please try again.";
      setError(msg);
      // Remove the optimistic user bubble on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const selectedFile = userFiles.find((f) => (f.id || f._id) === fileId);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-6 py-3 shrink-0 flex justify-between items-center z-10">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"
          >
            OmniVerse
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">Dashboard</Link>
            <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">My Documents</Link>
            <Link href="/upload" className="text-zinc-400 hover:text-zinc-200 transition">Upload</Link>
            <Link href="/chat" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">RAG Chat</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/50 text-xs">
            <button
              onClick={() => switchMode("document")}
              className={`px-3 py-1 rounded-md transition font-medium ${
                chatMode === "document"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              📄 Document
            </button>
            <button
              onClick={() => switchMode("session")}
              className={`px-3 py-1 rounded-md transition font-medium ${
                chatMode === "session"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              💬 Session
            </button>
          </div>

          {chatMode === "session" && (
            <button
              onClick={newSessionChat}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg transition"
            >
              + New Chat
            </button>
          )}

          {chatMode === "document" && messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg transition"
            >
              Clear Chat
            </button>
          )}

          <span className="text-sm text-zinc-400 hidden md:inline">
            <span className="text-zinc-200 font-medium">{user?.full_name || user?.name || user?.email}</span>
          </span>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Toolbar (Document mode) ────────────────────────────────────── */}
      {chatMode === "document" && (
        <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-6 py-2.5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-zinc-400 shrink-0 font-medium">Document:</span>
            {userFiles.length > 0 ? (
              <select
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate max-w-md"
              >
                {userFiles.map((f) => (
                  <option key={f.id || f._id} value={f.id || f._id}>
                    📄 {f.originalName} ({f.id || f._id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                placeholder="Enter File ID"
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200 text-xs font-mono w-64"
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            {prepStatus && (
              <span className="text-indigo-400 animate-pulse">{prepStatus}</span>
            )}
            <button
              onClick={prepareDocument}
              disabled={prepping || !fileId}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition disabled:opacity-40 font-medium"
            >
              {prepping ? "Processing..." : "⚡ Auto-Prepare"}
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar (Session mode) ─────────────────────────────────────── */}
      {chatMode === "session" && (
        <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-6 py-2.5 shrink-0 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-zinc-500">Session:</span>
            <code className="bg-zinc-800 px-2 py-0.5 rounded text-indigo-300 font-mono text-[10px]">
              {sessionId.slice(0, 20)}…
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Scope to doc (optional):</span>
            {userFiles.length > 0 ? (
              <select
                value={scopeFileId}
                onChange={(e) => setScopeFileId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs"
              >
                <option value="">All documents</option>
                {userFiles.map((f) => (
                  <option key={f.id || f._id} value={f.id || f._id}>
                    📄 {f.originalName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={scopeFileId}
                onChange={(e) => setScopeFileId(e.target.value)}
                placeholder="File ID (optional)"
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-200 text-xs font-mono w-48"
              />
            )}
          </div>
          <span className="text-zinc-600 hidden sm:inline">
            Context-aware RAG — remembers last 10 turns
          </span>
        </div>
      )}

      {/* ── Messages Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">

        {historyLoading && (
          <div className="text-center py-8 text-zinc-500 text-sm flex items-center justify-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Loading message thread...</span>
          </div>
        )}

        {/* Welcome screen */}
        {!historyLoading && messages.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🤖</div>
            <h2 className="text-2xl font-bold text-white">
              {chatMode === "session" ? "OmniVerse AI" : "OmniVerse RAG Chat"}
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
              {chatMode === "session"
                ? "Ask questions across your uploaded documents. OmniVerse remembers your conversation context."
                : `Ask any question about ${selectedFile?.originalName || "your document"}. Gemini will retrieve relevant passages and cite sources.`}
            </p>
            {chatMode === "session" && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["What is the main topic?", "Summarise the key points.", "What are the conclusions?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-full transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* Role label */}
            <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-400">
              {msg.role === "user" ? (
                <>
                  <span className="font-semibold text-zinc-300">You</span>
                  <span>👤</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span className="font-bold text-indigo-400">OmniVerse AI</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-xl"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* ── Document-mode sources (chunkId-based) ── */}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    📚 Sources ({msg.sources.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.sources.map((src, sIdx) => (
                      <div
                        key={src.chunkId || sIdx}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-indigo-400 font-medium">
                          <span>
                            {src.filename
                              ? `📄 ${src.filename}`
                              : `Source #${src.source || sIdx + 1}`}
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {((src.score ?? src.similarity ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        {src.page != null && (
                          <p className="text-zinc-500 text-[10px]">Page {src.page}</p>
                        )}
                        {src.chunkId && (
                          <p className="text-[10px] font-mono text-zinc-600 truncate">
                            ID: {src.chunkId}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Session-mode sources (filename/page/similarity) ── */}
              {msg.role === "assistant" && msg.sessionSources && msg.sessionSources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    📚 Sources ({msg.sessionSources.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {msg.sessionSources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 text-indigo-300 font-medium truncate">
                          <span>📄</span>
                          <span className="truncate">{src.filename || "Unknown"}</span>
                          {src.page != null && (
                            <span className="text-zinc-500 shrink-0">— Page {src.page}</span>
                          )}
                        </div>
                        <span className="text-emerald-400 font-mono text-[11px] shrink-0 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          {(src.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-400">
              <span>🤖</span>
              <span className="font-bold text-indigo-400">OmniVerse AI</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 text-sm text-zinc-400 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Searching context &amp; generating response...</span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Footer ───────────────────────────────────────────────── */}
      <footer className="bg-zinc-900/90 border-t border-zinc-800 p-4 shrink-0 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === "session"
                ? "Ask something about your documents... (Enter to send)"
                : "Ask about this document... (Enter to send, Shift+Enter for new line)"
            }
            rows={2}
            disabled={loading}
            className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !question.trim() || (chatMode === "document" && !fileId)}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 flex items-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <span className="text-indigo-300 text-xs">↵</span>
              </>
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-600 mt-2">
          {chatMode === "session"
            ? `Session chat · context-aware · last 10 turns · ID: ${sessionId.slice(0, 8)}…`
            : `Document chat · file-scoped · ${selectedFile?.originalName || "no file selected"}`}
        </p>
      </footer>
    </main>
  );
}
