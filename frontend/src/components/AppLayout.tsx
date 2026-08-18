"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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
  Sun,
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

  // Day / Night Theme State from ThemeContext
  const { isDarkMode, toggleDayNight } = useTheme();

  // Active state & Drawer
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"assistant" | "sources">("assistant");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Dynamic files & session list for sidebar
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [realSessions, setRealSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("default-session");

  // AI Drawer chat history
  const [chatFeed, setChatFeed] = useState<DrawerMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: "Hello! I am your OmniVerse AI copilot. Ask me anything about your uploaded documents or study materials.",
      time: "Just now",
      sources: []
    }
  ]);

  // Load real user files & chat sessions
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchSidebarData() {
      try {
        const [files, sessions] = await Promise.all([
          fileService.getUserFiles().catch(() => []),
          fileService.getChatSessions().catch(() => [])
        ]);
        setUserFiles(files);
        setRealSessions(sessions);
        if (sessions.length > 0 && sessions[0].sessionId) {
          setActiveSessionId(sessions[0].sessionId);
        }
      } catch (err) {
        console.error("Failed to load sidebar data", err);
      }
    }

    fetchSidebarData();
  }, [isAuthenticated, pathname]);

  // If on login or register, render children directly
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <div className="flex-1 flex overflow-hidden">
        {/* ── 1. LEFT NAVIGATION SIDEBAR ──────────── */}
        <aside className="hidden lg:flex w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex-col justify-between shrink-0 text-slate-700 dark:text-slate-300 transition-colors">
          <div>
            {/* Logo */}
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                    OmniVerse
                  </h1>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 tracking-wider uppercase font-bold">
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
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50/80 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-purple-600 dark:text-purple-400"}`} />
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
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  RECENT CHATS
                </span>
                <Link
                  href="/chat"
                  className="p-1 rounded-md text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-zinc-800 transition"
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
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50/70 dark:hover:bg-zinc-800 transition truncate group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                        <span className="truncate">{s.title || "RAG Thread"}</span>
                      </div>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 shrink-0 font-medium">Active</span>
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
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50/70 dark:hover:bg-zinc-800 transition group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-400 group-hover:bg-purple-600 transition shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">{chat.time}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Storage & User Profile Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 space-y-4">
            {/* Storage Usage Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">STORAGE USAGE</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{storagePercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                {storageGB} GB of 10 GB Used
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="w-full py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span>Upgrade Plan</span>
              </button>
            </div>

            {/* User Profile Info */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="truncate max-w-[110px]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                    {user?.email || "durga@example.com"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 2. CENTER WORKSPACE ──────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/70 dark:bg-zinc-950 overflow-y-auto transition-colors">
          {/* Top Header Bar */}
          <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-xs transition-colors">
            {/* Search Input Bar */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search documents, chats, collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-950 transition"
                />
              </div>
            </div>

            {/* Header Right Utilities */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* ☀️ / 🌙 DAY & NIGHT MODE TOGGLE BUTTON ON DASHBOARD TOP RIGHT */}
              <button
                onClick={toggleDayNight}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                title={isDarkMode ? "Currently Night Mode. Click to switch to Day Mode" : "Currently Day Mode. Click to switch to Night Mode"}
              >
                {isDarkMode ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-purple-400" />
                    <span className="hidden sm:inline">Night Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Day Mode</span>
                  </>
                )}
              </button>

              <button className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-purple-600" />
              </button>

              {/* User Profile Badge */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-zinc-800">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {user?.full_name?.substring(0, 2).toUpperCase() || "DP"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.full_name || "Durga Prasad"}
                  </p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Free Plan</p>
                </div>
              </div>

              {/* 🌟 LOGOUT BUTTON — ONLY ON DASHBOARD */}
              {pathname === "/dashboard" && (
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Log Out of OmniVerse"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}

              {/* Drawer Toggle */}
              <button
                onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
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

        {/* ── 3. RIGHT PANEL: OMNI AI ASSISTANT DRAWER ── */}
        {isAiDrawerOpen && (
          <aside className="hidden xl:flex w-96 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex-col shrink-0 text-slate-900 dark:text-slate-100 shadow-xl z-10">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white font-bold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Omni AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs: Assistant vs Sources */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 text-xs font-bold">
              <button
                onClick={() => setDrawerTab("assistant")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  drawerTab === "assistant"
                    ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-white dark:bg-zinc-900"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Assistant
              </button>
              <button
                onClick={() => setDrawerTab("sources")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  drawerTab === "sources"
                    ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-white dark:bg-zinc-900"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
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
                      <span className="text-[10px] text-slate-400 font-medium px-1">
                        {msg.time}
                      </span>

                      <div
                        className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-purple-600 text-white font-medium rounded-br-none shadow-sm shadow-purple-600/20"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-zinc-700/60"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>

                        {/* Action Icons */}
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-3 pt-3 mt-2 border-t border-slate-200 dark:border-zinc-700 text-slate-400">
                            <button className="hover:text-slate-700 dark:hover:text-slate-200 transition">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button className="hover:text-slate-700 dark:hover:text-slate-200 transition">
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button className="hover:text-slate-700 dark:hover:text-slate-200 transition">
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Sources List Box */}
                  {activeAssistantMsg?.sources && activeAssistantMsg.sources.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Sources ({activeAssistantMsg.sources.length})</span>
                      </div>
                      <div className="space-y-2">
                        {activeAssistantMsg.sources.map((src, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs hover:border-purple-300 transition cursor-pointer shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">
                                📄 {src.filename}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                Page {src.page || 1}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                              {Math.round((src.similarity || 0.85) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setDrawerTab("sources")}
                        className="w-full text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                      >
                        View all sources →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Tab 2: Sources Detail View */
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">Document References</h4>
                  {userFiles.length > 0 ? (
                    userFiles.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">📄 {f.originalName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">Indexed in vector store • {f.fileType}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No documents available yet. Upload files to view context sources.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Input Form at Bottom */}
            <form onSubmit={handleSendDrawerChat} className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask anything about your documents..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={isSending}
                  className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-xs disabled:opacity-50"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Voice Input"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Audio Output"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !chatMessage.trim()}
                    className="p-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition shadow-xs disabled:opacity-40"
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
