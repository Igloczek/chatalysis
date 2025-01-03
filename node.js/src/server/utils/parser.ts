import { MessageData } from "../types";

export async function parseMessageData(
  file: File,
  platform: string
): Promise<MessageData> {
  // Read the file as UTF-8 text
  const text = await file.text();

  // Try to decode any potentially double-encoded UTF-8 content
  const decodedText = decodeURIComponent(escape(text));

  let rawData;
  try {
    rawData = JSON.parse(decodedText);
  } catch {
    // If the first attempt fails, try parsing the original text
    rawData = JSON.parse(text);
  }

  if (platform === "messenger") {
    return parseMessengerData(rawData);
  } else if (platform === "instagram") {
    return parseInstagramData(rawData);
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
