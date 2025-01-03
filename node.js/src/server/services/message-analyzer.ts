import { DataFrame, toJSON } from "danfojs-node";
import { extractEmojis } from "@/server/utils/emoji";

import type { DataFrame as DfDataFrame } from "danfojs-node";
import type { MessageData, AnalysisResult } from "@/server/types";

function preprocessData(messageData: MessageData): DfDataFrame {
  const messages = messageData.messages || [];

  const flatData = messages.map((m) => ({
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

  return new DataFrame(flatData);
}

function calculateParticipantReactions(messageData: MessageData) {
  const reactions: Record<string, { given: number; received: number }> = {};

  messageData.participants.forEach((p) => {
    reactions[p.name] = { given: 0, received: 0 };
  });

  messageData.messages.forEach((message) => {
    if (message.reactions) {
      reactions[message.sender_name].received += message.reactions.length;
      message.reactions.forEach((reaction) => {
        if (reactions[reaction.actor]) {
          reactions[reaction.actor].given++;
        }
      });
    }
  });

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

export function analyzeMessages(
  messageData: MessageData,
  platform: string
): AnalysisResult {
  const data = preprocessData(messageData);
  const totalMessages = data.shape[0];
  const timestamps = data.column("timestamp_ms").values as number[];

  const reactionStats = calculateParticipantReactions(messageData);
  const participantStats = data
    .groupby(["sender_name"])
    .agg({
      timestamp_ms: "count",
      char_count: ["sum", "mean"],
    })
    .rename({
      timestamp_ms_count: "messageCount",
      char_count_mean: "averageMessageLength",
    });

  const uniqueDays = new Set(
    timestamps.map((ms) => new Date(ms).toISOString().split("T")[0])
  ).size;

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
    messagesByHour: getMessagesByTimeUnit(data, "hour"),
    messagesByMonth: getMessagesByTimeUnit(data, "month"),
    files: calculateFileStats(data),
    dateRange: {
      from: new Date(Math.min(...timestamps)).toISOString().split("T")[0],
      to: new Date(Math.max(...timestamps)).toISOString().split("T")[0],
    },
  };
}
