"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile, StudyResult } from "@/services/fileService";

type ModeKey = "explain" | "summarize" | "topics" | "questions" | "mcqs" | "flashcards" | "examprep";

const MODES: { key: ModeKey; label: string; icon: string; desc: string }[] = [
  { key: "explain", label: "Explain", icon: "📖", desc: "Detailed, simple explanations with real-world examples" },
  { key: "summarize", label: "Summarize", icon: "📝", desc: "Executive key takeaways and thesis summary" },
  { key: "topics", label: "Important Topics", icon: "🎯", desc: "High-yield topics and priority concepts" },
  { key: "questions", label: "Generate Questions", icon: "❓", desc: "Practice questions with model answers" },
  { key: "mcqs", label: "Generate MCQs", icon: "✅", desc: "Interactive Multiple Choice Questions quiz" },
  { key: "flashcards", label: "Flashcards", icon: "🧠", desc: "Interactive study cards for rapid memory recall" },
  { key: "examprep", label: "Exam Prep Guide", icon: "📚", desc: "Comprehensive exam revision checklist" },
];

export default function StudyPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<ModeKey>("explain");
  const [focusTopic, setFocusTopic] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudyResult | null>(null);
  const [error, setError] = useState("");

  // Quiz state for MCQs mode
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqShowScore, setMcqShowScore] = useState(false);

  // Flashcards state
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const loadFiles = useCallback(async () => {
    try {
      const files = await fileService.getUserFiles();
      setUserFiles(files);
      if (files.length > 0 && selectedFileIds.length === 0) {
        setSelectedFileIds(files.map((f) => f.id || f._id || ""));
      }
    } catch {
      // ignore
    }
  }, [selectedFileIds]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadFiles();
  }, [mounted, isAuthenticated, loadFiles]);

  const handleToggleFile = (fid: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  const handleGenerate = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setMcqAnswers({});
      setMcqShowScore(false);
      setFlippedCards({});

      const res = await fileService.generateStudyMode(
        activeMode,
        selectedFileIds,
        focusTopic.trim() || undefined
      );

      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate study materials.");
    } finally {
      setLoading(false);
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

  // MCQ score calculation
  const mcqs = Array.isArray(result?.structuredData) ? result?.structuredData : [];
  const correctCount = mcqs.reduce((acc: number, item: any) => {
    const userChoice = mcqAnswers[item.id];
    return userChoice && userChoice === item.correctAnswer ? acc + 1 : acc;
  }, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-6 py-3 shrink-0 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            OmniVerse
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">Dashboard</Link>
            <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">My Documents</Link>
            <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">RAG Chat</Link>
            <Link href="/study" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">AI Study Mode</Link>
            <Link href="/analytics" className="text-zinc-400 hover:text-zinc-200 transition">Analytics</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 hidden sm:inline">
            <span className="text-zinc-200 font-medium">{user?.full_name || user?.email}</span>
          </span>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Study Hub */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>📝</span>
            <span>AI Study Mode &amp; Exam Prep</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Transform your technical documents and PDFs into interactive study materials, practice quizzes, and high-yield revision guides.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Mode Selection Pills */}
          <div className="lg:col-span-3 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              1. Select Study Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {MODES.map((m) => {
                const isSelected = activeMode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveMode(m.key)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                        : "bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-bold text-sm text-zinc-100">{m.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Document & Topic Controls */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                2. Target Documents ({selectedFileIds.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {userFiles.length === 0 ? (
                  <p className="text-xs text-zinc-500">No uploaded files available.</p>
                ) : (
                  userFiles.map((file) => {
                    const fid = file.id || file._id || "";
                    const isChecked = selectedFileIds.includes(fid);
                    return (
                      <label
                        key={fid}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFile(fid)}
                          className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                        />
                        <span className="truncate">📄 {file.originalName}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                3. Focus Topic (Optional)
              </label>
              <input
                type="text"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                placeholder="e.g. Jenkins Pipeline, Unit 3"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || selectedFileIds.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-40 transition flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>⚡ Generate Study Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Result Container */}
        {result && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {MODES.find((m) => m.key === activeMode)?.icon}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">
                    {MODES.find((m) => m.key === activeMode)?.label} Results
                  </h2>
                  <p className="text-xs text-zinc-400">Grounded in your document context</p>
                </div>
              </div>

              {activeMode === "mcqs" && mcqs.length > 0 && (
                <button
                  onClick={() => setMcqShowScore(true)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Submit Quiz Answers
                </button>
              )}
            </div>

            {/* MCQ Quiz Display */}
            {activeMode === "mcqs" && mcqs.length > 0 && (
              <div className="space-y-6">
                {mcqShowScore && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">Quiz Completed!</span>
                      <p className="text-xs">Your score: {correctCount} / {mcqs.length} correct</p>
                    </div>
                    <div className="text-2xl font-bold font-mono">
                      {Math.round((correctCount / mcqs.length) * 100)}%
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {mcqs.map((q: any, index: number) => {
                    const selected = mcqAnswers[q.id];
                    const isSubmitted = mcqShowScore;

                    return (
                      <div key={q.id || index} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                        <p className="font-semibold text-sm text-zinc-100 flex items-start gap-2">
                          <span className="text-indigo-400 font-mono">Q{index + 1}.</span>
                          <span>{q.question}</span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options?.map((opt: string) => {
                            const isSelected = selected === opt;
                            const isCorrect = opt === q.correctAnswer;
                            let style = "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700";

                            if (isSubmitted) {
                              if (isCorrect) style = "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold";
                              else if (isSelected && !isCorrect) style = "bg-red-500/20 border-red-500 text-red-200";
                            } else if (isSelected) {
                              style = "bg-indigo-600 border-indigo-500 text-white shadow";
                            }

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setMcqAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`p-3 rounded-xl border text-xs text-left transition ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {isSubmitted && q.explanation && (
                          <div className="p-3 rounded-xl bg-zinc-900 text-xs text-zinc-400 border border-zinc-800/80">
                            <span className="text-indigo-400 font-semibold block mb-1">Explanation:</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flashcards Deck Display */}
            {activeMode === "flashcards" && Array.isArray(result?.structuredData) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.structuredData.map((card: any, idx: number) => {
                  const isFlipped = flippedCards[card.id || idx];
                  return (
                    <div
                      key={card.id || idx}
                      onClick={() =>
                        setFlippedCards((prev) => ({ ...prev, [card.id || idx]: !isFlipped }))
                      }
                      className={`min-h-[180px] p-6 rounded-2xl border cursor-pointer transition transform hover:-translate-y-1 flex flex-col justify-between select-none ${
                        isFlipped
                          ? "bg-indigo-950/40 border-indigo-500/60 text-indigo-100"
                          : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <span>Card #{idx + 1}</span>
                        <span>{isFlipped ? "Answer (Back)" : "Question (Front)"}</span>
                      </div>

                      <p className="text-sm font-medium leading-relaxed my-3">
                        {isFlipped ? card.back : card.front}
                      </p>

                      <div className="text-[10px] text-indigo-400 font-mono text-right">
                        Click to {isFlipped ? "see question" : "reveal answer"} 🔄
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Markdown Text Response Display */}
            {(!["mcqs", "flashcards"].includes(activeMode) || !result.structuredData) && (
              <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80">
                {result.content}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
