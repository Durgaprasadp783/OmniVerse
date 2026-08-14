"use client";

import React, { useState } from "react";
import Link from "next/link";
import fileService, { UserFile } from "@/services/fileService";

interface FileCardProps {
  file: UserFile;
  onDelete?: (fileId: string) => void;
  onRenameSuccess?: () => void;
}

export default function FileCard({ file, onDelete, onRenameSuccess }: FileCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.originalName);

  const fileId = file.id || file._id || "";

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileBadge = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return { label: "PDF", bg: "bg-red-500/10 text-red-400 border-red-500/30" };
    }
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return { label: "DOCX", bg: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return { label: "PPTX", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (mimeType.includes("image")) {
      return { label: "IMAGE", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    }
    return { label: "FILE", bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
  };

  const badge = getFileBadge(file.fileType);
  const formattedDate = file.createdAt
    ? new Date(file.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const handleDownload = async () => {
    try {
      await fileService.downloadFile(fileId, file.originalName);
    } catch {
      alert("Failed to download file.");
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === file.originalName) {
      setIsRenaming(false);
      return;
    }
    try {
      await fileService.renameFile(fileId, renameValue.trim());
      setIsRenaming(false);
      if (onRenameSuccess) onRenameSuccess();
    } catch {
      alert("Failed to rename file.");
    }
  };

  return (
    <div className="group relative rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 transition-all shadow-sm hover:shadow-lg flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${badge.bg}`}>
              {badge.label}
            </span>
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    autoFocus
                    className="bg-zinc-950 border border-indigo-500 px-2 py-0.5 rounded text-xs text-white w-full"
                  />
                  <button onClick={handleRename} className="text-emerald-400 text-xs px-1">✓</button>
                  <button onClick={() => setIsRenaming(false)} className="text-zinc-400 text-xs px-1">✕</button>
                </div>
              ) : (
                <h3 className="font-semibold text-zinc-100 text-sm truncate" title={file.originalName}>
                  {file.originalName}
                </h3>
              )}
              <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                {formatBytes(file.size)} • {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
            <button
              onClick={() => setIsRenaming(!isRenaming)}
              title="Rename Document"
              className="text-zinc-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              ✏️
            </button>
            <button
              onClick={handleDownload}
              title="Download Original File"
              className="text-zinc-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              📥
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
                    setDeleting(true);
                    onDelete(fileId);
                  }
                }}
                disabled={deleting}
                title="Delete File"
                className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-mono text-zinc-400">
          <span className="bg-zinc-950 border border-zinc-800/80 px-2 py-0.5 rounded-md">
            📄 {file.pageCount || 0} pages
          </span>
          <span className="bg-zinc-950 border border-zinc-800/80 px-2 py-0.5 rounded-md text-emerald-400">
            📝 {(file.extractedText ? file.extractedText.split(/\s+/).length : 0).toLocaleString()} words
          </span>
          <span className={`px-2 py-0.5 rounded-md ${file.processed ? "text-emerald-400" : "text-amber-400"}`}>
            {file.processed ? "Ready" : "Unprocessed"}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="text-zinc-600 font-mono text-[10px] truncate max-w-[140px]">
          ID: {fileId.slice(0, 10)}…
        </span>
        <Link
          href={`/chat?fileId=${fileId}`}
          className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1"
        >
          <span>💬 RAG Chat</span>
        </Link>
      </div>
    </div>
  );
}

