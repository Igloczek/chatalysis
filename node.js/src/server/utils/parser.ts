import type { MessageData } from "../types";

export async function parseMessageData(
  input: File | Buffer,
  platform: string
): Promise<MessageData> {
  let jsonData: any;

  if (input instanceof File) {
    const text = await input.text();
    jsonData = JSON.parse(text);
  } else {
    jsonData = JSON.parse(input.toString());
  }

  if (platform === "messenger") {
    return parseMessengerData(jsonData);
  } else if (platform === "instagram") {
    return parseInstagramData(jsonData);
  }

  throw new Error("Unsupported platform");
}

function decodeText(text: string): string {
  try {
    // Try to fix double-encoded UTF-8 strings
    return decodeURIComponent(escape(text));
  } catch {
    // If decoding fails, return original string
    return text;
  }
}

function parseMessengerData(rawData: any): MessageData {
  return {
    messages: rawData.messages.map((msg: any) => ({
      sender_name: decodeText(msg.sender_name),
      timestamp_ms: msg.timestamp_ms,
      content: msg.content ? decodeText(msg.content) : "",
      type: msg.type,
      reactions: (msg.reactions || []).map((reaction: any) => ({
        reaction: decodeText(reaction.reaction),
        actor: decodeText(reaction.actor),
      })),
      photos: msg.photos,
      videos: msg.videos,
      files: msg.files,
    })),
    participants: rawData.participants.map((p: any) => ({
      name: decodeText(p.name),
    })),
    title: decodeText(rawData.title),
  };
}

function parseInstagramData(rawData: any): MessageData {
  // ... Instagram parsing logic with decodeText applied similarly
  return {
    // ... Instagram parsing logic
  };
}
