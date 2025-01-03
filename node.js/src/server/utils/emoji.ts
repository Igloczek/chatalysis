import emojiRegex from "emoji-regex";

// Compile regex once
const EMOJI_REGEX = emojiRegex();

// Symbols that should not be counted as emojis
const EXCLUDED_SYMBOLS = new Set(["©", "®", "™"]);

// Text emoji mappings from Python implementation
const TEXT_EMOJIS: Record<string, string> = {
  ":D": "😀",
  "=D": "😃",
  ":)": "🙂",
  "=)": "😊",
  ":(": "😞",
  ":P": "😛",
  ":p": "😛",
  "B)": "😎",
  "8)": "😎",
  ":'(": "😢",
  "<3": "❤️",
  ":/": "😕",
  "=/": "😕",
  ":\\": "😕",
  "=\\": "😕",
  ";)": "😉",
  ":*": "😘",
  ">:(": "😠",
  ":|": "😐",
  "O:)": "😇",
  "3:)": "😈",
  ":O": "😮",
  ":o": "😮",
};

// Single regex pattern combining unicode and text emojis
const COMBINED_PATTERN = new RegExp(
  `${EMOJI_REGEX.source}|(?:^|\\s)(${Object.keys(TEXT_EMOJIS)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?=$|\\s)`,
  "g"
);

export function extractEmojis(text: string | undefined): string[] {
  if (!text) return [];

  const matches = text.match(COMBINED_PATTERN);
  if (!matches) return [];

  const emojis: string[] = [];
  for (const match of matches) {
    // Clean up the match from any whitespace
    const cleanMatch = match.trim();

    // If it's a text emoji, convert it
    if (cleanMatch in TEXT_EMOJIS) {
      emojis.push(TEXT_EMOJIS[cleanMatch]);
    }
    // If it's a unicode emoji and not excluded, keep it
    else if (!EXCLUDED_SYMBOLS.has(match) && !match.trim().startsWith(":")) {
      emojis.push(match);
    }
  }

  return emojis;
}
