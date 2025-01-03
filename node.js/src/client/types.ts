export interface UploadedFile {
  id: string;
  name: string;
  displayName: string;
  status: "uploading" | "completed" | "error";
  progress: number;
  error?: string;
  path?: string;
}
