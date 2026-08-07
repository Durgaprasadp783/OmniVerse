"use client";

import React, { useState } from "react";
import { UserFile } from "@/services/fileService";

interface FileCardProps {
  file: UserFile;
  onDelete?: (fileId: string) => void;
}

export default function FileCard({ file, onDelete }: FileCardProps) {
  const [deleting, setDeleting] = useState(false);

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const fileUrl = `${API_URL}/${file.path}`;

  return (
    <div className="group relative rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.bg}`}>
            {badge.label}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium text-zinc-200 text-sm truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              {formatBytes(file.size)} • {formattedDate}
            </p>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
                setDeleting(true);
                onDelete(file.id);
              }
            }}
            disabled={deleting}
            title="Delete file"
            className="text-zinc-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-500/10 opacity-80 group-hover:opacity-100 disabled:opacity-50 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="text-zinc-500 font-mono text-[11px] truncate max-w-[180px]">
          {file.filename}
        </span>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 hover:underline"
        >
          View / Download
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
