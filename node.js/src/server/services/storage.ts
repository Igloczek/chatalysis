import * as fs from "node:fs/promises";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { jsonrepair } from "jsonrepair";

import type { AnalysisResult } from "@/server/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "files");
const ANALYSIS_DIR = path.join(DATA_DIR, "analysis");

function decodeString(input: string) {
  const utf8Decoded = input.replace(/\\u([\dA-Fa-f]{4})/g, (_, group) =>
    String.fromCharCode(parseInt(group, 16))
  );

  return new TextDecoder("utf-8").decode(
    Uint8Array.from(utf8Decoded.split("").map((c) => c.charCodeAt(0)))
  );
}

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(FILES_DIR, { recursive: true });
  await fs.mkdir(ANALYSIS_DIR, { recursive: true });
}

// Initialize directories
ensureDirectories().catch(console.error);

export async function storeAnalysis(analysis: AnalysisResult): Promise<string> {
  const id = uuidv4();
  const filePath = path.join(ANALYSIS_DIR, id);
  await fs.writeFile(filePath, JSON.stringify(analysis, null, 2), "utf8");
  return id;
}

export async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  try {
    const filePath = path.join(ANALYSIS_DIR, id);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) as AnalysisResult;
  } catch (error) {
    console.error(`Error retrieving analysis ${id}:`, error);
    return null;
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    const filePath = path.join(ANALYSIS_DIR, id);
    await fs.unlink(filePath);
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
    const fullPath = path.join(FILES_DIR, filePath);
    const data = await fs.readFile(fullPath, "utf8");
    return JSON.parse(data, (key, value) =>
      key === "title" ? decodeString(value) : value
    ) as Record<string, any>;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

export async function saveFile(buffer: Buffer): Promise<string> {
  const id = `${uuidv4()}.json`;
  const filePath = path.join(FILES_DIR, id);

  let json = buffer.toString("utf8");

  try {
    // Validate JSON
    JSON.parse(json);
  } catch (error) {
    console.error(`Error validating JSON for file ${id}:`, error);
    json = jsonrepair(json);
  }

  await fs.writeFile(filePath, json, "utf8");
  return id;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(FILES_DIR, filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}
