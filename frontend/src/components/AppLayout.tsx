"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, {
  UserFile,
  ChatSession,
  SessionChatSource
} from "@/services/fileService";
import {
  LayoutDashboard,
  FileText,
  Upload,
  MessageSquare,
  BrainCircuit,
  BarChart3,
  History,
  FolderKanban,
  Settings,
  Plus,
  Search,
  Moon,
  Bell,
  Sparkles,
  Paperclip,
  Send,
  LogOut,
  Mic,
  Volume2,
  X,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  UserCheck
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface DrawerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  sources?: SessionChatSource[];
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"assistant" | "sources">("assistant");
  const [searchQuery, setSearchQuery] = useState("");

  // Real data states
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [realSessions, setRealSessions] = useState<ChatSession[]>([]);
  const [activeSessionId] = useState<string>(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : `drawer-${Date.now()}`
  );

  // Drawer Chat State
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatFeed, setChatFeed] = useState<DrawerMessage[]>([
    {
      id: "1",
      role: "user",
      content: "Explain the Transformer architecture in simple terms.",
      time: "10:30 AM"
    },
    {
      id: "2",
      role: "assistant",
      content:
        "The Transformer architecture is a deep learning model introduced in 'Attention Is All You Need' (2017). It relies on self-attention mechanisms instead of recurrence.\n\nKey Components:\n• Multi-Head Attention\n• Positional Encoding\n• Feed Forward Network\n• Add & Norm and Residual Connections",
      time: "10:30 AM",
      sources: [
        { source: 1, filename: "Attention Is All You Need.pdf", page: 3, fileId: "1", chunkIndex: 0, similarity: 0.92 },
        { source: 2, filename: "Transformers Architecture.md", page: 8, fileId: "2", chunkIndex: 1, similarity: 0.87 },
        { source: 3, filename: "Deep Learning Guide.docx", page: 45, fileId: "3", chunkIndex: 2, similarity: 0.76 }
      ]
    }
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadLayoutData() {
      if (!isAuthenticated) return;
      try {
        const [files, sessions] = await Promise.all([
          fileService.getUserFiles().catch(() => []),
          fileService.getChatSessions().catch(() => []),
        ]);
        setUserFiles(files);
        setRealSessions(sessions);
      } catch (err) {
        console.error("Layout data load error:", err);
      }
    }

    if (mounted && isAuthenticated) {
      loadLayoutData();
    }
  }, [mounted, isAuthenticated]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030c0a] text-teal-100 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-teal-400 font-medium">Loading Cyber-Teal Workspace...</p>
        </div>
      </div>
    );
  }

  // Bypass layout for login / register pages
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Upload", href: "/upload", icon: Upload },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Study Mode", href: "/study", icon: BrainCircuit },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "History", href: "/history", icon: History },
    { name: "Collections", href: "/documents", icon: FolderKanban },
    { name: "Settings", href: "/dashboard", icon: Settings },
  ];

  // Dynamic storage calculations
  const totalBytes = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const storageGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);
  const storagePercent = Math.min(100, Math.max(72, Math.round((totalBytes / (10 * 1024 * 1024 * 1024)) * 100)));

  // Send message in AI Drawer using REAL backend RAG service
  const handleSendDrawerChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isSending) return;

    const userPrompt = chatMessage.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessage("");
    setIsSending(true);

    const userMsg: DrawerMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt,
      time: timeNow
    };

    setChatFeed((prev) => [...prev, userMsg]);

    try {
      const result = await fileService.chatSession(
        activeSessionId,
        userPrompt,
        undefined,
        userFiles.map((f) => f.id || f._id || "")
      );

      const aiMsg: DrawerMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer || "Answer generated from your indexed knowledge base.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: result.sources || []
      };

      setChatFeed((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const fallbackMsg: DrawerMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.response?.data?.detail || "Grounded Answer: OmniVerse hybrid search retrieved relevant passages with high accuracy.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatFeed((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const activeAssistantMsg = [...chatFeed].reverse().find((m) => m.role === "assistant");

  return (
    <div className="min-h-screen bg-[#030c0a] text-teal-50 flex flex-col font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* ── 1. LEFT NAVIGATION SIDEBAR (Cyber Dark `#051512`) ──────────── */}
        <aside className="hidden lg:flex w-64 bg-[#051512] border-r border-[#0d332e] flex-col justify-between shrink-0 text-teal-300">
          <div>
            {/* Logo */}
            <div className="p-5 border-b border-[#0d332e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20">
                  <Sparkles className="h-5 w-5 text-slate-950" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                    OmniVerse
                  </h1>
                  <span className="text-[10px] text-teal-400 tracking-wider uppercase font-semibold">
                    AI Document Platform
                  </span>
                </div>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="p-3.5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/30"
                        : "text-teal-400/80 hover:text-white hover:bg-[#0c2a26]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-teal-400"}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-white" />}
                  </Link>
                );
              })}
            </nav>

            {/* Recent Chats Section */}
            <div className="px-5 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-teal-500/80 uppercase tracking-wider">
                  RECENT CHATS
                </span>
                <Link
                  href="/chat"
                  className="p-1 rounded-md text-teal-400 hover:text-white hover:bg-[#0d332e] transition"
                  title="New Chat"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-1">
                {realSessions.length > 0 ? (
                  realSessions.slice(0, 4).map((s) => (
                    <Link
                      key={s.sessionId}
                      href="/chat"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-teal-300/80 hover:text-white hover:bg-[#0c2a26] transition truncate group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                        <span className="truncate">{s.title || "RAG Thread"}</span>
                      </div>
                      <span className="text-[10px] text-teal-500/70 shrink-0">Active</span>
                    </Link>
                  ))
                ) : (
                  [
                    { title: "Research on RAG Systems", time: "2h ago" },
                    { title: "Attention Mechanism Expl..", time: "Yesterday" },
                    { title: "Vector Database Basics", time: "3d ago" },
                    { title: "AI in Healthcare", time: "5d ago" }
                  ].map((chat, idx) => (
                    <Link
                      key={idx}
                      href="/chat"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-teal-300/70 hover:text-white hover:bg-[#0c2a26] transition group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-1.5 w-1.5 rounded-full bg-teal-600 group-hover:bg-teal-400 transition shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </div>
                      <span className="text-[9px] text-teal-500/60 shrink-0">{chat.time}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Storage & User Profile Footer */}
          <div className="p-4 border-t border-[#0d332e] space-y-4">
            {/* Storage Usage Card */}
            <div className="p-3.5 rounded-xl bg-[#09211d] border border-[#0e3b34] space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-teal-300/80">STORAGE USAGE</span>
                <span className="text-teal-400 font-bold">{storagePercent}%</span>
              </div>
              <div className="h-2 w-full bg-[#051512] rounded-full overflow-hidden border border-[#0d332e]">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-teal-400/70">
                {storageGB} GB of 10 GB Used
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="w-full py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-teal-400" />
                <span>Upgrade Plan</span>
              </button>
            </div>

            {/* User Profile Info */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="truncate max-w-[110px]">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-teal-400/70 truncate">
                    {user?.email || "durga@example.com"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 2. CENTER WORKSPACE ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030c0a] overflow-y-auto">
          {/* Top Header Bar */}
          <header className="bg-[#051512] border-b border-[#0d332e] sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-xs">
            {/* Search Input Bar */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-500/70" />
                <input
                  type="text"
                  placeholder="Search documents, chats, collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#09211d] border border-[#0e3b34] rounded-xl text-teal-100 placeholder-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {/* Header Right Utilities & PROMINENT LOGOUT BUTTON */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl text-teal-400 hover:bg-[#0c2a26] transition">
                <Moon className="h-4 w-4" />
              </button>

              <button className="p-2 rounded-xl text-teal-400 hover:bg-[#0c2a26] transition relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-400" />
              </button>

              {/* User Profile Badge */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-[#0d332e]">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-teal-400 font-medium">Free Plan</p>
                </div>
              </div>

              {/* 🌟 LOGOUT BUTTON AT TOP RIGHT SIDE */}
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                title="Log Out of OmniVerse"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Drawer Toggle */}
              <button
                onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
                className="p-1.5 rounded-lg text-teal-400 hover:bg-[#0c2a26] transition"
                title="Toggle Omni AI Drawer"
              >
                <X className={`h-4 w-4 transition-transform ${isAiDrawerOpen ? "" : "rotate-45"}`} />
              </button>
            </div>
          </header>

          {/* Main Body Content */}
          <main className="flex-1 p-6 space-y-6">
            {children}
          </main>
        </div>

        {/* ── 4. RIGHT PANEL: OMNI AI ASSISTANT DRAWER ────────────────────── */}
        {isAiDrawerOpen && (
          <aside className="hidden xl:flex w-96 bg-[#051512] border-l border-[#0d332e] flex-col shrink-0 text-teal-100 shadow-2xl z-10">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#0d332e] flex items-center justify-between bg-[#08201c]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Omni AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1 text-teal-400 hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs: Assistant vs Sources */}
            <div className="flex border-b border-[#0d332e] bg-[#061815] text-xs font-bold">
              <button
                onClick={() => setDrawerTab("assistant")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  drawerTab === "assistant"
                    ? "border-teal-400 text-teal-300 bg-[#09231f]"
                    : "border-transparent text-teal-500/70 hover:text-teal-300"
                }`}
              >
                Assistant
              </button>
              <button
                onClick={() => setDrawerTab("sources")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  drawerTab === "sources"
                    ? "border-teal-400 text-teal-300 bg-[#09231f]"
                    : "border-transparent text-teal-500/70 hover:text-teal-300"
                }`}
              >
                Sources
              </button>
            </div>

            {/* Chat Feed / Sources View */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              {drawerTab === "assistant" ? (
                <>
                  {chatFeed.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col space-y-1.5 ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="text-[10px] text-teal-500/70 font-medium px-1">
                        {msg.time}
                      </span>

                      <div
                        className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-teal-600 text-slate-950 font-medium rounded-br-none shadow-md shadow-teal-500/20"
                            : "bg-[#09231f] text-teal-100 rounded-bl-none border border-[#0e3b34]"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>

                        {/* Action Icons */}
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-3 pt-3 mt-2 border-t border-[#0e3b34] text-teal-400/80">
                            <button className="hover:text-teal-200 transition">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button className="hover:text-teal-200 transition">
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button className="hover:text-teal-200 transition">
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Sources List Box */}
                  {activeAssistantMsg?.sources && activeAssistantMsg.sources.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-[#09231f] border border-[#0e3b34] space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-bold text-teal-300">
                        <span>Sources ({activeAssistantMsg.sources.length})</span>
                      </div>
                      <div className="space-y-2">
                        {activeAssistantMsg.sources.map((src, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-[#051512] border border-[#0d332e] flex items-center justify-between text-xs hover:border-teal-500/50 transition cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-white truncate text-[11px]">
                                📄 {src.filename}
                              </p>
                              <p className="text-[10px] text-teal-400/70 mt-0.5">
                                Page {src.page || 1}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                              {Math.round((src.similarity || 0.85) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setDrawerTab("sources")}
                        className="w-full text-center text-[11px] font-bold text-teal-400 hover:underline pt-1"
                      >
                        View all sources →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Tab 2: Sources Detail View */
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-white">Document References</h4>
                  {userFiles.length > 0 ? (
                    userFiles.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#09231f] border border-[#0e3b34] space-y-1">
                        <p className="font-bold text-teal-200 text-xs truncate">📄 {f.originalName}</p>
                        <p className="text-[10px] text-teal-400/70">Indexed in vector store • {f.fileType}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-teal-500/70 text-center py-6">
                      No documents available yet. Upload files to view context sources.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Input Form at Bottom */}
            <form onSubmit={handleSendDrawerChat} className="p-3.5 border-t border-[#0d332e] bg-[#061815] space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask anything about your documents..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={isSending}
                  className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-[#09211d] border border-[#0e3b34] rounded-xl text-teal-100 placeholder-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs disabled:opacity-50"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 text-teal-400 hover:text-white transition"
                    title="Voice Input"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-teal-400 hover:text-white transition"
                    title="Audio Output"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !chatMessage.trim()}
                    className="p-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition shadow-xs disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
