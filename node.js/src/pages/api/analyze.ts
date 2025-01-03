import PQueue from "p-queue";
import { analyzeMessages } from "@/server/services/message-analyzer";
import { storeAnalysis, readFile, deleteFile } from "@/server/services/storage";

import type { APIRoute } from "astro";
import type { MessageData, Participant } from "@/server/types";

// Single queue with limited concurrency
const queue = new PQueue({ concurrency: 2 });

async function processFile({
  filePath,
  processedMessages,
  participantMap,
  mergedData,
  platform,
}: {
  filePath: string;
  processedMessages: Set<string>;
  participantMap: Map<string, Participant>;
  mergedData: MessageData;
  platform: string;
}) {
  console.log(`Starting to process file: ${filePath}`);

  // Read file
  const content = (await readFile(filePath)) as MessageData;

  if (!content) {
    throw new Error(`Failed to read file: ${filePath}`);
  }

  if (!content.participants || !content.messages) {
    console.log("Invalid content structure:", { content });
    return;
  }

  console.log(
    `File ${filePath} read successfully, processing ${content.messages.length} messages`
  );

  // Merge participants
  content.participants.forEach((participant) => {
    if (!participantMap.has(participant.name)) {
      participantMap.set(participant.name, participant);
    }
  });

  // Process messages in chunks
  const CHUNK_SIZE = 1000;
  const totalChunks = Math.ceil(content.messages.length / CHUNK_SIZE);

  for (let i = 0; i < content.messages.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
    console.log(
      `Processing chunk ${chunkIndex}/${totalChunks} of file ${filePath}`
    );

    const messageChunk = content.messages.slice(i, i + CHUNK_SIZE);
    messageChunk.forEach((message) => {
      const messageId = `${message.timestamp_ms}-${
        message.sender_name
      }-${message.content?.slice(0, 50)}`;

      if (!processedMessages.has(messageId)) {
        mergedData.messages.push(message);
        processedMessages.add(messageId);
      }
    });

    // Log progress every chunk
    console.log(
      `Chunk ${chunkIndex}/${totalChunks} processed. Current total messages: ${mergedData.messages.length}`
    );
  }

  console.log(`Finished processing file: ${filePath}`);
  await deleteFile(filePath);

  return filePath;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { files, platform } = await request.json();
    console.log(`Starting analysis of ${files.length} files`);

    const processedMessages = new Set<string>();
    const participantMap = new Map<string, Participant>();
    const mergedData: MessageData = {
      title: "",
      participants: [],
      messages: [],
    };

    // Process files concurrently through the queue
    const results = await Promise.allSettled(
      files.map((filePath, index) => {
        console.log(`Queueing file ${index + 1}/${files.length}: ${filePath}`);
        return queue.add(() =>
          processFile({
            filePath,
            processedMessages,
            participantMap,
            mergedData,
            platform,
          })
        );
      })
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`File ${files[index]} failed:`, result.reason);
      }
    });

    console.log("All files processed, finalizing analysis...");
    mergedData.participants = Array.from(participantMap.values());

    console.log("Running analysis...");
    const analysis = await analyzeMessages(mergedData, platform);

    console.log("Storing analysis results...");
    const id = await storeAnalysis(analysis);

    return new Response(JSON.stringify({ id }), {
      status: 200,
    });
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
