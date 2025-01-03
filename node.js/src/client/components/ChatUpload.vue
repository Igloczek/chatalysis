<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Upload Chat Data</h2>
    <form @submit.prevent="handleAnalyze" class="space-y-6">
      <div class="space-y-4">
        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors"
          :class="{ 'border-primary-500': isDragging }"
          @dragenter.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <input
            type="file"
            @change="handleFileChange"
            accept=".json"
            ref="fileInput"
            class="hidden"
            id="file-upload"
            multiple
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

          <!-- File Upload Progress -->
          <div v-if="uploadedFiles.length" class="mt-6 space-y-2">
            <div
              v-for="file in uploadedFiles"
              :key="file.id"
              class="bg-gray-50 rounded px-3 py-2 flex items-center gap-3"
            >
              <!-- Status Icon -->
              <div class="flex-shrink-0">
                <svg
                  v-if="file.status === 'completed'"
                  class="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <svg
                  v-else-if="file.status === 'error'"
                  class="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5 text-blue-500 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>

              <!-- Filename -->
              <span
                class="text-sm text-gray-700 flex-grow flex items-center gap-2"
              >
                <span class="font-medium">{{ file.displayName }}</span>
                <span class="text-gray-400 text-xs truncate">{{
                  file.name
                }}</span>
              </span>

              <!-- Progress or Error -->
              <div class="flex items-center gap-3 w-32">
                <div class="flex-grow">
                  <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all duration-300"
                      :class="{
                        'bg-blue-500': file.status === 'uploading',
                        'bg-green-500': file.status === 'completed',
                        'bg-red-500': file.status === 'error',
                      }"
                      :style="{
                        width:
                          file.status === 'completed'
                            ? '100%'
                            : `${file.progress}%`,
                      }"
                    />
                  </div>
                </div>

                <!-- Remove Button -->
                <button
                  v-if="file.status !== 'uploading'"
                  @click="removeFile(file.id)"
                  class="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <span class="sr-only">Remove</span>
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
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
          :disabled="!canAnalyze || isAnalyzing"
          class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isAnalyzing">Analyzing...</span>
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
import { ref, computed } from "vue";
import type { UploadedFile } from "../types";
import { v4 as uuidv4 } from "uuid";

const uploadedFiles = ref<UploadedFile[]>([]);
const platform = ref("messenger");
const fileInput = ref<HTMLInputElement | null>(null);
const isAnalyzing = ref(false);
const error = ref<string | null>(null);
const isDragging = ref(false);
const fileCounter = ref(1);

const canAnalyze = computed(
  () =>
    uploadedFiles.value.length > 0 &&
    uploadedFiles.value.every((f) => f.status === "completed")
);

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    await uploadFiles(Array.from(input.files));
  }
};

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
    file.name.endsWith(".json")
  );
  await uploadFiles(files);
};

const uploadFiles = async (files: File[]) => {
  for (const file of files) {
    // Check for duplicates
    if (uploadedFiles.value.some((f) => f.name === file.name)) {
      continue;
    }

    const fileData: UploadedFile = {
      id: uuidv4(),
      name: file.name,
      displayName: `Part ${fileCounter.value}`,
      status: "uploading",
      progress: 0,
    };
    uploadedFiles.value.push(fileData);
    fileCounter.value++;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", platform.value);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const index = uploadedFiles.value.findIndex(
            (f) => f.id === fileData.id
          );
          if (index !== -1) {
            uploadedFiles.value[index].progress = Math.round(
              (e.loaded / e.total) * 100
            );
          }
        }
      };

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      const index = uploadedFiles.value.findIndex((f) => f.id === fileData.id);
      if (index !== -1) {
        uploadedFiles.value[index].status = "completed";
        uploadedFiles.value[index].path = (response as any).path;
      }
    } catch (err) {
      const index = uploadedFiles.value.findIndex((f) => f.id === fileData.id);
      if (index !== -1) {
        uploadedFiles.value[index].status = "error";
        uploadedFiles.value[index].error =
          err instanceof Error ? err.message : "Upload failed";
      }
    }
  }
};

const removeFile = (id: string) => {
  const index = uploadedFiles.value.findIndex((f) => f.id === id);
  if (index !== -1) {
    uploadedFiles.value.splice(index, 1);
    // Optionally renumber the remaining files
    uploadedFiles.value.forEach((file, i) => {
      file.displayName = `Part ${i + 1}`;
    });
    fileCounter.value = uploadedFiles.value.length + 1;
  }
};

const handleAnalyze = async () => {
  if (!uploadedFiles.value.length) return;

  isAnalyzing.value = true;
  error.value = null;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: uploadedFiles.value.map((f) => f.path).filter(Boolean),
        platform: platform.value,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { id } = await response.json();
    window.location.href = `/report/${id}`;
  } catch (err) {
    console.error("Analysis failed:", err);
    error.value = err instanceof Error ? err.message : "Analysis failed";
  } finally {
    isAnalyzing.value = false;
  }
};
</script>
