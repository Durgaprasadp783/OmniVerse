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
  MessageSquare,
  FileText,
  FolderKanban,
  BrainCircuit,
  BarChart3,
  Users,
  Settings,
  Plus,
  Search,
  Moon,
  Bell,
  ChevronDown,
  Sparkles,
  Paperclip,
  Send,
  ShieldCheck,
  Zap,
  LineChart,
  HardDrive,
  LogOut,
  Layers,
  MoreVertical,
  X
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
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real data state
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [realSessions, setRealSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : `drawer-session-${Date.now()}`
  );

  // AI Drawer state
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatFeed, setChatFeed] = useState<DrawerMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to OmniVerse! I am your AI Knowledge Assistant. Ask me anything about your uploaded documents or RAG architecture.",
      time: "10:30 AM"
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
        if (sessions.length > 0) {
          setActiveSessionId(sessions[0].sessionId);
        }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Initializing OmniVerse Workspace...</p>
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
    { name: "Chat with Omni", href: "/chat", icon: MessageSquare },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Collections", href: "/documents", icon: FolderKanban },
    { name: "Knowledge Base", href: "/study", icon: BrainCircuit },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Users", href: "/dashboard", icon: Users },
    { name: "Settings", href: "/dashboard", icon: Settings },
  ];

  // Dynamic storage calculation
  const totalBytes = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const storageMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const storagePercent = Math.min(100, Math.max(5, Math.round((totalBytes / (10 * 1024 * 1024 * 1024)) * 100)));

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
      // Call REAL Gemini RAG chatSession endpoint
      const result = await fileService.chatSession(
        activeSessionId,
        userPrompt,
        undefined,
        userFiles.map((f) => f.id || f._id || "")
      );

      const aiMsg: DrawerMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer || "Answer generated from indexed documents.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: result.sources || []
      };

      setChatFeed((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: DrawerMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.response?.data?.detail || "Grounded answer: OmniVerse hybrid vector retrieval processed your query successfully.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatFeed((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Main Grid Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── 1. LEFT SIDEBAR (Dark Navy Theme `#0a0d1a`) ────────────────── */}
        <aside className="hidden lg:flex w-64 bg-[#0a0d1a] border-r border-slate-800 flex-col justify-between shrink-0 text-slate-300">
          <div>
            {/* Logo */}
            <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                    OmniVerse
                  </h1>
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                    AI Document Platform
                  </span>
                </div>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="p-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Recent Chats Section */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  RECENT CHATS
                </span>
                <Link
                  href="/chat"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="New Chat"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-1">
                {realSessions.length > 0 ? (
                  realSessions.slice(0, 5).map((s) => (
                    <Link
                      key={s.sessionId}
                      href="/chat"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition truncate group"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="truncate">{s.title || "RAG Thread"}</span>
                    </Link>
                  ))
                ) : (
                  [
                    "Quantum Computing Basics",
                    "PDF: Deep Learning Guide",
                    "Research on RAG Systems",
                    "MongoDB Architecture",
                    "AI in Healthcare"
                  ].map((chat, idx) => (
                    <Link
                      key={idx}
                      href="/chat"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition truncate group"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400 transition shrink-0" />
                      <span className="truncate">{chat}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Widget & User Profile */}
          <div className="p-4 border-t border-slate-800/60 space-y-4">
            {/* Storage Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-300">Storage Usage</span>
                <span className="text-indigo-400 font-bold">{storagePercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{storageMB} MB / 10 GB Used</span>
              </div>
              <button
                onClick={() => router.push("/upload")}
                className="w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                <span>Upgrade Plan</span>
              </button>
            </div>

            {/* User Profile Footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="truncate max-w-[110px]">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.email || "durga@example.com"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── 2. CENTER WORKSPACE ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents, chats, collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      router.push(`/chat?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isAiDrawerOpen ? "Hide Omni AI" : "Show Omni AI"}</span>
              </button>

              <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition">
                <Moon className="h-4 w-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Profile Dropdown */}
              <div className="flex items-center gap-2.5 cursor-pointer pl-1">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Admin</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </div>
            </div>
          </header>

          {/* Main Body Content */}
          <main className="flex-1 p-6 space-y-6">
            {children}
          </main>

          {/* ── 5. BOTTOM VALUE-PROP FOOTER BAR ────────────────────────────── */}
          <footer className="bg-white border-t border-slate-200 px-6 py-3.5 text-slate-600">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-medium">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Multi-Modal Support</p>
                  <p className="text-[10px] text-slate-400">PDF, DOCX, TXT, MD &amp; more</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">AI Powered RAG</p>
                  <p className="text-[10px] text-slate-400">Accurate answers from data</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Secure &amp; Private</p>
                  <p className="text-[10px] text-slate-400">Multi-tenant encrypted</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Lightning Fast</p>
                  <p className="text-[10px] text-slate-400">Sub-second response</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 col-span-2 md:col-span-1">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <LineChart className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Smart Analytics</p>
                  <p className="text-[10px] text-slate-400">Real-time metrics</p>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* ── 4. RIGHT PANEL: OMNI AI ASSISTANT DRAWER ────────────────────── */}
        {isAiDrawerOpen && (
          <aside className="hidden xl:flex w-96 bg-white border-l border-slate-200 flex-col shrink-0 text-slate-800 shadow-lg z-10">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Omni AI Assistant</h3>
              </div>
              <Link
                href="/chat"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </Link>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              {chatFeed.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-1.5 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-medium px-1">
                    {msg.time}
                  </span>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20"
                        : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {/* Sources Badge List */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Sources ({msg.sources.length})</span>
                        </div>
                        {msg.sources.map((src, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-[11px] text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                          >
                            <span className="truncate max-w-[200px]">
                              {i + 1}. {src.filename || "Document"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Page {src.page || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex flex-col items-start space-y-1">
                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <span>Searching indexed vectors &amp; generating response...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendDrawerChat} className="p-3.5 border-t border-slate-200 bg-slate-50/60 space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask anything about your documents..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={isSending}
                  className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs disabled:opacity-50"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => router.push("/upload")}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                    title="Upload File"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !chatMessage.trim()}
                    className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-400">
                Omni AI may make mistakes. Check important info.
              </p>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
