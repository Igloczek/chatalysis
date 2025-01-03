import PQueue from "p-queue";
import { analyzeMessages } from "@/server/services/message-analyzer";
import { storeAnalysis, readFile, deleteFile } from "@/server/services/storage";

import type { APIRoute } from "astro";
import type { MessageData, Message, Participant } from "@/server/types";

// Queue with larger batch size
const queue = new PQueue({ concurrency: 8 });

export const POST: APIRoute = async ({ request }) => {
  const routeStart = performance.now();
  console.log("=== API Route Start ===");

  try {
    const { files, platform } = await request.json();
    console.log(`Starting analysis of ${files.length} files`);

    // Read files in larger batches
    const filesStart = performance.now();
    const fileResults = await Promise.all(
      files.map((filePath) => queue.add(() => readFile(filePath)))
    );
    console.log(
      `File reading: ${(performance.now() - filesStart).toFixed(2)}ms`
    );

    // Clean up files after reading
    files.map(deleteFile);

    // Merge results efficiently
    const mergeStart = performance.now();
    const mergedData: MessageData = {
      title: "",
      participants: [],
      messages: [],
    };

    // Pre-allocate total message count for better memory management
    const totalMessages = fileResults.reduce(
      (sum, result) => sum + (result?.messages?.length || 0),
      0
    );
    mergedData.messages = new Array(totalMessages);

    let messageIndex = 0;
    const seenParticipants = new Set<string>();

    // Merge data in a single pass
    for (const result of fileResults) {
      if (!result) continue;

      // Merge participants
      for (const participant of result.participants) {
        if (!seenParticipants.has(participant.name)) {
          seenParticipants.add(participant.name);
          mergedData.participants.push(participant);
        }
      }

      // Merge messages
      for (const message of result.messages) {
        mergedData.messages[messageIndex++] = message;
      }
    }

    console.log(
      `Data merging: ${(performance.now() - mergeStart).toFixed(2)}ms`
    );

    // Analyze merged data
    console.log("Running analysis...");
    const analysisStart = performance.now();
    const analysis = await analyzeMessages(mergedData, platform);
    console.log(
      `Analysis execution: ${(performance.now() - analysisStart).toFixed(2)}ms`
    );

    // Store results
    const storageStart = performance.now();
    const id = await storeAnalysis(analysis);
    console.log(
      `Result storage: ${(performance.now() - storageStart).toFixed(2)}ms`
    );

    const responseStart = performance.now();
    const response = new Response(JSON.stringify({ id }), { status: 200 });
    console.log(
      `Response creation: ${(performance.now() - responseStart).toFixed(2)}ms`
    );

    const totalTime = performance.now() - routeStart;
    console.log("=== API Route End ===");
    console.log(`Total route time: ${totalTime.toFixed(2)}ms`);

    return response;
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Analysis failed",
      }),
      { status: 500 }
    );
  }
};
