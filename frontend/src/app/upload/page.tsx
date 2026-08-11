"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import UploadBox from "@/components/UploadBox";
import FileCard from "@/components/FileCard";
import FileList from "@/components/FileList";
import fileService, { UserFile } from "@/services/fileService";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [fetchingFiles, setFetchingFiles] = useState(true);

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
      setFetchingFiles(true);
      const data = await fileService.getUserFiles();
      setFiles(data);
    } catch {
      // ignore fetch errors on unauthenticated or failed request
    } finally {
      setFetchingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFiles();
    }
  }, [mounted, isAuthenticated, loadFiles]);

  const handleUploadSuccess = (newFile: UserFile) => {
    setFiles((prev) => [newFile, ...prev]);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      alert("Failed to delete file. Please try again.");
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              OmniVerse
            </Link>

            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">
                Dashboard
              </Link>
              <Link href="/upload" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">
                Document Upload
              </Link>
              <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">
                RAG Chat
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

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Banner */}
        <div>
          <h1 className="text-3xl font-extrabold text-white">Document Upload Module</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Upload PDFs, DOCX, PPTX, PNG, or JPEG documents associated with your OmniVerse account.
          </p>
        </div>

        {/* Upload Box */}
        <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 md:p-8 backdrop-blur">
          <UploadBox onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* Uploaded Documents List */}
        <FileList
          files={files}
          loading={fetchingFiles}
          onDeleteFile={handleDeleteFile}
          onRefresh={loadFiles}
        />
      </div>
    </main>
  );
}
