import emoji from "emoji-regex";

export function extractEmojis(text: string): string[] {
  if (!text) return [];
  const emojiRegex = emoji();
  return Array.from(text.match(emojiRegex) || []);
}

export function countEmojis(
  messages: Array<{ content?: string }>
): Map<string, number> {
  const emojiCounts = new Map<string, number>();

  messages.forEach((message) => {
    if (!message.content) return;

    const emojis = extractEmojis(message.content);
    emojis.forEach((emoji) => {
      emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
    });
  });

  return new Map([...emojiCounts.entries()].sort((a, b) => b[1] - a[1]));
}
