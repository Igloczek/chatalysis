import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { jsonrepair } from "jsonrepair";

import type { AnalysisResult } from "@/server/types";

const storage = createStorage({
  driver: fsDriver({
    base: path.join(process.cwd(), "data"),
    ignore: [".*"],
  }),
});

function toStorageKey(id: string, type: "analysis" | "files"): string {
  return `${type}:${id}`;
}

export async function storeAnalysis(analysis: AnalysisResult): Promise<string> {
  const id = `${uuidv4()}.json`;
  await storage.setItem(toStorageKey(id, "analysis"), JSON.stringify(analysis));
  return id;
}

export async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  try {
    const data = await storage.getItem(toStorageKey(id, "analysis"));
    if (!data) return null;
    return data as AnalysisResult;
  } catch (error) {
    console.error(`Error retrieving analysis ${id}:`, error);
    return null;
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    await storage.removeItem(toStorageKey(id, "analysis"));
    return true;
  } catch (error) {
    console.error(`Error deleting analysis ${id}:`, error);
    return false;
  }
}

export async function readFile(
  filePath: string
): Promise<Record<string, any> | null> {
  try {
    const data = await storage.getItem(toStorageKey(filePath, "files"));

    if (!data) return null;

    if (typeof data === "string") {
      return JSON.parse(data) as Record<string, any>;
    }

    return data as Record<string, any>;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

export async function saveFile(buffer: Buffer): Promise<string> {
  const id = `${uuidv4()}.json`;
  let json = buffer.toString();

  try {
    JSON.parse(json);
  } catch (error) {
    json = jsonrepair(json);
    console.error(`Error saving file ${id}:`, error);
  }

  await storage.setItem(toStorageKey(id, "files"), json);

  return id;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await storage.removeItem(toStorageKey(filePath, "files"));
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}
