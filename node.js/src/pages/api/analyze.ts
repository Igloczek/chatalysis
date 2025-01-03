import type { APIRoute } from "astro";
import { ChatAnalyzer } from "../../server/services/ChatAnalyzer";
import { parseMessageData } from "../../server/utils/parser";
import StorageService from "../../server/services/StorageService";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const chatFile = formData.get("chatFile") as File;
    const platform = formData.get("platform") as string;

    if (!chatFile || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const messageData = await parseMessageData(chatFile, platform);
    const analyzer = new ChatAnalyzer(messageData, platform);
    const analysis = analyzer.analyzeMessages();

    // Store the analysis and get ID
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
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
