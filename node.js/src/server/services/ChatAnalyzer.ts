import dfd from "danfojs-node";
import { extractEmojis } from "../utils/emoji";
import type { MessageData, AnalysisResult } from "../types";

export class ChatAnalyzer {
  private data: dfd.DataFrame;
  private messageData: MessageData;
  private platform: "messenger" | "instagram";

  constructor(
    messageData: MessageData,
    platform: "messenger" | "instagram" = "messenger"
  ) {
    this.messageData = messageData;
    this.platform = platform;
    this.data = this.preprocessData(messageData);
  }

  private preprocessData(messageData: MessageData): dfd.DataFrame {
    const messages = messageData.messages || [];

    // Enhance flat structure with more metrics
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

    try {
      return new dfd.DataFrame(flatData);
    } catch (error) {
      console.error("Error creating DataFrame:", error);
      throw error;
    }
  }

  public analyzeMessages(): AnalysisResult {
    const totalMessages = this.data.shape[0];
    const timestamps = this.data.column("timestamp_ms").values as number[];

    // Calculate reactions per participant
    const reactionStats = this.calculateReactionStats();
    const participantReactions = this.calculateParticipantReactions();

    // Enhanced participant analysis
    const participantStats = this.data
      .groupby(["sender_name"])
      .agg({
        timestamp_ms: "count",
        char_count: ["sum", "mean"], // For message length
      })
      .rename({
        timestamp_ms_count: "messageCount",
        char_count_mean: "averageMessageLength",
      });

    return {
      title: this.messageData.title,
      platform: this.platform,
      participants: this.messageData.participants.map((p) => {
        const stats = participantStats.query(
          participantStats["sender_name"].eq(p.name)
        );
        const reactions = participantReactions[p.name] || {
          given: 0,
          received: 0,
        };

        return {
          name: p.name,
          messageCount: stats["messageCount"].values[0] || 0,
          averageMessageLength: stats["averageMessageLength"].values[0] || 0,
          mostUsedEmojis: this.getParticipantEmojiFrequency(p.name),
          reactionsGiven: reactions.given,
          reactionsReceived: reactions.received,
        };
      }),
      totalMessages,
      averageMessagesPerDay: totalMessages / this.getUniqueDays(),
      messagesByDay: this.getMessagesByDay(),
      messagesByHour: this.getMessagesByHour(),
      messagesByMonth: this.getMessagesByMonth(),
      emojiStats: this.calculateEmojiStats(),
      reactionStats,
      files: this.calculateFileStats(),
      dateRange: {
        from: new Date(Math.min(...timestamps)).toISOString().split("T")[0],
        to: new Date(Math.max(...timestamps)).toISOString().split("T")[0],
      },
    };
  }

  // Add this new method for participant reactions
  private calculateParticipantReactions(): Record<
    string,
    { given: number; received: number }
  > {
    const reactions: Record<string, { given: number; received: number }> = {};

    // Initialize counters for all participants
    this.messageData.participants.forEach((p) => {
      reactions[p.name] = { given: 0, received: 0 };
    });

    // Count reactions
    this.messageData.messages.forEach((message) => {
      if (message.reactions) {
        // Count received reactions
        reactions[message.sender_name].received += message.reactions.length;

        // Count given reactions
        message.reactions.forEach((reaction) => {
          if (reactions[reaction.actor]) {
            reactions[reaction.actor].given++;
          }
        });
      }
    });

    return reactions;
  }

  private getUniqueDays(): number {
    const dates = new Set(
      this.data
        .column("timestamp_ms")
        .values.map((ms: number) => new Date(ms).toISOString().split("T")[0])
    );
    return dates.size;
  }

  private getMessagesByMonth() {
    const dfWithMonths = new dfd.DataFrame({
      timestamp_ms: this.data.column("timestamp_ms").values,
      month: this.data.column("month").values,
    });

    const monthly = dfWithMonths
      .groupby(["month"])
      .agg({ timestamp_ms: "count" })
      .rename({ timestamp_ms_count: "count" })
      .sortValues("month");

    return dfd.toJSON(monthly, { format: "row" });
  }

