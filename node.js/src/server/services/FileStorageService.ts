import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export class FileStorageService {
  private static instance: FileStorageService;
  private uploadDir: string;

  private constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  public async saveFile(buffer: Buffer): Promise<string> {
    await this.ensureUploadDirectory();
    const fileName = crypto.randomUUID() + ".json";
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  public async readFile(filePath: string): Promise<Buffer> {
    await this.ensureUploadDirectory();
    return await fs.readFile(filePath);
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  public async cleanup(files: string[]): Promise<void> {
    await Promise.all(files.map((file) => this.deleteFile(file)));
  }
}

export default FileStorageService.getInstance();
