"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile, StudyResult } from "@/services/fileService";
import { Brain, Zap, CheckCircle2, AlertCircle } from "lucide-react";

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
  const { user, isAuthenticated, isLoading } = useAuth();
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
      <div className="min-h-[400px] flex items-center justify-center bg-white text-slate-900">
        <div className="h-8 w-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
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
    <div className="space-y-8 bg-transparent text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Brain className="h-7 w-7 text-purple-600" />
            <span>AI Study Mode &amp; Exam Prep</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Transform technical documents and PDFs into interactive study materials, practice quizzes, and revision guides.
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Mode Selection Pills */}
        <div className="lg:col-span-3 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
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
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-purple-50 border-purple-400 text-purple-950 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-purple-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-bold text-sm text-slate-900">{m.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Document & Topic Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 h-fit shadow-sm">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              2. Target Documents ({selectedFileIds.length})
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {userFiles.length === 0 ? (
                <p className="text-xs text-slate-400">No uploaded files available.</p>
              ) : (
                userFiles.map((file) => {
                  const fid = file.id || file._id || "";
                  const isChecked = selectedFileIds.includes(fid);
                  return (
                    <label
                      key={fid}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? "bg-purple-50 border-purple-300 text-purple-900"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFile(fid)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="truncate font-medium">📄 {file.originalName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              3. Focus Topic (Optional)
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="e.g. Key Concepts, Chapter 3"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || selectedFileIds.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-purple-600/20 disabled:opacity-40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Generating Study Materials...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate Study Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Container */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {MODES.find((m) => m.key === activeMode)?.icon}
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                  {MODES.find((m) => m.key === activeMode)?.label} Results
                </h2>
                <p className="text-xs text-slate-500 font-medium">Grounded in your document context</p>
              </div>
            </div>

            {activeMode === "mcqs" && mcqs.length > 0 && (
              <button
                onClick={() => setMcqShowScore(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Submit Quiz Answers
              </button>
            )}
          </div>

          {/* MCQ Quiz Display */}
          {activeMode === "mcqs" && mcqs.length > 0 && (
            <div className="space-y-6">
              {mcqShowScore && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-base">Quiz Completed!</span>
                    <p className="text-xs text-purple-700">Your score: {correctCount} / {mcqs.length} correct</p>
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-700">
                    {Math.round((correctCount / mcqs.length) * 100)}%
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {mcqs.map((q: any, index: number) => {
                  const selected = mcqAnswers[q.id];
                  const isSubmitted = mcqShowScore;

                  return (
                    <div key={q.id || index} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <p className="font-bold text-sm text-slate-900 flex items-start gap-2">
                        <span className="text-purple-600 font-mono">Q{index + 1}.</span>
                        <span>{q.question}</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options?.map((opt: string) => {
                          const isSelected = selected === opt;
                          const isCorrect = opt === q.correctAnswer;
                          let style = "bg-white border-slate-200 text-slate-700 hover:border-purple-300";

                          if (isSubmitted) {
                            if (isCorrect) style = "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                            else if (isSelected && !isCorrect) style = "bg-red-50 border-red-300 text-red-800";
                          } else if (isSelected) {
                            style = "bg-purple-600 border-purple-600 text-white font-bold shadow-xs";
                          }

                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setMcqAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${style}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {isSubmitted && q.explanation && (
                        <div className="p-3 rounded-xl bg-white text-xs text-slate-600 border border-slate-200">
                          <span className="text-purple-700 font-bold block mb-1">Explanation:</span>
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
                    className={`min-h-[180px] p-6 rounded-2xl border cursor-pointer transition transform hover:-translate-y-1 flex flex-col justify-between select-none shadow-xs ${
                      isFlipped
                        ? "bg-purple-50 border-purple-300 text-purple-950"
                        : "bg-white border-slate-200 text-slate-800 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Card #{idx + 1}</span>
                      <span>{isFlipped ? "Answer (Back)" : "Question (Front)"}</span>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed my-3">
                      {isFlipped ? card.back : card.front}
                    </p>

                    <div className="text-[10px] text-purple-600 font-bold text-right">
                      Click to {isFlipped ? "see question" : "reveal answer"} 🔄
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Markdown Text Response Display */}
          {(!["mcqs", "flashcards"].includes(activeMode) || !result.structuredData) && (
            <div className="prose max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-6 rounded-2xl border border-slate-200">
              {result.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
