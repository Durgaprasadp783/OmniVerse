"use client";

import React, { useState, useRef } from "react";
import fileService, { UserFile } from "@/services/fileService";
import { UploadCloud, AlertCircle } from "lucide-react";

interface UploadBoxProps {
  onUploadSuccess?: (newFile: UserFile) => void;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export default function UploadBox({ onUploadSuccess }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Unsupported File Type. Please upload PDF, DOCX, PPTX, PNG, or JPEG.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File size exceeds maximum limit of 20MB.";
    }
    return null;
  };

  const [uploadStep, setUploadStep] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFileName(file.name);
    try {
      setUploading(true);
      setUploadStep("Uploading file...");
      const newFile = await fileService.uploadFile(file);
      const targetFileId = newFile.id || newFile._id;

      if (targetFileId) {
        try {
          setUploadStep("Extracting document text...");
          await fileService.processFile(targetFileId);

          setUploadStep("Generating vector chunks...");
          await fileService.chunkFile(targetFileId);

          setUploadStep("Generating Gemini vector embeddings...");
          await fileService.embedFile(targetFileId);

          newFile.processed = true;
        } catch (indexingErr: any) {
          console.warn("Indexing pipeline warning during upload:", indexingErr);
        }
      }

      setSelectedFileName(null);
      if (onUploadSuccess) {
        onUploadSuccess(newFile);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to upload document. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
      setUploadStep("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-300 ${
          isDragging
            ? "border-purple-600 bg-purple-50 scale-[1.01]"
            : "border-purple-200 bg-slate-50/70 hover:border-purple-400 hover:bg-purple-50/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-bold text-slate-800">
              {uploading
                ? `Uploading ${selectedFileName}...`
                : "Drop your document here, or browse"}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Supports PDF, DOCX, PPTX, PNG, JPEG (Up to 20MB)
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs space-y-2 pt-2">
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 animate-pulse w-full rounded-full" />
              </div>
              <p className="text-xs text-purple-600 font-semibold">{uploadStep || "Processing vector indexing..."}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
