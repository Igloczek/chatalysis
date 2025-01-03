import type { APIRoute } from "astro";
import { ChatAnalyzer } from "../../server/services/ChatAnalyzer";
import { parseMessageData } from "../../server/utils/parser";
import StorageService from "../../server/services/StorageService";
import FileStorageService from "../../server/services/FileStorageService";
import type { MessageData } from "../../server/types";

export const POST: APIRoute = async ({ request }) => {
  const { files, platform } = await request.json();

  if (!files?.length || !platform) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
    });
  }

  try {
    // Process files one by one and merge the data
    const mergedData: MessageData = {
      title: "Merged Chat History",
      participants: [],
      messages: [],
    };

    for (const filePath of files) {
      const fileBuffer = await FileStorageService.readFile(filePath);
      const fileData = await parseMessageData(fileBuffer, platform);

      // Merge participants
      const existingParticipants = new Set(
        mergedData.participants.map((p) => p.name)
      );
      fileData.participants.forEach((participant) => {
        if (!existingParticipants.has(participant.name)) {
          mergedData.participants.push(participant);
          existingParticipants.add(participant.name);
        }
      });

      // Merge messages
      mergedData.messages.push(...fileData.messages);

      // Clean up the file
      await FileStorageService.deleteFile(filePath);
    }

    // Sort messages by timestamp
    mergedData.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

    // Analyze merged data
    const analyzer = new ChatAnalyzer(mergedData, platform);
    const analysis = analyzer.analyzeMessages();

    // Store analysis results
    const id = StorageService.store(analysis);

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
