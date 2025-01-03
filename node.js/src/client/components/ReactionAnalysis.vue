<template>
  <div class="reaction-analysis">
    <h3>Reactions</h3>

    <!-- Total Reactions -->
    <div class="total-reactions">
      <h4>Most Used Reactions</h4>
      <div class="reaction-grid">
        <div
          v-for="(count, reaction) in topReactions"
          :key="reaction"
          class="reaction-item"
        >
          <span class="reaction">{{ reaction }}</span>
          <span class="count">{{ formatNumber(count) }}</span>
        </div>
      </div>
    </div>

    <!-- Per-participant Reactions -->
    <div class="reactions-by-participant">
      <div
        v-for="(participant, name) in participantStats"
        :key="name"
        class="participant-reactions"
      >
        <h4>{{ name }}</h4>
        <div class="stats-grid">
          <div class="received">
            <h5>Received</h5>
            <div class="reaction-grid">
              <div
                v-for="(count, reaction) in getTopReactions(
                  participant.received,
                  5
                )"
                :key="reaction"
                class="reaction-item"
              >
                <span class="reaction">{{ reaction }}</span>
                <span class="count">{{ formatNumber(count) }}</span>
              </div>
            </div>
          </div>
          <div class="given">
            <h5>Given</h5>
            <div class="reaction-grid">
              <div
                v-for="(count, reaction) in getTopReactions(
                  participant.given,
                  5
                )"
                :key="reaction"
                class="reaction-item"
              >
                <span class="reaction">{{ reaction }}</span>
                <span class="count">{{ formatNumber(count) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ReactionStats } from "../../server/types";

const props = defineProps<{
  reactionData: ReactionStats;
}>();

const topReactions = computed(() =>
  getTopReactions(props.reactionData.total, 10)
);

const participantStats = computed(() => {
  const stats: Record<
    string,
    { received: Record<string, number>; given: Record<string, number> }
  > = {};

  Object.keys(props.reactionData.received).forEach((participant) => {
    stats[participant] = {
      received: props.reactionData.received[participant],
      given: props.reactionData.given[participant] || {},
    };
  });

  return stats;
});

function getTopReactions(
  reactionCounts: Record<string, number>,
  limit: number
) {
  return Object.entries(reactionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .reduce((obj, [reaction, count]) => ({ ...obj, [reaction]: count }), {});
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
</script>

<style scoped>
.reaction-analysis {
  padding: 20px;
}

.reaction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
  gap: 10px;
  margin: 10px 0;
}

.reaction-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reaction {
  font-size: 20px;
}

.count {
  font-size: 12px;
  color: #666;
}

.participant-reactions {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
</style>
