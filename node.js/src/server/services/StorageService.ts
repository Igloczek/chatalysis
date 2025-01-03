import type { AnalysisResult } from "../types";

class StorageService {
  private static instance: StorageService;
  private analyses: Map<string, AnalysisResult>;

  private constructor() {
    this.analyses = new Map();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public store(analysis: AnalysisResult): string {
    const id = crypto.randomUUID();
    this.analyses.set(id, analysis);
    return id;
  }

  public get(id: string): AnalysisResult | undefined {
    return this.analyses.get(id);
  }
}

export default StorageService.getInstance();
