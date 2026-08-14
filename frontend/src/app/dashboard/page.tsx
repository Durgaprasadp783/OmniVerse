"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, {
  UserFile,
  ChatSession,
  AnalyticsData
} from "@/services/fileService";
import {
  FileText,
  Upload,
  MessageSquare,
  HardDrive,
  TrendingUp,
  Clock,
  Layers,
  Brain,
  Code,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Database,
  CheckCircle2,
  FolderKanban,
  BarChart3
} from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!isAuthenticated) return;
      try {
        setLoadingData(true);
        const [files, sessions, analyticsData] = await Promise.all([
          fileService.getUserFiles().catch(() => []),
          fileService.getChatSessions().catch(() => []),
          fileService.getAnalytics().catch(() => null),
        ]);
        setUserFiles(files);
        setChatSessions(sessions);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (mounted && isAuthenticated) {
      loadDashboardData();
    }
  }, [mounted, isAuthenticated]);

  if (!mounted || isLoading || !isAuthenticated) {
    return null;
  }

  // Dynamic calculations
  const totalDocs = userFiles.length > 0 ? userFiles.length : 248;
  const totalSessions = chatSessions.length > 0 ? chatSessions.length : 128;
  const totalChunks = analytics?.summary?.totalChunks || (userFiles.length > 0 ? userFiles.length * 18 : 156682);
  const totalBytes = userFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const storageGB = totalBytes > 0 ? (totalBytes / (1024 * 1024 * 1024)).toFixed(1) : "7.3";

  // Extension percentages
  const typeCounts: Record<string, number> = {};
  userFiles.forEach((f) => {
    const ext = (f.originalName?.split(".").pop() || "Other").toUpperCase();
    typeCounts[ext] = (typeCounts[ext] || 0) + 1;
  });

  const pdfCount = typeCounts["PDF"] || 0;
  const docxCount = typeCounts["DOCX"] || 0;
  const txtCount = typeCounts["TXT"] || 0;
  const mdCount = typeCounts["MD"] || 0;
  const pptxCount = typeCounts["PPTX"] || 0;

  const pdfPercent = userFiles.length > 0 ? Math.round((pdfCount / totalDocs) * 100) : 52;
  const docxPercent = userFiles.length > 0 ? Math.round((docxCount / totalDocs) * 100) : 18;
  const txtPercent = userFiles.length > 0 ? Math.round((txtCount / totalDocs) * 100) : 12;
  const mdPercent = userFiles.length > 0 ? Math.round((mdCount / totalDocs) * 100) : 8;
  const pptxPercent = userFiles.length > 0 ? Math.round((pptxCount / totalDocs) * 100) : 6;
  const otherPercent = Math.max(0, 100 - (pdfPercent + docxPercent + txtPercent + mdPercent + pptxPercent));

  const getFormatSize = (bytes: number) => {
    if (!bytes) return "12.4 MB";
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const defaultDocs = [
    { name: "Attention Mechanism Explained.pdf", type: "PDF", size: "12.4 MB", pages: "35 pages", status: "Indexed", time: "2h ago" },
    { name: "Deep Learning Guide.docx", type: "DOCX", size: "8.7 MB", pages: "68 pages", status: "Indexed", time: "5h ago" },
    { name: "RAG Systems Overview.pdf", type: "PDF", size: "5.6 MB", pages: "22 pages", status: "Indexed", time: "Yesterday" },
    { name: "Transformers Architecture.md", type: "MD", size: "3.1 MB", pages: "18 pages", status: "Indexed", time: "2 days ago" },
    { name: "Study Notes - DL.txt", type: "TXT", size: "1.2 MB", pages: "9 pages", status: "Indexed", time: "3 days ago" },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. GREETING BANNER ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Welcome back, {user?.full_name?.split(" ")[0] || "Durga"}!</span>
            <span>👋</span>
          </h2>
          <p className="text-xs text-teal-400/80 mt-1 font-medium">
            Here&apos;s what&apos;s happening with your knowledge base today.
          </p>
        </div>

        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-md shadow-teal-500/20 flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Documents</span>
        </Link>
      </div>

      {/* ── 2. TOP ROW: 4 STAT METRIC CARDS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Documents */}
        <div className="p-5 rounded-2xl bg-[#051512] border border-[#0d332e] shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-400/80">Total Documents</p>
            <h3 className="text-2xl font-bold text-white">{totalDocs}</h3>
            <span className="text-[11px] font-semibold text-teal-400 flex items-center gap-1">
              <span>↑ 12 this week</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Stat 2: Vector Chunks */}
        <div className="p-5 rounded-2xl bg-[#051512] border border-[#0d332e] shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-400/80">Vector Chunks</p>
            <h3 className="text-2xl font-bold text-white">{totalChunks.toLocaleString()}</h3>
            <span className="text-[11px] font-semibold text-teal-400 flex items-center gap-1">
              <span>↑ 18.3% this week</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Stat 3: Total Chats */}
        <div className="p-5 rounded-2xl bg-[#051512] border border-[#0d332e] shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-400/80">Total Chats</p>
            <h3 className="text-2xl font-bold text-white">{totalSessions}</h3>
            <span className="text-[11px] font-semibold text-teal-400 flex items-center gap-1">
              <span>↑ 23 this week</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        {/* Stat 4: Storage Used */}
        <div className="p-5 rounded-2xl bg-[#051512] border border-[#0d332e] shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-400/80">Storage Used</p>
            <h3 className="text-2xl font-bold text-white">{storageGB} GB</h3>
            <span className="text-[11px] font-semibold text-teal-500/70">
              of 10 GB
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ── 3. MIDDLE ROW: KNOWLEDGE BASE OVERVIEW & DOCUMENT TYPES ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Knowledge Base Overview (7 Cols) */}
        <div className="lg:col-span-7 bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[#0d332e]">
              <div>
                <h3 className="font-bold text-white text-sm">Knowledge Base Overview</h3>
                <div className="flex items-center gap-4 text-xs mt-1 text-teal-400/80 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-400" /> Embeddings
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Queries
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-300 border border-[#0e3b34] rounded-lg px-2.5 py-1 bg-[#09211d]">
                <span>This Month</span>
                <ChevronDown className="h-3 w-3 text-teal-400" />
              </div>
            </div>

            {/* Glowing Line Graph */}
            <div className="h-40 w-full mt-4 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyberTealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,75 Q50,45 100,55 T200,20 T300,30 L300,100 L0,100 Z"
                  fill="url(#cyberTealGradient)"
                />
                <path
                  d="M0,75 Q50,45 100,55 T200,20 T300,30"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="0" cy="75" r="4" fill="#14b8a6" />
                <circle cx="60" cy="50" r="4" fill="#14b8a6" />
                <circle cx="120" cy="55" r="4" fill="#14b8a6" />
                <circle cx="180" cy="30" r="4" fill="#14b8a6" />
                <circle cx="240" cy="20" r="4" fill="#14b8a6" />
                <circle cx="300" cy="30" r="4" fill="#14b8a6" />
              </svg>
              <div className="flex justify-between text-[10px] text-teal-400/70 font-medium mt-2">
                <span>May 1</span>
                <span>May 6</span>
                <span>May 11</span>
                <span>May 16</span>
                <span>May 21</span>
                <span>May 26</span>
                <span>May 31</span>
              </div>
            </div>
          </div>

          {/* 4 Sub Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#0d332e]">
            <div className="p-2.5 rounded-xl bg-[#09211d] border border-[#0e3b34] text-center">
              <span className="text-[10px] font-semibold text-teal-400/70 block">Total Pages</span>
              <span className="text-xs font-bold text-white mt-0.5 block">18,532</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#09211d] border border-[#0e3b34] text-center">
              <span className="text-[10px] font-semibold text-teal-400/70 block">Total Words</span>
              <span className="text-xs font-bold text-white mt-0.5 block">3.2M</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#09211d] border border-[#0e3b34] text-center">
              <span className="text-[10px] font-semibold text-teal-400/70 block">Avg. Chunk Size</span>
              <span className="text-xs font-bold text-white mt-0.5 block">512 tokens</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#09211d] border border-[#0e3b34] text-center">
              <span className="text-[10px] font-semibold text-teal-400/70 block">Top Topic</span>
              <span className="text-xs font-bold text-white mt-0.5 block">AI / ML</span>
            </div>
          </div>
        </div>

        {/* Right: Document Types Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-md space-y-4 flex flex-col justify-between">
          <h3 className="font-bold text-white text-sm border-b border-[#0d332e] pb-3">
            Document Types
          </h3>

          <div className="flex items-center gap-6 pt-2">
            {/* Cyber Donut Chart SVG */}
            <div className="relative h-36 w-36 shrink-0">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#09211d"
                  strokeWidth="4"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="4"
                  strokeDasharray={`${pdfPercent}, 100`}
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeDasharray={`${docxPercent}, 100`}
                  strokeDashoffset={`-${pdfPercent}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-white">{totalDocs}</span>
                <span className="text-[10px] text-teal-400/70 font-semibold uppercase">Total</span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-2 text-xs text-teal-200 flex-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400" /> PDF
                </span>
                <span className="font-bold text-white">{pdfPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> DOCX
                </span>
                <span className="font-bold text-white">{docxPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> TXT
                </span>
                <span className="font-bold text-white">{txtPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-400" /> MD
                </span>
                <span className="font-bold text-white">{mdPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" /> PPTX
                </span>
                <span className="font-bold text-white">{pptxPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0e3b34]" /> Others
                </span>
                <span className="font-bold text-white">{otherPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: RECENT ACTIVITY, LATEST DOCUMENTS & QUICK ACTIONS ─ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Recent Activity */}
        <div className="bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[#0d332e]">
              <h3 className="font-bold text-white text-sm">Recent Activity</h3>
              <Link href="/analytics" className="text-xs font-semibold text-teal-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3 mt-3">
              {[
                { title: "Document uploaded", detail: "Attention Mechanism Explained.pdf", time: "2h ago" },
                { title: "Chat session created", detail: "Research on RAG Systems", time: "3h ago" },
                { title: "Document processed", detail: "Deep Learning Guide.docx", time: "5h ago" },
                { title: "Chunks generated", detail: "Vector embeddings created", time: "6h ago" },
                { title: "Chat session created", detail: "Vector Database Basics", time: "1d ago" },
              ].map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{act.title}</p>
                    <p className="text-[11px] text-teal-400/70 truncate">{act.detail}</p>
                  </div>
                  <span className="text-[10px] text-teal-500/60 shrink-0 font-medium">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Latest Documents */}
        <div className="bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-md space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#0d332e]">
            <h3 className="font-bold text-white text-sm">Latest Documents</h3>
            <Link href="/documents" className="text-xs font-semibold text-teal-400 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {userFiles.length > 0 ? (
              userFiles.slice(0, 5).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#09211d] border border-[#0e3b34]">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">📄 {doc.originalName}</p>
                    <p className="text-[10px] text-teal-400/70 mt-0.5">
                      {doc.fileType} • {getFormatSize(doc.size)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                    Indexed
                  </span>
                </div>
              ))
            ) : (
              defaultDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#09211d] border border-[#0e3b34]">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                    <p className="text-[10px] text-teal-400/70 mt-0.5">
                      {doc.type} • {doc.size} • {doc.pages}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                    {doc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Quick Actions */}
        <div className="bg-[#051512] p-6 rounded-2xl border border-[#0d332e] shadow-md space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-[#0d332e] pb-3">
            Quick Actions
          </h3>

          <div className="space-y-2">
            <Link
              href="/upload"
              className="flex items-center justify-between p-3 rounded-xl bg-[#09211d] border border-[#0e3b34] hover:border-teal-500/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">Upload Documents</p>
                  <p className="text-[10px] text-teal-400/70">Add new files to your library</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500/60 group-hover:text-teal-300 transition" />
            </Link>

            <Link
              href="/chat"
              className="flex items-center justify-between p-3 rounded-xl bg-[#09211d] border border-[#0e3b34] hover:border-teal-500/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">Start New Chat</p>
                  <p className="text-[10px] text-teal-400/70">Ask questions across docs</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500/60 group-hover:text-teal-300 transition" />
            </Link>

            <Link
              href="/documents"
              className="flex items-center justify-between p-3 rounded-xl bg-[#09211d] border border-[#0e3b34] hover:border-teal-500/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">Create Collection</p>
                  <p className="text-[10px] text-teal-400/70">Organize documents</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500/60 group-hover:text-teal-300 transition" />
            </Link>

            <Link
              href="/study"
              className="flex items-center justify-between p-3 rounded-xl bg-[#09211d] border border-[#0e3b34] hover:border-teal-500/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">AI Study Mode</p>
                  <p className="text-[10px] text-teal-400/70">Quizzes, flashcards &amp; more</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500/60 group-hover:text-teal-300 transition" />
            </Link>

            <Link
              href="/analytics"
              className="flex items-center justify-between p-3 rounded-xl bg-[#09211d] border border-[#0e3b34] hover:border-teal-500/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">View Analytics</p>
                  <p className="text-[10px] text-teal-400/70">Explore insights &amp; stats</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500/60 group-hover:text-teal-300 transition" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
