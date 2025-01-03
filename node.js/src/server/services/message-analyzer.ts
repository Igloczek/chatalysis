import { DataFrame, toJSON, concat } from "danfojs-node";
import { extractEmojis } from "@/server/utils/emoji";

import type { DataFrame as DfDataFrame } from "danfojs-node";
import type { MessageData, AnalysisResult } from "@/server/types";

const CHUNK_SIZE = 1000;

function* chunkArray<T>(array: T[], size: number): Generator<T[], void> {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}

function preprocessData(messages: MessageData["messages"]): DfDataFrame[] {
  const dataFrames: DfDataFrame[] = [];

  for (const chunk of chunkArray(messages, CHUNK_SIZE)) {
    const flatData = chunk.map((m) => ({
      sender_name: m.sender_name,
      timestamp_ms: m.timestamp_ms,
      content: m.content || "",
      type: m.type,
      word_count: (m.content || "").split(/\s+/).filter(Boolean).length,
      char_count: (m.content || "").length,
      emoji_count: extractEmojis(m.content || "").length,
      has_photo: (m.photos?.length || 0) > 0,
      has_video: (m.videos?.length || 0) > 0,
      has_file: (m.files?.length || 0) > 0,
      reaction_count: (m.reactions || []).length,
      hour: new Date(m.timestamp_ms).getHours(),
      day: new Date(m.timestamp_ms).getDay(),
      month: new Date(m.timestamp_ms).getMonth(),
    }));

    dataFrames.push(new DataFrame(flatData));
  }

  return dataFrames;
}

function calculateParticipantReactions(messages: MessageData["messages"]) {
  const reactions: Record<string, { given: number; received: number }> = {};

  for (const chunk of chunkArray(messages, CHUNK_SIZE)) {
    chunk.forEach((message) => {
      if (!reactions[message.sender_name]) {
        reactions[message.sender_name] = { given: 0, received: 0 };
      }

      if (message.reactions) {
        reactions[message.sender_name].received += message.reactions.length;
        message.reactions.forEach((reaction) => {
          if (!reactions[reaction.actor]) {
            reactions[reaction.actor] = { given: 0, received: 0 };
          }
          reactions[reaction.actor].given++;
        });
      }
    });
  }

  return reactions;
}

function calculateFileStats(data: DfDataFrame) {
  const photos = data.column("has_photo").sum();
  const videos = data.column("has_video").sum();
  const files = data.column("has_file").sum();

  return {
    total: photos + videos + files,
    photos,
    videos,
    other: files,
  };
}

function getMessagesByTimeUnit(data: DfDataFrame, unit: "hour" | "month") {
  const dfWithUnit = new DataFrame({
    timestamp_ms: data.column("timestamp_ms").values,
    [unit]: data.column(unit).values,
  });

  const grouped = dfWithUnit
    .groupby([unit])
    .agg({ timestamp_ms: "count" })
    .rename({ timestamp_ms_count: "count" })
    .sortValues(unit);

  return toJSON(grouped, { format: "row" });
}

function mergeDataFrames(dataFrames: DfDataFrame[]): DataFrame | Series {
  if (dataFrames.length === 1) return dataFrames[0];
  return concat({ dfList: dataFrames, axis: 0 });
}

export async function analyzeMessages(
  messageData: MessageData,
  platform: string
): Promise<AnalysisResult> {
  // Process data in chunks
  const dataFrames = preprocessData(messageData.messages);

  // Calculate basic stats from chunks
  let totalMessages = 0;
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  dataFrames.forEach((df) => {
    totalMessages += df.shape[0];
    const timestamps = df.column("timestamp_ms").values as number[];
    minTimestamp = Math.min(minTimestamp, ...timestamps);
    maxTimestamp = Math.max(maxTimestamp, ...timestamps);
  });

  // Merge DataFrames for aggregations
  const mergedData = mergeDataFrames(dataFrames);

  // Calculate participant stats
  const participantStats = mergedData
    .groupby(["sender_name"])
    .agg({
      timestamp_ms: "count",
      char_count: ["sum", "mean"],
    })
    .rename({
      timestamp_ms_count: "messageCount",
      char_count_mean: "averageMessageLength",
    });

  // Calculate time-based stats
  const messagesByHour = getMessagesByTimeUnit(mergedData, "hour");
  const messagesByMonth = getMessagesByTimeUnit(mergedData, "month");

  // Calculate unique days
  const uniqueDays = new Set(
    messageData.messages.map(
      (m) => new Date(m.timestamp_ms).toISOString().split("T")[0]
    )
  ).size;

  const reactionStats = calculateParticipantReactions(messageData.messages);
  const fileStats = calculateFileStats(mergedData);

  return {
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
        reactionsGiven: reactions.given,
        reactionsReceived: reactions.received,
      };
    }),
    totalMessages,
    averageMessagesPerDay: totalMessages / uniqueDays,
    messagesByHour,
    messagesByMonth,
    files: fileStats,
    dateRange: {
      from: new Date(minTimestamp).toISOString().split("T")[0],
      to: new Date(maxTimestamp).toISOString().split("T")[0],
    },
  };
}
