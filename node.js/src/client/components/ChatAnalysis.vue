<template>
  <div v-if="analysis" class="bg-white shadow-xl rounded-lg">
    <!-- Report Header -->
    <div class="px-8 py-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <h1 class="text-3xl font-bold text-gray-900">{{ analysis.title }}</h1>
      <p class="mt-2 text-sm text-gray-500">
        Analysis from {{ analysis.dateRange.from }} to
        {{ analysis.dateRange.to }}
      </p>
    </div>

    <!-- Report Content -->
    <div class="p-8 space-y-8">
      <!-- Overview Section -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-6 rounded-lg">
            <p class="text-sm text-blue-600 uppercase">Total Messages</p>
            <p class="text-3xl font-bold text-blue-900">
              {{ analysis.totalMessages }}
            </p>
          </div>
          <div class="bg-green-50 p-6 rounded-lg">
            <p class="text-sm text-green-600 uppercase">Messages per Day</p>
            <p class="text-3xl font-bold text-green-900">
              {{ Math.round(analysis.averageMessagesPerDay) }}
            </p>
          </div>
          <div class="bg-purple-50 p-6 rounded-lg">
            <p class="text-sm text-purple-600 uppercase">Total Files</p>
            <p class="text-3xl font-bold text-purple-900">
              {{ analysis.files.total }}
            </p>
          </div>
        </div>
      </section>

      <!-- Participants Section -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Participants</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="participant in analysis.participants"
            :key="participant.name"
            class="bg-gray-50 rounded-lg p-6"
          >
            <h3 class="text-xl font-semibold mb-3">{{ participant.name }}</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">Messages</span>
                <span class="font-medium">{{ participant.messageCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Avg. Message Length</span>
                <span class="font-medium"
                  >{{
                    Math.round(participant.averageMessageLength)
                  }}
                  chars</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Reactions</span>
                <span class="font-medium">
                  Given: {{ participant.reactionsGiven }} / Received:
                  {{ participant.reactionsReceived }}
                </span>
              </div>

              <!-- Most Used Emojis -->
              <div v-if="participant.mostUsedEmojis?.length" class="mt-4">
                <p class="text-sm text-gray-600 mb-2">Most Used Emojis</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="emoji in participant.mostUsedEmojis.slice(0, 5)"
                    :key="emoji.emoji"
                    class="text-2xl"
                  >
                    {{ emoji.emoji }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Time Analysis -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Time Analysis</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Messages by Hour -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-medium mb-4">Activity by Hour</h3>
            <div class="space-y-2">
              <div
                v-for="hour in analysis.messagesByHour"
                :key="hour.hour"
                class="flex items-center"
              >
                <span class="w-12 text-gray-600">{{ hour.hour }}:00</span>
                <div class="flex-1 ml-4">
                  <div
                    class="bg-blue-200 rounded-full h-4"
                    :style="`width: ${(hour.count / maxHourlyMessages) * 100}%`"
                  ></div>
                </div>
                <span class="ml-4 text-gray-600">{{ hour.count }}</span>
              </div>
            </div>
          </div>

          <!-- Messages by Month -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-medium mb-4">Activity by Month</h3>
            <div class="space-y-2">
              <div
                v-for="month in analysis.messagesByMonth"
                :key="month.month"
                class="flex items-center"
              >
                <span class="w-24 text-gray-600">{{
                  getMonthName(month.month)
                }}</span>
                <div class="flex-1 ml-4">
                  <div
                    class="bg-green-200 rounded-full h-4"
                    :style="`width: ${
                      (month.count / maxMonthlyMessages) * 100
                    }%`"
                  ></div>
                </div>
                <span class="ml-4 text-gray-600">{{ month.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Files Section -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Files Shared</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-50 p-6 rounded-lg">
            <p class="text-sm text-gray-600">Photos</p>
            <p class="text-2xl font-bold">{{ analysis.files.photos }}</p>
          </div>
          <div class="bg-gray-50 p-6 rounded-lg">
            <p class="text-sm text-gray-600">Videos</p>
            <p class="text-2xl font-bold">{{ analysis.files.videos }}</p>
          </div>
          <div class="bg-gray-50 p-6 rounded-lg">
            <p class="text-sm text-gray-600">Other Files</p>
            <p class="text-2xl font-bold">{{ analysis.files.other }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="text-center py-12">
    <p class="text-gray-600">Loading analysis...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { AnalysisResult } from "../../server/types";

const analysis = ref<AnalysisResult | null>(null);

onMounted(() => {
  const storedAnalysis = localStorage.getItem("chatAnalysis");
  if (storedAnalysis) {
    analysis.value = JSON.parse(storedAnalysis);
  } else {
    // Redirect back to upload if no analysis data is found
    window.location.href = "/";
  }
});

const maxHourlyMessages = computed(() => {
  return Math.max(...props.analysis.messagesByHour.map((h) => h.count));
});

const maxMonthlyMessages = computed(() => {
  return Math.max(...props.analysis.messagesByMonth.map((m) => m.count));
});

const getMonthName = (month: number) => {
  return new Date(2000, month).toLocaleString("default", { month: "long" });
};
</script>
