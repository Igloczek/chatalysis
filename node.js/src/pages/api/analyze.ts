import PQueue from "p-queue";
import { analyzeMessages } from "@/server/services/message-analyzer";
import { storeAnalysis, readFile, deleteFile } from "@/server/services/storage";

import type { APIRoute } from "astro";
import type { MessageData, Participant } from "@/server/types";

const queue = new PQueue({ concurrency: 1 });

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
  console.log(`Processing file: ${filePath}`);
  const content = (await readFile(filePath)) as MessageData;

  if (!content) {
    throw new Error(`Failed to read file: ${filePath}`);
  }

  if (!content.participants || !content.messages) {
    console.log({ content });
  }

  // Merge participants
  content?.participants?.forEach((participant) => {
    if (!participantMap.has(participant.name)) {
      participantMap.set(participant.name, participant);
    }
  });

  // Merge messages, avoiding duplicates
  content?.messages?.forEach((message) => {
    const messageId = `${message.timestamp_ms}-${
      message.sender_name
    }-${message.content?.slice(0, 50)}`;

    if (!processedMessages.has(messageId)) {
      mergedData.messages.push(message);
      processedMessages.add(messageId);
    }
  });

  console.log(`Successfully processed file: ${filePath}`);
  await deleteFile(filePath);

  return filePath;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const files = body.files as string[];
    const platform = body.platform as string;

    if (!files.length) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
      });
    }

    // Initialize merged data structure
    const mergedData: MessageData = {
      title: "Merged Chat History",
      participants: [],
      messages: [],
    };

    const participantMap = new Map<string, Participant>();
    const processedMessages = new Set<string>();

    const results = await Promise.allSettled(
      files.map((filePath) =>
        queue.add(() =>
          processFile({
            filePath,
            processedMessages,
            participantMap,
            mergedData,
            platform,
          })
        )
      )
    );

    // Log results
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to process file ${files[index]}:`, result.reason);
      }
    });

    // Convert participant map back to array
    mergedData.participants = Array.from(participantMap.values());

    // Sort messages by timestamp
    mergedData.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

    if (mergedData.messages.length === 0) {
      throw new Error("No valid messages found in the provided files");
    }

    // Analyze merged data
    const analysis = await analyzeMessages(mergedData, platform);

    // Store analysis results
    const id = await storeAnalysis(analysis);

    console.log(`Analysis stored with ID: ${id}`);

    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
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
