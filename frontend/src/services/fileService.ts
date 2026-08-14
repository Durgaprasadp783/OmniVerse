import api from "@/lib/api";

export interface UserFile {
  id: string;
  _id?: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: string;
  size: number;
  path: string;
  extractedText?: string;
  pageCount?: number;
  processed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  file: {
    id: string;
    originalName: string;
    pages: number;
    processed: boolean;
  };
}


export interface ChunkResult {
  success: boolean;
  message: string;
  fileId: string;
  chunkCount: number;
}

export interface EmbedResult {
  success: boolean;
  message: string;
  fileId: string;
  chunksProcessed: number;
}

export interface SearchChunkItem {
  chunkId: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface SearchResult {
  success: boolean;
  query: string;
  results: SearchChunkItem[];
}

export interface RagSource {
  source: number;
  chunkId: string;
  chunkIndex: number;
  score: number;
  similarity?: number;
  // Phase 5 Step 1 — structured source metadata
  filename?: string;
  page?: number | null;
  fileId?: string;
}

/** Source shape returned by POST /api/chat (session-based RAG) */
export interface SessionChatSource {
  source: number;
  filename: string;
  page: number | null;
  fileId: string;
  chunkIndex: number | null;
  similarity: number;
}

export interface ChatResult {
  success: boolean;
  query: string;
  answer: string;
  sources: RagSource[];
}

/** Response shape from POST /api/chat */
export interface SessionChatResult {
  answer: string;
  sessionId: string;
  sources: SessionChatSource[];
}

export interface ChatMessage {
  id: string;
  _id?: string;
  userId: string;
  fileId: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  createdAt?: string;
}

/** A message in a session-based chat thread */
export interface SessionMessage {
  id: string;
  _id?: string;
  userId: string;
  sessionId: string;
  role: "user" | "assistant";
  message: string;
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  sessionId: string;
  title: string;
  fileIds: string[];
  lastMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentStat {
  fileId: string;
  filename: string;
  pages: number;
  chunks: number;
  words: number;
  questions: number;
  createdAt?: string;
  processed: boolean;
}

export interface AnalyticsSummary {
  totalDocuments: number;
  totalPages: number;
  totalChunks: number;
  totalWords: number;
  totalQuestions: number;
  totalSessions: number;
  mostAskedTopic: string;
}

export interface TopicStat {
  topic: string;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  topTopics: TopicStat[];
  documents: DocumentStat[];
}

export interface StudyResult {
  success: boolean;
  mode: string;
  content: string;
  structuredData?: any;
}

export const fileService = {
  async uploadFile(file: File): Promise<UserFile> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<{ success?: boolean; file?: UserFile } & UserFile>(
      "/api/files/upload",
      formData
    );

    return response.data.file || response.data;
  },

  async getUserFiles(): Promise<UserFile[]> {
    const response = await api.get<UserFile[] | { success?: boolean; files?: UserFile[] }>(
      "/api/files"
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.files || [];
  },

  async getFileById(fileId: string): Promise<UserFile> {
    const response = await api.get<UserFile>(`/api/files/${fileId}`);
    return response.data;
  },

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/api/files/${fileId}`);
  },

  async renameFile(fileId: string, name: string): Promise<UserFile> {
    const response = await api.patch<UserFile>(`/api/files/${fileId}`, { name });
    return response.data;
  },

  async downloadFile(fileId: string, filename: string): Promise<void> {
    const response = await api.get(`/api/files/${fileId}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || "document");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async processFile(fileId: string): Promise<ProcessResult> {
    const response = await api.post<ProcessResult>(`/api/files/${fileId}/process`);
    return response.data;
  },

  async chunkFile(fileId: string): Promise<ChunkResult> {
    const response = await api.post<ChunkResult>(`/api/files/${fileId}/chunk`);
    return response.data;
  },

  async embedFile(fileId: string): Promise<EmbedResult> {
    const response = await api.post<EmbedResult>(`/api/files/${fileId}/embed`);
    return response.data;
  },

  async searchFile(fileId: string, query: string, topK: number = 5): Promise<SearchResult> {
    const response = await api.post<SearchResult>(`/api/files/${fileId}/search`, {
      query,
      topK,
    });
    return response.data;
  },

  async advancedSearch(query: string, fileIds?: string[], page?: number, topK: number = 5): Promise<any> {
    const response = await api.post("/api/files/search/advanced", {
      query,
      fileIds,
      page,
      topK,
    });
    return response.data;
  },

  async chatWithFile(fileId: string, query: string, topK: number = 5): Promise<ChatResult> {
    const response = await api.post<ChatResult>(`/api/files/${fileId}/chat`, {
      query,
      topK,
    });
    return response.data;
  },

  async getChatHistory(fileId: string): Promise<ChatMessage[]> {
    const response = await api.get<ChatMessage[]>(`/api/files/${fileId}/chat/history`);
    return response.data;
  },

  async clearChatHistory(fileId: string): Promise<void> {
    await api.delete(`/api/files/${fileId}/chat/history`);
  },

  // ── Session-based chat & Session CRUD ─────────────────────────────────────

  async chatSession(
    sessionId: string,
    message: string,
    fileId?: string,
    fileIds?: string[]
  ): Promise<SessionChatResult> {
    const response = await api.post<SessionChatResult>("/api/chat", {
      sessionId,
      message,
      ...(fileId ? { fileId } : {}),
      ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
    });
    return response.data;
  },

  async getSessionHistory(sessionId: string): Promise<SessionMessage[]> {
    const response = await api.get<SessionMessage[]>(`/api/chat/history/${sessionId}`);
    return response.data;
  },

  async getChatSessions(): Promise<ChatSession[]> {
    const response = await api.get<ChatSession[]>("/api/chat/sessions");
    return response.data;
  },

  async createChatSession(title?: string, fileIds?: string[]): Promise<ChatSession> {
    const response = await api.post<ChatSession>("/api/chat/sessions", {
      title,
      fileIds,
    });
    return response.data;
  },

  async renameChatSession(sessionId: string, title: string): Promise<ChatSession> {
    const response = await api.patch<ChatSession>(`/api/chat/sessions/${sessionId}`, { title });
    return response.data;
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    await api.delete(`/api/chat/sessions/${sessionId}`);
  },

  // ── Study Mode & Analytics ────────────────────────────────────────────────

  async generateStudyMode(mode: string, fileIds?: string[], topic?: string): Promise<StudyResult> {
    const response = await api.post<StudyResult>("/api/study/generate", {
      mode,
      fileIds,
      topic,
    });
    return response.data;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const response = await api.get<AnalyticsData>("/api/analytics");
    return response.data;
  },
};

export default fileService;






