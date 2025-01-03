export interface MessageData {
  title: string;
  participants: Array<{ name: string }>;
  messages: Array<Message>;
}

export interface Message {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  type: string;
  photos?: Array<any>;
  videos?: Array<any>;
  files?: Array<any>;
  reactions?: Array<{
    reaction: string;
    actor: string;
  }>;
}

export interface Participant {
  name: string;
  messageCount: number;
  averageMessageLength: number;
  mostUsedEmojis: Array<EmojiFrequency>;
  reactionsGiven: number;
  reactionsReceived: number;
}

interface EmojiFrequency {
  emoji: string;
  count: number;
}

interface FileStats {
  total: number;
  photos: number;
  videos: number;
  other: number;
}

interface ReactionStats {
  total: Record<string, number>;
  given: Record<string, Record<string, number>>;
  received: Record<string, Record<string, number>>;
}

interface TimeDistribution {
  hour: number;
  count: number;
}

interface DayDistribution {
  date: string;
  count: number;
}

interface MonthDistribution {
  month: number;
  count: number;
}

interface MessageLengthDistribution {
  "1-5": number;
  "6-10": number;
  "11-20": number;
  "21-50": number;
  "51+": number;
}

export interface AnalysisResult {
  title: string;
  platform: "messenger" | "instagram";
  participants: Participant[];
  totalMessages: number;
  averageMessagesPerDay: number;
  messagesByDay: DayDistribution[];
  messagesByHour: TimeDistribution[];
  messagesByMonth: MonthDistribution[];
  emojiStats: Array<EmojiFrequency> | null;
  reactionStats: ReactionStats | null;
  files: FileStats;
  dateRange: {
    from: string;
    to: string;
  };
}
