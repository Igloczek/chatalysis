import { performance } from "node:perf_hooks";
import PQueue from "p-queue";
import { DataFrame, concat } from "danfojs-node";

import { extractEmojis } from "@/server/utils/emoji";

import type { DataFrame as DfDataFrame } from "danfojs-node";
import type { MessageData, AnalysisResult, Message } from "@/server/types";

const CHUNK_SIZE = 5000; // Increased chunk size for better performance
const PARALLEL_CHUNKS = 4; // Number of chunks to process in parallel

// Pre-allocated arrays for batch processing
const processingQueue = new PQueue({ concurrency: PARALLEL_CHUNKS });

function* chunkArray<T>(array: T[], size: number): Generator<T[], void> {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}

// Single-pass calculations for message stats
function calculateMessageStats(messages: Message[]) {
  const stats = {
    minTimestamp: Infinity,
    maxTimestamp: -Infinity,
    totalMessages: messages.length,
    uniqueDays: new Set<string>(),
    photoCount: 0,
    videoCount: 0,
    fileCount: 0,
    // Add time-based counters
    byHour: new Array(24).fill(0),
    byMonth: new Array(12).fill(0),
  };

  for (const msg of messages) {
    stats.minTimestamp = Math.min(stats.minTimestamp, msg.timestamp_ms);
    stats.maxTimestamp = Math.max(stats.maxTimestamp, msg.timestamp_ms);
    stats.uniqueDays.add(
      new Date(msg.timestamp_ms).toISOString().split("T")[0]
    );

    if (msg.photos?.length) stats.photoCount += msg.photos.length;
    if (msg.videos?.length) stats.videoCount += msg.videos.length;
    if (msg.files?.length) stats.fileCount += msg.files.length;

    // Count messages by hour and month
    const date = new Date(msg.timestamp_ms);
    stats.byHour[date.getHours()]++;
    stats.byMonth[date.getMonth()]++;
  }

  return stats;
}

// Optimized preprocessing using pre-allocated arrays
async function preprocessDataChunk(messages: Message[]): Promise<DfDataFrame> {
  const data = new Array(messages.length);

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const emojis = m.content ? extractEmojis(m.content) : [];

    data[i] = {
      sender_name: m.sender_name,
      timestamp_ms: m.timestamp_ms,
      content: m.content || "",
      type: m.type,
      word_count: m.content ? m.content.split(/\s+/).filter(Boolean).length : 0,
      char_count: m.content?.length || 0,
      emoji_count: emojis.length,
      has_photo: (m.photos?.length || 0) > 0,
      has_video: (m.videos?.length || 0) > 0,
      has_file: (m.files?.length || 0) > 0,
      reaction_count: m.reactions?.length || 0,
    };
  }

  return new DataFrame(data);
}

// Optimized reaction counting using Map
function calculateParticipantReactions(messages: Message[]) {
  const reactions = new Map<string, { given: number; received: number }>();

  for (const message of messages) {
    if (!reactions.has(message.sender_name)) {
      reactions.set(message.sender_name, { given: 0, received: 0 });
    }

    if (message.reactions) {
      const participantStats = reactions.get(message.sender_name)!;
      participantStats.received += message.reactions.length;

      for (const reaction of message.reactions) {
        if (!reactions.has(reaction.actor)) {
          reactions.set(reaction.actor, { given: 0, received: 0 });
        }
        const actorStats = reactions.get(reaction.actor)!;
        actorStats.given++;
      }
    }
  }

  return Object.fromEntries(reactions);
}

// Process emojis in one pass over all messages
function processEmojis(messages: Message[]) {
  const startTime = performance.now();
  let extractionTime = 0;
  let extractionCount = 0;

  const emojiStats = {
    total: 0,
    types: {} as Record<string, number>,
    sent: {} as Record<string, { total: number; [emoji: string]: number }>,
  };

  for (const message of messages) {
    if (!message.content) continue;

    const extractStart = performance.now();
    const emojis = extractEmojis(message.content);
    extractionTime += performance.now() - extractStart;
    extractionCount++;

    if (emojis.length === 0) continue;

    const sender = message.sender_name;
    if (!emojiStats.sent[sender]) {
      emojiStats.sent[sender] = { total: 0 };
    }

    for (const emoji of emojis) {
      emojiStats.total++;
      emojiStats.types[emoji] = (emojiStats.types[emoji] || 0) + 1;
      emojiStats.sent[sender].total++;
      emojiStats.sent[sender][emoji] =
        (emojiStats.sent[sender][emoji] || 0) + 1;
    }
  }

  const totalTime = performance.now() - startTime;
  console.log({
    totalEmojiProcessingTime: `${totalTime.toFixed(2)}ms`,
    averageExtractionTime: `${(extractionTime / extractionCount).toFixed(2)}ms`,
    messagesProcessed: messages.length,
    messagesWithEmojis: extractionCount,
    totalEmojisFound: emojiStats.total,
    uniqueEmojis: Object.keys(emojiStats.types).length,
  });

  return {
    total: Object.entries(emojiStats.types)
      .sort((a, b) => b[1] - a[1])
      .map(([emoji, count]) => ({ emoji, count })),
    byUser: Object.entries(emojiStats.sent).flatMap(([sender_name, counts]) =>
      Object.entries(counts)
        .filter(([key]) => key !== "total")
        .sort((a, b) => b[1] - a[1])
        .map(([emoji, count]) => ({ sender_name, emoji, count }))
    ),
  };
}

