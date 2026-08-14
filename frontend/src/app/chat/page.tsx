"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, {
  UserFile,
  RagSource,
  SessionChatSource,
  ChatSession,
} from "@/services/fileService";
import api from "@/lib/api";
import ChatSidebar from "@/components/ChatSidebar";
import VoiceControls from "@/components/VoiceControls";

type ChatMode = "document" | "session";

interface MessageUI {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  sessionSources?: SessionChatSource[];
  createdAt?: string;
}

export default function ChatPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Mode state
  const [chatMode, setChatMode] = useState<ChatMode>("session");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Document Chat state
  const [fileId, setFileId] = useState("");
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [prepStatus, setPrepStatus] = useState("");
  const [prepping, setPrepping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sessions Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : `session-${Date.now()}`
  );

  // Advanced Search Modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Shared Chat State
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  // Load user files & chat sessions
  const loadInitialData = useCallback(async () => {
    try {
      const [files, userSessions] = await Promise.all([
        fileService.getUserFiles(),
        fileService.getChatSessions(),
      ]);
      setUserFiles(files);
      setSessions(userSessions);

      const urlFileId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("fileId")
          : null;
      if (urlFileId) {
        setFileId(urlFileId);
        setSelectedFileIds([urlFileId]);
        setChatMode("document");
      } else if (files.length > 0 && !fileId) {
        setFileId(files[0].id || files[0]._id || "");
        setSelectedFileIds(files.map((f) => f.id || f._id || ""));
      }

      if (userSessions.length > 0 && chatMode === "session") {
        setSessionId(userSessions[0].sessionId);
      }
    } catch {
      // ignore
    }
  }, [fileId, chatMode]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadInitialData();
  }, [mounted, isAuthenticated, loadInitialData]);

  // Load session history when sessionId changes
  const loadSessionHistory = useCallback(async (targetSessionId: string) => {
    if (!targetSessionId || chatMode !== "session") return;
    try {
      setHistoryLoading(true);
      setError("");
      const history = await fileService.getSessionHistory(targetSessionId);
      setMessages(
        history.map((m) => ({
          id: m.id || m._id,
          role: m.role,
          content: m.message,
          createdAt: m.createdAt,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [chatMode]);

  // Load document chat history
  const loadDocChatHistory = useCallback(async (targetFileId: string) => {
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
    if (chatMode === "session" && sessionId) {
      loadSessionHistory(sessionId);
    } else if (chatMode === "document" && fileId) {
      loadDocChatHistory(fileId);
    }
  }, [sessionId, fileId, chatMode, loadSessionHistory, loadDocChatHistory]);

  // Session Handlers
  const handleCreateSession = async () => {
    try {
      const newSession = await fileService.createChatSession("New Chat", selectedFileIds);
      setSessions((prev) => [newSession, ...prev]);
      setSessionId(newSession.sessionId);
      setMessages([]);
      setError("");
    } catch {
      const fallbackId = crypto.randomUUID();
      setSessionId(fallbackId);
      setMessages([]);
    }
  };

  const handleRenameSession = async (sid: string, newTitle: string) => {
    try {
      const updated = await fileService.renameChatSession(sid, newTitle);
      setSessions((prev) => prev.map((s) => (s.sessionId === sid ? updated : s)));
    } catch {
      alert("Failed to rename chat session.");
    }
  };

  const handleDeleteSession = async (sid: string) => {
    try {
      await fileService.deleteChatSession(sid);
      const remaining = sessions.filter((s) => s.sessionId !== sid);
      setSessions(remaining);
      if (remaining.length > 0) {
        setSessionId(remaining[0].sessionId);
      } else {
        handleCreateSession();
      }
    } catch {
      alert("Failed to delete chat session.");
    }
  };

  // Multi-document toggle
  const handleToggleFileId = (fid: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  const handleSelectAllFiles = () => {
    setSelectedFileIds(userFiles.map((f) => f.id || f._id || ""));
  };

  const handleClearFiles = () => {
    setSelectedFileIds([]);
  };

  // Prepare document
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
      setPrepStatus("✅ Document ready! You can chat now.");
      await loadInitialData();
    } catch (err: any) {
      setPrepStatus("");
      setError(err.response?.data?.detail || "Failed to prepare document.");
    } finally {
      setPrepping(false);
    }
  };

  // Send Chat Message
  const sendMessage = async () => {
    if (!question.trim() || loading) return;

    const userPrompt = question.trim();
    setQuestion("");
    setError("");

    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setLoading(true);

    try {
      if (chatMode === "document") {
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
        const result = await fileService.chatSession(
          sessionId,
          userPrompt,
          undefined,
          selectedFileIds
        );
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.answer,
            sessionSources: result.sources || [],
          },
        ]);
        // Refresh sessions list to show lastMessage update
        const updatedSessions = await fileService.getChatSessions();
        setSessions(updatedSessions);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to generate response.";
      setError(msg);
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

  // Run Advanced Hybrid Search
  const runAdvancedSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      const res = await fileService.advancedSearch(
        searchQuery.trim(),
        selectedFileIds.length > 0 ? selectedFileIds : undefined
      );
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const selectedFile = userFiles.find((f) => (f.id || f._id) === fileId);

  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <header className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-4 md:px-6 py-3 shrink-0 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-800"
          >
            ☰
          </button>
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            OmniVerse
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">Dashboard</Link>
            <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">My Documents</Link>
            <Link href="/chat" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">RAG Chat</Link>
            <Link href="/study" className="text-zinc-400 hover:text-zinc-200 transition">AI Study Mode</Link>
            <Link href="/analytics" className="text-zinc-400 hover:text-zinc-200 transition">Analytics</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/50 text-xs">
            <button
              onClick={() => setChatMode("session")}
              className={`px-3 py-1 rounded-md transition font-medium ${
                chatMode === "session" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              💬 Sessions
            </button>
            <button
              onClick={() => setChatMode("document")}
              className={`px-3 py-1 rounded-md transition font-medium ${
                chatMode === "document" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              📄 Single Doc
            </button>
          </div>

          <button
            onClick={() => setShowSearchModal(true)}
            className="hidden sm:flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <span>🔎 Advanced Search</span>
          </button>

          <span className="text-sm text-zinc-400 hidden md:inline">
            <span className="text-zinc-200 font-medium">{user?.full_name || user?.email}</span>
          </span>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Chat Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {chatMode === "session" && (
          <ChatSidebar
            sessions={sessions}
            activeSessionId={sessionId}
            onSelectSession={(sid) => { setSessionId(sid); setSidebarOpen(false); }}
            onNewSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            userFiles={userFiles}
            selectedFileIds={selectedFileIds}
            onToggleFileId={handleToggleFileId}
            onSelectAllFiles={handleSelectAllFiles}
            onClearFiles={handleClearFiles}
            isOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
          {/* Single Doc Toolbar */}
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
                {prepStatus && <span className="text-indigo-400 animate-pulse">{prepStatus}</span>}
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

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
            {historyLoading && (
              <div className="text-center py-8 text-zinc-500 text-sm flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span>Loading conversation thread...</span>
              </div>
            )}

            {!historyLoading && messages.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="text-6xl">🤖</div>
                <h2 className="text-2xl font-bold text-white">OmniVerse RAG Assistant</h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                  Ask multi-document questions across your library. Reranking and vector search ensure grounded, precise answers with source citations.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[
                    "Compare DevOps Unit 2 and Unit 3.",
                    "What are the main architectural conclusions?",
                    "Summarize key deployment concepts.",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs px-3.5 py-1.5 rounded-full transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
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

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-xl"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Document-mode sources */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        📚 Reranked Sources ({msg.sources.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.sources.map((src, sIdx) => (
                          <div key={src.chunkId || sIdx} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between text-indigo-400 font-medium">
                              <span className="truncate">📄 {src.filename || `Source #${src.source || sIdx + 1}`}</span>
                              <span className="text-emerald-400 font-mono text-[10px]">
                                {((src.score ?? src.similarity ?? 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                            {src.page != null && <p className="text-zinc-500 text-[10px]">Page {src.page}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Session-mode multi-doc sources */}
                  {msg.role === "assistant" && msg.sessionSources && msg.sessionSources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        📚 Context Sources ({msg.sessionSources.length})
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {msg.sessionSources.map((src, sIdx) => (
                          <div key={sIdx} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-indigo-300 font-medium truncate">
                              <span>📄</span>
                              <span className="truncate">{src.filename || "Unknown"}</span>
                              {src.page != null && <span className="text-zinc-500 shrink-0">— Page {src.page}</span>}
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
                  <span>Reranking candidates &amp; generating grounded answer...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Controls */}
          <footer className="bg-zinc-900/90 border-t border-zinc-800 p-4 shrink-0 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatMode === "session"
                    ? `Ask something across ${selectedFileIds.length} selected documents...`
                    : `Ask about ${selectedFile?.originalName || "document"}...`
                }
                rows={2}
                disabled={loading}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
              />

              {/* Voice STT & TTS Controls */}
              <VoiceControls
                onSpeechResult={(spokenText) => {
                  setQuestion(spokenText);
                  textareaRef.current?.focus();
                }}
                textToSpeak={lastAssistantMessage?.content}
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
          </footer>
        </div>
      </div>

      {/* Advanced Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔎</span>
                <span>Advanced Hybrid Search Engine</span>
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAdvancedSearch()}
                placeholder="Enter keywords or semantic query..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={runAdvancedSearch}
                disabled={searchLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {searchResults.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">
                  No hybrid search results yet. Enter a query above.
                </p>
              ) : (
                searchResults.map((item, idx) => (
                  <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-indigo-400 font-medium">
                      <span>📄 {item.source?.filename || item.source?.fileId}</span>
                      <span className="text-emerald-400 font-mono">Score: {(item.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">{item.text}</p>
                    {item.source?.page && <span className="text-zinc-500 text-[10px] block">Page {item.source.page}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
