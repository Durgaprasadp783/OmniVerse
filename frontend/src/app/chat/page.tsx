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
import {
  MessageSquare,
  Search,
  Zap,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  FileText,
  Menu,
  X
} from "lucide-react";

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
  const { user, isAuthenticated, isLoading } = useAuth();
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
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load user files
  const loadFiles = useCallback(async () => {
    try {
      const data = await fileService.getUserFiles();
      setUserFiles(data);
      if (data.length > 0) {
        const firstId = data[0].id || data[0]._id || "";
        setFileId(firstId);
        setSelectedFileIds(data.map((f) => f.id || f._id || ""));
      }
    } catch {
      // ignore on unauth
    }
  }, []);

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await fileService.getChatSessions();
      setSessions(data);
      if (data.length > 0 && !sessionId) {
        setSessionId(data[0].sessionId);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  // Load session messages
  const loadSessionMessages = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      setHistoryLoading(true);
      setError(null);
      const hist = await fileService.getSessionHistory(sid);
      setMessages(
        hist.map((m) => ({
          id: m.id || m._id,
          role: m.role,
          content: m.message,
          createdAt: m.createdAt,
        }))
      );
    } catch {
      setError("Failed to load session messages.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFiles();
      loadSessions();
    }
  }, [mounted, isAuthenticated, loadFiles, loadSessions]);

  useEffect(() => {
    if (mounted && isAuthenticated && chatMode === "session" && sessionId) {
      loadSessionMessages(sessionId);
    }
  }, [mounted, isAuthenticated, chatMode, sessionId, loadSessionMessages]);

  const handleCreateSession = async () => {
    try {
      const newSess = await fileService.createChatSession(
        `Chat Thread ${sessions.length + 1}`,
        selectedFileIds
      );
      setSessions((prev) => [newSess, ...prev]);
      setSessionId(newSess.sessionId);
      setMessages([]);
      setSidebarOpen(false);
    } catch {
      alert("Failed to create new chat thread.");
    }
  };

  const handleDeleteSession = async (sid: string) => {
    if (!confirm("Are you sure you want to delete this thread?")) return;
    try {
      await fileService.deleteChatSession(sid);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sid));
      if (sessionId === sid) {
        const remaining = sessions.filter((s) => s.sessionId !== sid);
        if (remaining.length > 0) {
          setSessionId(remaining[0].sessionId);
        } else {
          setSessionId(`session-${Date.now()}`);
          setMessages([]);
        }
      }
    } catch {
      alert("Failed to delete chat thread.");
    }
  };

  const handleRenameSession = async (sid: string, newTitle: string) => {
    try {
      await fileService.renameChatSession(sid, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sid ? { ...s, title: newTitle } : s))
      );
    } catch {
      alert("Failed to rename thread.");
    }
  };

  const handleToggleFileId = (fId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  const handleSelectAllFiles = () => {
    setSelectedFileIds(userFiles.map((f) => f.id || f._id || ""));
  };

  const handleClearFiles = () => {
    setSelectedFileIds([]);
  };

  const prepareDocument = async () => {
    if (!fileId) return;
    try {
      setPrepping(true);
      setPrepStatus("Extracting text from document...");
      await fileService.processFile(fileId);

      setPrepStatus("Generating vector chunks...");
      await fileService.chunkFile(fileId);

      setPrepStatus("Generating Gemini vector embeddings...");
      await fileService.embedFile(fileId);

      setPrepStatus("Vector embeddings generated successfully!");
      setTimeout(() => setPrepStatus(""), 3000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Auto-prep failed.";
      setPrepStatus(`Error: ${detail}`);
    } finally {
      setPrepping(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMessage: MessageUI = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      if (chatMode === "session") {
        const res = await fileService.chatSession(
          sessionId,
          trimmed,
          undefined,
          selectedFileIds
        );
        const assistantMessage: MessageUI = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.answer,
          sessionSources: res.sources,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const res = await fileService.chatWithFile(fileId, trimmed);
        const assistantMessage: MessageUI = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to get an answer. Please check if your documents are indexed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const runAdvancedSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      const res = await api.post("/api/hybrid-search", {
        query: searchQuery.trim(),
        fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
        limit: 8,
      });
      setSearchResults(res.data?.results || []);
    } catch {
      alert("Advanced search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-white text-slate-900">
        <div className="h-8 w-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const selectedFile = userFiles.find((f) => (f.id || f._id) === fileId);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      
      {/* Top Toolbar Inside Workspace */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setChatMode("session")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                chatMode === "session"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💬 Multi-Doc Sessions
            </button>
            <button
              onClick={() => setChatMode("document")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                chatMode === "document"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📄 Single Document
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Hybrid Search</span>
          </button>
        </div>
      </div>

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
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
          {/* Single Doc Toolbar */}
          {chatMode === "document" && (
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-slate-500 shrink-0 font-bold">Document:</span>
                {userFiles.length > 0 ? (
                  <select
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 truncate max-w-md"
                  >
                    {userFiles.map((f) => (
                      <option key={f.id || f._id} value={f.id || f._id}>
                        📄 {f.originalName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    placeholder="Enter File ID"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-xs font-mono w-64"
                  />
                )}
              </div>
              <div className="flex items-center gap-3">
                {prepStatus && <span className="text-purple-600 font-semibold animate-pulse">{prepStatus}</span>}
                <button
                  onClick={prepareDocument}
                  disabled={prepping || !fileId}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg transition disabled:opacity-40 font-bold flex items-center gap-1"
                >
                  <Zap className="h-3.5 w-3.5 text-purple-600" />
                  <span>{prepping ? "Processing..." : "Auto-Prepare"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
            {historyLoading && (
              <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                <span>Loading conversation thread...</span>
              </div>
            )}

            {!historyLoading && messages.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 mx-auto shadow-sm">
                  <Bot className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">OmniVerse RAG Assistant</h2>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-normal">
                  Ask grounded questions across your uploaded documents. Vector hybrid search and cross-encoder reranking provide page-level citations.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    "Summarize the key findings.",
                    "What are the main concepts in these documents?",
                    "Compare the conclusions and recommendations.",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
                      className="bg-white hover:bg-purple-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-1.5 rounded-full transition shadow-2xs cursor-pointer font-medium"
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
                <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400 font-semibold">
                  {msg.role === "user" ? (
                    <>
                      <span>You</span>
                      <UserIcon className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      <span className="font-bold text-purple-700">OmniVerse AI</span>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-purple-600/10"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Document-mode sources */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                        📚 Reranked Sources ({msg.sources.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.sources.map((src, sIdx) => (
                          <div key={src.chunkId || sIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-1">
                            <div className="flex items-center justify-between text-purple-700 font-semibold">
                              <span className="truncate">📄 {src.filename || `Source #${src.source || sIdx + 1}`}</span>
                              <span className="text-emerald-600 font-mono text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                                {((src.score ?? src.similarity ?? 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                            {src.page != null && <p className="text-slate-400 text-[10px]">Page {src.page}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Session-mode multi-doc sources */}
                  {msg.role === "assistant" && msg.sessionSources && msg.sessionSources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                        📚 Context Sources ({msg.sessionSources.length})
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {msg.sessionSources.map((src, sIdx) => (
                          <div key={sIdx} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-800 font-medium truncate">
                              <span>📄</span>
                              <span className="truncate">{src.filename || "Unknown"}</span>
                              {src.page != null && <span className="text-slate-400 shrink-0">— Page {src.page}</span>}
                            </div>
                            <span className="text-emerald-700 font-mono text-[11px] shrink-0 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
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
                <div className="flex items-center gap-2 mb-1.5 text-xs text-purple-700 font-bold">
                  <Bot className="h-3.5 w-3.5" />
                  <span>OmniVerse AI</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 text-xs text-slate-500 flex items-center gap-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Reranking candidates &amp; generating grounded answer...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Controls */}
          <footer className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-xs">
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
                className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white resize-none disabled:opacity-50 transition"
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
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* Advanced Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-600" />
                <span>Advanced Hybrid Search Engine</span>
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAdvancedSearch()}
                placeholder="Enter keywords or semantic query..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <button
                onClick={runAdvancedSearch}
                disabled={searchLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No hybrid search results yet. Enter a query above.
                </p>
              ) : (
                searchResults.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-purple-700 font-bold">
                      <span>📄 {item.source?.filename || item.source?.fileId}</span>
                      <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Score: {(item.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{item.text}</p>
                    {item.source?.page && <span className="text-slate-400 text-[10px] block">Page {item.source.page}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
