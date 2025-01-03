<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Upload Chat Data</h2>
    <form @submit.prevent="handleUpload" class="space-y-6">
      <div class="space-y-4">
        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors"
        >
          <input
            type="file"
            @change="handleFileChange"
            accept=".json"
            ref="fileInput"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload" class="cursor-pointer">
            <div class="space-y-2">
              <div class="text-primary-600">
                <svg
                  class="mx-auto h-12 w-12"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div class="text-sm text-gray-600">
                <span
                  class="font-medium text-primary-600 hover:text-primary-500"
                >
                  Upload a file
                </span>
                or drag and drop
              </div>
              <p class="text-xs text-gray-500">JSON files only</p>
            </div>
          </label>
          <div v-if="selectedFile" class="mt-4 text-sm text-gray-600">
            Selected: {{ selectedFile.name }}
          </div>
        </div>

        <div class="flex justify-center space-x-6">
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              v-model="platform"
              value="messenger"
              class="text-primary-600 focus:ring-primary-500"
            />
            <span class="text-gray-700">Messenger</span>
          </label>
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              v-model="platform"
              value="instagram"
              class="text-primary-600 focus:ring-primary-500"
            />
            <span class="text-gray-700">Instagram</span>
          </label>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          type="submit"
          :disabled="!selectedFile || isLoading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Analyzing...</span>
          <span v-else>Analyze Chat</span>
        </button>
      </div>
    </form>

    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const selectedFile = ref<File | null>(null);
const platform = ref("messenger");
const fileInput = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  isLoading.value = true;
  const formData = new FormData();
  formData.append("chatFile", selectedFile.value);
  formData.append("platform", platform.value);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { id } = await response.json();
    window.location.href = `/report/${id}`; // Using the dynamic route
  } catch (err) {
    console.error("Upload failed:", err);
    error.value = err instanceof Error ? err.message : "Analysis failed";
  } finally {
    isLoading.value = false;
  }
};
</script>
