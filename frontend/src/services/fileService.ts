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
  createdAt?: string;
  updatedAt?: string;
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

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/api/files/${fileId}`);
  },
};

export default fileService;
