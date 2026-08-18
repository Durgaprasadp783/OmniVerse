"use client";

import React, { useState } from "react";
import Link from "next/link";
import fileService, { UserFile } from "@/services/fileService";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Edit2,
  Download,
  Trash2,
  MessageSquare,
  Check,
  X
} from "lucide-react";

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
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileBadge = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return { label: "PDF", bg: "bg-red-50 text-red-600 border-red-200" };
    }
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return { label: "DOCX", bg: "bg-blue-50 text-blue-600 border-blue-200" };
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return { label: "PPTX", bg: "bg-amber-50 text-amber-600 border-amber-200" };
    }
    if (mimeType.includes("image")) {
      return { label: "IMAGE", bg: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    }
    return { label: "FILE", bg: "bg-purple-50 text-purple-600 border-purple-200" };
  };

  const badge = getFileBadge(file.fileType || "");
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
    <div className="group relative rounded-2xl bg-white border border-slate-200 hover:border-purple-300 p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${badge.bg}`}>
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
                    className="bg-slate-50 border border-purple-500 px-2 py-1 rounded-lg text-xs text-slate-900 w-full focus:outline-none"
                  />
                  <button onClick={handleRename} className="text-purple-600 p-1 hover:bg-purple-50 rounded">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setIsRenaming(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <h3 className="font-bold text-slate-800 text-sm truncate" title={file.originalName}>
                  {file.originalName}
                </h3>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                {formatBytes(file.size)} • {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
            <button
              onClick={() => setIsRenaming(!isRenaming)}
              title="Rename Document"
              className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDownload}
              title="Download Original File"
              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
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
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-medium text-slate-600">
          <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            📄 {file.pageCount || 0} pages
          </span>
          <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-purple-700">
            📝 {(file.extractedText ? file.extractedText.split(/\s+/).length : 0).toLocaleString()} words
          </span>
          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
            file.processed 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {file.processed ? "Indexed Ready" : "Processing"}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[10px] font-mono truncate max-w-[130px]">
          ID: {fileId.slice(0, 10)}…
        </span>
        <Link
          href={`/chat?fileId=${fileId}`}
          className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Ask RAG</span>
        </Link>
      </div>
    </div>
  );
}
