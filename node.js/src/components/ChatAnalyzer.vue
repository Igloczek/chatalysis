<script setup lang="ts">
import { ref } from "vue";
import type { AnalysisResult } from "../server/types";

const file = ref<File | null>(null);
const platform = ref("messenger");
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<AnalysisResult | null>(null);

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    file.value = target.files[0];
  }
}

async function analyze() {
  if (!file.value) {
    error.value = "Please select a file first";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const formData = new FormData();
    formData.append("file", file.value);
    formData.append("platform", platform.value);

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    result.value = data;

    // Emit an event to notify parent components
    emit("analysis-complete", data);
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "An error occurred during analysis";
    console.error("Analysis error:", e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-4xl mx-auto p-4">
    <!-- Input Form -->
    <div class="mb-8 space-y-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <label class="flex-1 relative">
          <input
            type="file"
            accept=".json"
            @change="handleFileUpload"
            :disabled="loading"
            class="hidden"
            ref="fileInput"
          />
          <div
            class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            {{ file ? file.name : "Choose JSON file" }}
          </div>
        </label>

        <select
          v-model="platform"
          :disabled="loading"
          class="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="messenger">Messenger</option>
          <option value="instagram">Instagram</option>
        </select>

        <button
          @click="analyze"
          :disabled="!file || loading"
          class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <span v-if="loading">
            <svg class="inline w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Analyzing...
          </span>
          <span v-else>Analyze Chat</span>
        </button>
      </div>

      <div
        v-if="error"
        class="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/50 dark:text-red-400"
      >
        {{ error }}
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="space-y-8">
      <!-- Basic Info -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold mb-4 dark:text-white">
          {{ result.title }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Total Messages
            </div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.totalMessages }}
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Total Words
            </div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.totalWords }}
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Avg. Length
            </div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.averageLength.toFixed(1) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Participants -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Participants</h3>
        <div class="space-y-2">
          <div
            v-for="participant in result.participants"
            :key="participant.name"
            class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <span class="dark:text-white">{{ participant.name }}</span>
            <span class="text-gray-500 dark:text-gray-400"
              >{{ participant.messageCount }} messages</span
            >
          </div>
        </div>
      </div>

      <!-- Emoji Stats -->
      <div
        v-if="result.emojiStats"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <h3 class="text-lg font-semibold mb-4 dark:text-white">
          Most Used Emojis
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div
            v-for="emoji in result.emojiStats.slice(0, 10)"
            :key="emoji.emoji"
            class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
          >
            <div class="text-2xl mb-1">{{ emoji.emoji }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ emoji.count }}
            </div>
          </div>
        </div>
      </div>

      <!-- File Stats -->
      <div
        v-if="result.files"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Files Shared</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">Photos</div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.files.photos }}
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">Videos</div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.files.videos }}
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Other Files
            </div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.files.other }}
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="text-sm text-gray-500 dark:text-gray-400">Total</div>
            <div class="text-2xl font-bold dark:text-white">
              {{ result.files.total }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-analyzer {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
}

.error {
  color: red;
  margin: 1rem 0;
}

.loading {
  margin: 1rem 0;
  font-style: italic;
}

.results {
  margin-top: 2rem;
}

.chart {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