export async function analyzeMessages(
  messageData: MessageData,
  platform: string
): Promise<AnalysisResult> {
  const startTime = performance.now();
  console.log("Starting message analysis...");

  // Calculate basic stats in a single pass
  const statsStart = performance.now();
  const messageStats = calculateMessageStats(messageData.messages);
  console.log(
    `Basic stats calculation: ${(performance.now() - statsStart).toFixed(2)}ms`
  );

  // Process data chunks in parallel
  const chunkStart = performance.now();
  const chunks = Array.from(chunkArray(messageData.messages, CHUNK_SIZE));
  const dataFramePromises = chunks.map((chunk) =>
    processingQueue.add(() => preprocessDataChunk(chunk))
  );

  const dataFrames = await Promise.all(dataFramePromises);
  const mergedData = concat({ dfList: dataFrames, axis: 0 });
  console.log(
    `Chunk processing and merging: ${(performance.now() - chunkStart).toFixed(
      2
    )}ms`
  );

  // Parallel processing of independent operations
  const parallelStart = performance.now();
  const [participantStats, reactionStats, emojiStats] = await Promise.all([
    // Calculate participant stats
    mergedData
      .groupby(["sender_name"])
      .agg({
        timestamp_ms: "count",
        char_count: ["sum", "mean"],
        emoji_count: "sum",
      })
      .rename({
        timestamp_ms_count: "messageCount",
        char_count_mean: "averageMessageLength",
        emoji_count_sum: "totalEmojis",
      }),

    // Calculate reactions in parallel
    processingQueue.add(() =>
      calculateParticipantReactions(messageData.messages)
    ),

    // Process emojis directly without DataFrame operations
    processingQueue.add(() => processEmojis(messageData.messages)),
  ]);
  console.log(
    `Parallel stats processing: ${(performance.now() - parallelStart).toFixed(
      2
    )}ms`
  );

  // Time-based distributions
  const timeStart = performance.now();
  const messagesByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    timestamp_ms_count: messageStats.byHour[hour],
  }));

  const messagesByMonth = Array.from({ length: 12 }, (_, month) => ({
    month,
    timestamp_ms_count: messageStats.byMonth[month],
  }));
  console.log(
    `Time-based aggregations: ${(performance.now() - timeStart).toFixed(2)}ms`
  );

  // Final result assembly
  const resultStart = performance.now();
  const result = {
    title: messageData.title,
    platform,
    participants: messageData.participants.map((p) => {
      const stats = participantStats.query(
        participantStats["sender_name"].eq(p.name)
      );
      const reactions = reactionStats[p.name] || { given: 0, received: 0 };

      return {
        name: p.name,
        messageCount: stats["messageCount"].values[0] || 0,
        averageMessageLength: stats["averageMessageLength"].values[0] || 0,
        totalEmojis: stats["totalEmojis"].values[0] || 0,
        reactionsGiven: reactions.given,
        reactionsReceived: reactions.received,
        mostUsedEmojis:
          emojiStats?.byUser
            ?.filter((e) => e.sender_name === p.name)
            ?.slice(0, 5)
            ?.map((e) => ({ emoji: e.emoji, count: e.count })) || [],
      };
    }),
    totalMessages: messageStats.totalMessages,
    averageMessagesPerDay:
      messageStats.totalMessages / messageStats.uniqueDays.size,
    messagesByHour,
    messagesByMonth,
    files: {
      total:
        messageStats.photoCount +
        messageStats.videoCount +
        messageStats.fileCount,
      photos: messageStats.photoCount,
      videos: messageStats.videoCount,
      other: messageStats.fileCount,
    },
    dateRange: {
      from: new Date(messageStats.minTimestamp).toISOString().split("T")[0],
      to: new Date(messageStats.maxTimestamp).toISOString().split("T")[0],
    },
    emojiStats:
      emojiStats?.total?.map((e) => ({
        emoji: e.emoji,
        count: e.count,
      })) || [],
  };
  console.log(
    `Result assembly: ${(performance.now() - resultStart).toFixed(2)}ms`
  );

  const totalTime = performance.now() - startTime;
  console.log(`Total analysis time: ${totalTime.toFixed(2)}ms`);

  return result;
}