  private getParticipantEmojiFrequency(
    participantName: string,
    topK: number = 10
  ) {
    const participantMessages = this.data
      .query(this.data["sender_name"].eq(participantName))
      .column("content")
      .values.filter((content) => typeof content === "string") as string[];

    const emojiCounts: Record<string, number> = {};
    participantMessages.forEach((content) => {
      const emojis = extractEmojis(content);
      emojis.forEach((emoji) => {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      });
    });

    return Object.entries(emojiCounts)
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topK);
  }

  private getMessagesByDay() {
    const dates = this.data
      .column("timestamp_ms")
      .values.map((ms: number) => new Date(ms).toISOString().split("T")[0]);

    const dfWithDates = new dfd.DataFrame({
      timestamp_ms: this.data.column("timestamp_ms").values,
      date: dates,
    });

    const daily = dfWithDates
      .groupby(["date"])
      .agg({ timestamp_ms: "count" })
      .rename({ timestamp_ms_count: "count" })
      .sortValues("date");

    return dfd.toJSON(daily, { format: "row" });
  }

  private getMessagesByHour() {
    const dfWithHours = new dfd.DataFrame({
      timestamp_ms: this.data.column("timestamp_ms").values,
      hour: this.data
        .column("timestamp_ms")
        .values.map((ms: number) => new Date(ms).getHours()),
    });

    const hourly = dfWithHours
      .groupby(["hour"])
      .agg({ timestamp_ms: "count" })
      .rename({ timestamp_ms_count: "count" })
      .sortValues("hour");

    return dfd.toJSON(hourly, { format: "row" });
  }

  private calculateEmojiStats() {
    const contents = this.data
      .column("content")
      .values.filter((content) => typeof content === "string") as string[];

    const emojiCounts: Record<string, number> = {};

    contents.forEach((content) => {
      const emojis = extractEmojis(content);
      emojis.forEach((emoji) => {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      });
    });

    if (Object.keys(emojiCounts).length === 0) {
      return null;
    }

    return Object.entries(emojiCounts)
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateReactionStats() {
    const reactions = this.messageData.messages.filter(
      (m) => m.reactions && m.reactions.length > 0
    );

    if (reactions.length === 0) {
      return null;
    }

    const total: Record<string, number> = {};
    const given: Record<string, Record<string, number>> = {};
    const received: Record<string, Record<string, number>> = {};

    // Initialize participant records
    this.messageData.participants.forEach((p) => {
      given[p.name] = {};
      received[p.name] = {};
    });

    reactions.forEach((message) => {
      const messageSender = message.sender_name;
      message.reactions!.forEach((reaction) => {
        const emoji = reaction.reaction;
        const actor = reaction.actor;

        // Update total counts
        total[emoji] = (total[emoji] || 0) + 1;

        // Update given counts
        if (!given[actor][emoji]) given[actor][emoji] = 0;
        given[actor][emoji]++;

        // Update received counts
        if (!received[messageSender][emoji]) received[messageSender][emoji] = 0;
        received[messageSender][emoji]++;
      });
    });

    return { total, given, received };
  }

  private calculateFileStats() {
    const photos = this.data.column("has_photo").sum();
    const videos = this.data.column("has_video").sum();
    const files = this.data.column("has_file").sum();

    return {
      total: photos + videos + files,
      photos,
      videos,
      other: files,
    };
  }

  public getWordFrequency(
    minLength: number = 3,
    topK: number = 100
  ): Array<[string, number]> {
    const contents = this.data
      .column("content")
      .values.filter((content) => typeof content === "string") as string[];

    const wordCounts: Record<string, number> = {};
    const stopWords = new Set([
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
    ]);

    contents.forEach((content) => {
      const words = content
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= minLength &&
            !stopWords.has(word) &&
            !word.match(/^\d+$/)
        );

      words.forEach((word) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);
  }

  public getMessageLengthDistribution(): Record<string, number> {
    const lengths = this.data.column("word_count").values as number[];

    const distribution: Record<string, number> = {
      "1-5": 0,
      "6-10": 0,
      "11-20": 0,
      "21-50": 0,
      "51+": 0,
    };

    lengths.forEach((length) => {
      if (length <= 5) distribution["1-5"]++;
      else if (length <= 10) distribution["6-10"]++;
      else if (length <= 20) distribution["11-20"]++;
      else if (length <= 50) distribution["21-50"]++;
      else distribution["51+"]++;
    });

    return distribution;
  }

  public getActiveHours(): Record<string, number> {
    const hours = this.data
      .column("timestamp_ms")
      .values.map((ms: number) => new Date(ms).getHours());

    const hourCounts: Record<string, number> = {};
    hours.forEach((hour) => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return hourCounts;
  }

  public getActiveDays(): Record<string, number> {
    const days = this.data
      .column("timestamp_ms")
      .values.map((ms: number) => new Date(ms).getDay());

    const dayCounts: Record<string, number> = {};
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    days.forEach((day) => {
      const dayName = dayNames[day];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });

    return dayCounts;
  }
}
