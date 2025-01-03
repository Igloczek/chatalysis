<template>
  <div class="emoji-analysis">
    <h3>Emoji Usage</h3>

    <!-- Total Emoji Stats -->
    <div class="emoji-total">
      <div class="emoji-grid">
        <div
          v-for="(count, emoji) in topEmojis"
          :key="emoji"
          class="emoji-item"
        >
          <span class="emoji">{{ emoji }}</span>
          <span class="count">{{ formatNumber(count) }}</span>
        </div>
      </div>
    </div>

    <!-- Per-participant Emoji Stats -->
    <div class="emoji-by-participant">
      <div
        v-for="(data, participant) in emojiData.byParticipant"
        :key="participant"
        class="participant-emojis"
      >
        <h4>{{ participant }}</h4>
        <div class="emoji-grid">
          <div
            v-for="(count, emoji) in getTopEmojis(data, 10)"
            :key="emoji"
            class="emoji-item"
          >
            <span class="emoji">{{ emoji }}</span>
            <span class="count">{{ formatNumber(count) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EmojiStats } from "../../server/types";

const props = defineProps<{
  emojiData: EmojiStats;
}>();

const topEmojis = computed(() => getTopEmojis(props.emojiData.total, 15));

function getTopEmojis(emojiCounts: Record<string, number>, limit: number) {
  return Object.entries(emojiCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .reduce((obj, [emoji, count]) => ({ ...obj, [emoji]: count }), {});
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
</script>

<style scoped>
.emoji-analysis {
  padding: 20px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 10px;
  margin: 10px 0;
}

.emoji-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.emoji {
  font-size: 24px;
}

.count {
  font-size: 12px;
  color: #666;
}

.participant-emojis {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}
</style>
